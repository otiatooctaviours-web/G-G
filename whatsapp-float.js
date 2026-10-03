/* Floating WhatsApp launcher + scripted G&G Tech chat widget.
   The conversation script lives in chatbot-config.js. Prices come from pricing-data.js. */

(() => {
  if (window.GG_CHAT_WIDGET) {
    return;
  }

  const NUMBER = "254793553860";
  const PACKAGE_KEY = "gg:package";

  /* ---------------------------------------------------------------- assets */

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });

  const ensureScript = (src, globalKey) => {
    if (window[globalKey]) {
      return Promise.resolve();
    }

    return loadScript(src).catch(() => undefined);
  };

  /* ------------------------------------------------------------------ facts */

  const createFacts = (pricing) => {
    const hasPricing = Boolean(pricing && pricing.groups);

    const money = (amount) => {
      if (typeof amount !== "number") {
        return "";
      }

      const code = (pricing && pricing.currency && pricing.currency.code) || "KES";
      const locale = (pricing && pricing.currency && pricing.currency.locale) || "en-KE";
      const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

      return `${code} ${format.format(amount)}`;
    };

    const tiers = hasPricing ? pricing.groups.flatMap((group) => group.tiers) : [];
    const findTier = (slug) => tiers.find((tier) => tier.slug === slug) || null;

    const tierPrice = (slug) => {
      const tier = findTier(slug);
      if (!tier) {
        return "";
      }

      if (tier.price && tier.price.custom) {
        return tier.price.label || "Custom quote";
      }

      const amount = tier.price ? tier.price.amount ?? tier.price.from : null;

      return `${tier.price && tier.price.from ? "from " : ""}${money(amount)}`;
    };

    const tierAmount = (slug) => {
      const tier = findTier(slug);

      if (!tier || !tier.price || tier.price.custom) {
        return "";
      }

      return money(tier.price.amount ?? tier.price.from);
    };

    const addOnPrice = (price) => {
      if (!price) {
        return "";
      }

      if (price.custom) {
        return price.label || "Custom quote";
      }

      const base = money(price.amount ?? price.from);
      const range = price.to ? `-${money(price.to)}` : "";

      return `${price.from ? "from " : ""}${base}${range}${price.unit || ""}`;
    };

    return {
      money,
      tierPrice,
      tierAmount,
      tierName: (slug) => (findTier(slug) || {}).name || slug,
      priceLine: (slug) => `${(findTier(slug) || {}).name || slug} ${tierPrice(slug)}`,
      deliveryLine: (slug) => `${(findTier(slug) || {}).name || slug}: ${((findTier(slug) || {}).delivery || "").toLowerCase()}`,
      addOnPrice,

      addOnLine: (name) => {
        if (!hasPricing) {
          return "";
        }

        const addOn = pricing.addOns.find((entry) => entry.name === name);
        const value = addOn ? addOnPrice(addOn.price) : "";

        return value ? `${addOn.name} is ${value}.` : "";
      },

      paymentSummary: () => {
        if (!hasPricing || !pricing.paymentSteps) {
          return "We split payment into stages rather than asking for everything up front.";
        }

        const stages = pricing.paymentSteps.map((step) => step.title).join(", then ");

        return `Payment is split into ${pricing.paymentSteps.length} stages: ${stages}.`;
      },

      budgetBands: () => {
        const render = (band) => {
          if (band.template.includes("{from}")) {
            return band.template
              .replace("{from}", tierAmount(band.fromSlug))
              .replace("{to}", tierAmount(band.toSlug));
          }

          return band.template.replace("{amount}", tierAmount(band.tierSlug));
        };

        const bands = window.GG_CHATBOT.budgetBands || [];
        const labels = bands.map(render).filter((label) => !label.includes("undefined"));

        return labels.length === bands.length
          ? labels
          : ["Not sure yet", "Under KES 100,000", "KES 100,000 and above"];
      },

      pricingFaq: (keywords) => {
        if (!hasPricing || !pricing.faqs) {
          return "";
        }

        let best = { score: 0, answer: "" };

        pricing.faqs.forEach((entry) => {
          const haystack = entry.question.toLowerCase();
          const score = keywords.filter((word) => haystack.includes(word.toLowerCase())).length;

          if (score > best.score) {
            best = { score, answer: entry.answer };
          }
        });

        return best.score > 0 ? best.answer : "";
      },
    };
  };

  /* ------------------------------------------------------------------- css */

  const STYLE_ID = "gg-chat-styles";

  const CSS = `
.gg-wa-launcher {
  position: fixed;
  right: 24px;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  z-index: 25;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #25d366;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(37, 211, 102, 0.34), 0 4px 12px rgba(4, 10, 20, 0.28);
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.gg-wa-launcher:hover,
.gg-wa-launcher:focus-visible { transform: scale(1.08); }
.gg-wa-launcher:focus-visible { outline: 3px solid #f1cf8d; outline-offset: 3px; }
.gg-wa-launcher::before {
  content: "";
  position: absolute;
  inset: 0;
  border: 2px solid #25d366;
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
  animation: ggChatPulse 3.2s ease-out infinite;
}
.gg-wa-launcher::after {
  content: attr(data-tooltip);
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%) scale(0.94);
  padding: 8px 12px;
  border-radius: 10px;
  background: #0f1f34;
  color: #f7f7f2;
  font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease, transform 180ms ease;
}
.gg-wa-launcher:hover::after,
.gg-wa-launcher:focus-visible::after { opacity: 1; transform: translateY(-50%) scale(1); }
@keyframes ggChatPulse {
  0% { transform: scale(1); opacity: 0.5; }
  70% { transform: scale(1.55); opacity: 0; }
  100% { transform: scale(1.55); opacity: 0; }
}

.gg-chat {
  position: fixed;
  right: 24px;
  bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  z-index: 26;
  display: none;
  flex-direction: column;
  width: 360px;
  max-width: calc(100vw - 32px);
  max-height: 80vh;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  background: linear-gradient(180deg, #0d1c33, #081223);
  color: #f7f7f2;
  box-shadow: 0 30px 80px rgba(4, 10, 20, 0.55);
  overflow: hidden;
}
.gg-chat.is-open { display: flex; }

.gg-chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}
.gg-chat-logo { width: 40px; height: 40px; border-radius: 12px; object-fit: cover; flex: none; }
.gg-chat-heading { flex: 1; min-width: 0; }
.gg-chat-title { font-family: "Plus Jakarta Sans", sans-serif; font-weight: 700; font-size: 0.95rem; }
.gg-chat-status { display: flex; align-items: center; gap: 6px; font-size: 0.74rem; color: #86e3b0; }
.gg-chat-status::before {
  content: "";
  width: 7px; height: 7px;
  border-radius: 999px;
  background: #d8b36a;
  box-shadow: 0 0 0 3px rgba(216, 179, 106, 0.18);
}
.gg-chat-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  border: 0; border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #f7f7f2;
  font-size: 1.25rem; line-height: 1;
  cursor: pointer;
}
.gg-chat-close:hover { background: rgba(255, 255, 255, 0.12); }
.gg-chat-close:focus-visible { outline: 2px solid #f1cf8d; outline-offset: 2px; }

.gg-chat-log {
  flex: 1;
  min-height: 90px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  scrollbar-width: thin;
}
.gg-msg {
  max-width: 88%;
  padding: 10px 13px;
  border-radius: 16px;
  font-size: 0.88rem;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.gg-msg-bot { align-self: flex-start; border: 1px solid rgba(255, 255, 255, 0.1); border-bottom-left-radius: 6px; background: rgba(255, 255, 255, 0.06); }
.gg-msg-user { align-self: flex-end; border-bottom-right-radius: 6px; background: linear-gradient(135deg, #f1cf8d, #d8b36a); color: #1d2834; font-weight: 600; }

.gg-typing { display: inline-flex; gap: 4px; align-items: center; padding: 12px 14px; }
.gg-typing span { width: 6px; height: 6px; border-radius: 999px; background: rgba(247, 247, 242, 0.6); animation: ggChatDot 1.1s ease-in-out infinite; }
.gg-typing span:nth-child(2) { animation-delay: 0.15s; }
.gg-typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes ggChatDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }

.gg-chat-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 12px; }
.gg-chip {
  border: 1px solid rgba(216, 179, 106, 0.42);
  border-radius: 999px;
  padding: 8px 13px;
  background: rgba(216, 179, 106, 0.1);
  color: #f1cf8d;
  font-family: inherit;
  font-size: 0.81rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}
.gg-chip:hover { background: rgba(216, 179, 106, 0.2); }
.gg-chip:focus-visible { outline: 2px solid #f1cf8d; outline-offset: 2px; }

.gg-chat-error { padding: 0 16px 8px; font-size: 0.79rem; color: #ffb3a6; }

.gg-chat-input { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.gg-chat-input input {
  flex: 1;
  min-width: 0;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #f7f7f2;
  font-family: inherit;
  font-size: 0.88rem;
}
.gg-chat-input input::placeholder { color: rgba(247, 247, 242, 0.42); }
.gg-chat-input input:focus-visible { outline: 2px solid #f1cf8d; outline-offset: 1px; }
.gg-chat-send {
  flex: none;
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #f1cf8d, #d8b36a);
  color: #1d2834;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}
.gg-chat-send:hover { background: linear-gradient(135deg, #e6c07a, #c39f52); }
.gg-chat-send:focus-visible { outline: 2px solid #f1cf8d; outline-offset: 2px; }

.gg-chat-summary { display: grid; gap: 8px; padding: 12px 14px; border: 1px solid rgba(216, 179, 106, 0.32); border-radius: 16px; background: rgba(216, 179, 106, 0.08); }
.gg-chat-summary h4 { margin: 0; font-family: inherit; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #f1cf8d; }
.gg-chat-summary pre { margin: 0; font-family: inherit; font-size: 0.83rem; line-height: 1.5; white-space: pre-wrap; color: rgba(247, 247, 242, 0.88); }
.gg-chat-primary, .gg-chat-secondary {
  display: block; width: 100%;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.86rem;
  text-align: center;
  cursor: pointer;
}
.gg-chat-primary { border: 0; background: linear-gradient(135deg, #f1cf8d, #d8b36a); color: #1d2834; }
.gg-chat-primary:hover { background: linear-gradient(135deg, #e6c07a, #c39f52); }
.gg-chat-secondary { border: 1px solid rgba(255, 255, 255, 0.18); background: rgba(255, 255, 255, 0.06); color: #f7f7f2; }
.gg-chat-secondary:hover { background: rgba(255, 255, 255, 0.12); }
.gg-chat-primary:focus-visible, .gg-chat-secondary:focus-visible { outline: 2px solid #f1cf8d; outline-offset: 2px; }

.gg-chat-footer { display: grid; gap: 6px; padding: 10px 16px 14px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.gg-chat-privacy { font-size: 0.72rem; line-height: 1.4; color: rgba(247, 247, 242, 0.55); }
.gg-chat-human { font-size: 0.81rem; font-weight: 700; color: #f1cf8d; text-decoration: underline; text-underline-offset: 3px; }
.gg-chat-human:focus-visible { outline: 2px solid #f1cf8d; outline-offset: 2px; }

@media (hover: hover) and (min-width: 821px) {
  .gg-wa-launcher::after { content: attr(data-tooltip); }
}
@media (max-width: 820px) {
  .gg-wa-launcher::after { content: none; }
  .site-footer { padding-bottom: 100px; }
}
@media (max-width: 560px) {
  .gg-wa-launcher { width: 52px; height: 52px; }
  .gg-wa-launcher svg { width: 27px; height: 27px; }
  .gg-chat {
    left: 0;
    right: 0;
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    width: auto;
    max-width: none;
    max-height: 78vh;
    border-radius: 24px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .gg-wa-launcher::before { animation: none; opacity: 0; }
  .gg-typing span { animation: none; opacity: 0.7; }
  .gg-wa-launcher,
  .gg-wa-launcher:hover,
  .gg-wa-launcher:focus-visible,
  .gg-wa-launcher::after { transform: none; transition: none; }
}
`;

  /* ------------------------------------------------------------------- dom */

  const GLYPH =
    '<svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<path d="M16.04 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.59 4.46 1.72 6.4L3.2 28.8l6.55-1.71a12.8 12.8 0 0 0 6.29 1.6h.01c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.33-6.63-3.74-9.04a12.74 12.74 0 0 0-9.07-3.65Zm0 23.33h-.01a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.89 1.02 1.04-3.8-.25-.39a10.4 10.4 0 1 1 8.79 4.85Zm5.71-7.79c-.31-.16-1.84-.91-2.13-1.01-.28-.1-.49-.16-.7.16-.2.31-.8 1-.98 1.21-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.55.15-.18.2-.31.3-.52.1-.2.05-.39-.03-.55-.08-.15-.7-1.69-.96-2.31-.25-.6-.5-.52-.69-.53h-.59c-.2 0-.52.08-.79.39-.27.31-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.09 3.2 5.07 4.48.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.21-.58-.36Z" />' +
    "</svg>";

  const el = (tag, className, text) => {
    const node = document.createElement(tag);

    if (className) {
      node.className = className;
    }

    if (text) {
      node.textContent = text;
    }

    return node;
  };

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = el("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.append(style);
  };

  /* ------------------------------------------------------------------ state */

  const state = {
    open: false,
    route: null,
    questionIndex: 0,
    answers: {},
    leadSent: false,
    config: null,
    facts: null,
  };

  const nodes = {};

  /* --------------------------------------------------------------- helpers */

  const waLink = (message) => `https://wa.me/${NUMBER}?text=${encodeURIComponent(message)}`;

  const packageName = () => {
    const match = window.location.search.match(/[?&]package=([^&#]+)/);

    if (!match) {
      return "";
    }

    const slug = decodeURIComponent(match[1]);

    try {
      const stored = JSON.parse(window.sessionStorage.getItem(PACKAGE_KEY) || "null");

      if (stored && stored.slug === slug && stored.label) {
        return stored.label;
      }
    } catch (error) {
      /* Storage unavailable. Fall back to the slug. */
    }

    return slug
      .split("-")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const currentQuestion = () => state.config.questions[state.questionIndex] || null;

  /* Longest matching keywords win, so "hosting costs" beats a generic "costs" hit. */
  const matchFaq = (text, faqs) => {
    const haystack = text.toLowerCase();
    let best = { score: 0, entry: null };

    faqs.forEach((entry) => {
      const score = entry.keywords.reduce(
        (total, keyword) => (haystack.includes(keyword.toLowerCase()) ? total + keyword.length : total),
        0,
      );

      if (score > best.score) {
        best = { score, entry };
      }
    });

    return best.entry;
  };

  /* ---------------------------------------------------------------- render */

  const scrollLog = () => {
    nodes.log.scrollTop = nodes.log.scrollHeight;
  };

  const addMessage = (role, text) => {
    const bubble = el("p", `gg-msg gg-msg-${role}`, text);
    nodes.log.append(bubble);
    scrollLog();

    return bubble;
  };

  const showTyping = () => {
    const holder = el("div", "gg-msg gg-msg-bot");
    const dots = el("div", "gg-typing");

    dots.append(el("span"), el("span"), el("span"));
    holder.append(dots);
    nodes.log.append(holder);
    scrollLog();

    return holder;
  };

  const botSays = (text, delay) => {
    const wait = state.config.launcher.typingDelayMs;
    const hold = delay === undefined ? wait : delay;

    return new Promise((resolve) => {
      const typing = showTyping();

      window.setTimeout(() => {
        typing.remove();
        addMessage("bot", text);
        resolve();
      }, hold);
    });
  };

  const clearInteractive = () => {
    nodes.chips.replaceChildren();
    nodes.error.textContent = "";

    if (nodes.inputRow) {
      nodes.inputRow.remove();
      nodes.inputRow = null;
      nodes.input = null;
    }

    if (nodes.summary) {
      nodes.summary.remove();
      nodes.summary = null;
    }
  };

  const showChips = (options, onPick) => {
    clearInteractive();

    options.forEach((option) => {
      const chip = el("button", "gg-chip", typeof option === "string" ? option : option.label);
      chip.type = "button";
      chip.addEventListener("click", () => onPick(option));
      nodes.chips.append(chip);
    });
  };

  const showInput = (question) => {
    clearInteractive();

    const row = el("div", "gg-chat-input");
    const field = el("input");
    field.type = question.type === "phone" ? "tel" : "text";
    field.placeholder = question.placeholder || "";
    field.setAttribute("aria-label", question.prompt);
    field.autocomplete = question.type === "phone" ? "tel" : "off";

    const send = el("button", "gg-chat-send", "Send");
    send.type = "button";

    const submit = () => {
      const value = field.value.trim();

      if (!value) {
        nodes.error.textContent = question.type === "phone" ? "Please add a phone number." : "Please add an answer.";
        field.focus();
        return;
      }

      const problem = validate(question, value);

      if (problem) {
        nodes.error.textContent = problem;
        field.focus();
        return;
      }

      addMessage("user", value);
      field.value = "";
      nodes.error.textContent = "";

      /* Ad-hoc text box in FAQ mode asks a question instead of advancing the brief. */
      if (state.route === "faq" && !question.id) {
        clearInteractive();
        answerFaq(value);
        return;
      }

      if (question.id) {
        state.answers[question.id] = value;
      }

      state.questionIndex += 1;
      advance();
    };

    send.addEventListener("click", submit);
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    });

    row.append(field, send);
    nodes.chips.append(row);
    nodes.inputRow = row;
    nodes.input = field;

    window.setTimeout(() => field.focus(), 60);
  };

  const validate = (question, value) => {
    if (typeof question.validate === "function") {
      return question.validate(value);
    }

    if (question.type === "phone") {
      const normalized = state.config.phoneNormalize(value);

      return state.config.phonePattern.test(normalized) ? null : "Use a Kenyan number: 07xx, 01xx, or +254...";
    }

    return null;
  };

  const buildSummaryText = () => {
    const { summary, summaryMissing, questions } = state.config;
    const filled = {};

    questions.forEach((question) => {
      if (state.answers[question.id]) {
        filled[question.id] = state.answers[question.id];
      }
    });

    const body = summary(filled, questions) || summaryMissing;

    return `${state.config.whatsappIntro}\n\n${body}`;
  };

  const showSummary = () => {
    clearInteractive();

    const box = el("div", "gg-chat-summary");
    box.append(el("h4", null, state.config.summaryHeading));
    box.append(el("pre", null, buildSummaryText()));

    const send = el("button", "gg-chat-primary", state.config.actions.send);
    send.type = "button";
    send.addEventListener("click", () => {
      window.open(waLink(buildSummaryText()), "_blank", "noopener,noreferrer");
    });

    const call = el("button", "gg-chat-secondary", state.config.actions.call);
    call.type = "button";
    call.addEventListener("click", () => {
      window.location.href = "tel:+254793553860";
    });

    const restart = el("button", "gg-chat-secondary", state.config.actions.restart);
    restart.type = "button";
    restart.addEventListener("click", () => {
      reset();
      greet();
    });

    box.append(send, call, restart);
    nodes.chips.append(box);
    nodes.summary = box;

    captureLead();
  };

  /* ------------------------------------------------------------------ lead */

  const captureLead = () => {
    const capture = state.config.leadCapture;

    if (!capture || !capture.enabled || !capture.endpoint || state.leadSent) {
      return;
    }

    state.leadSent = true;

    const payload = {
      type: "chat_lead",
      source: capture.sourceLabel,
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
      conversation: state.config.summary(state.answers, state.config.questions),
    };

    Object.keys(state.answers).forEach((id) => {
      payload[id] = state.answers[id];
    });

    fetch(capture.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      state.leadSent = false;
    });
  };

  /* ------------------------------------------------------------------ flow */

  const reset = () => {
    state.route = null;
    state.questionIndex = 0;
    state.answers = {};
    state.leadSent = false;
    clearInteractive();
  };

  const greet = () => {
    clearInteractive();
    botSays(state.config.greeting).then(() => {
      showChips(
        state.config.quickReplies.map((reply) => reply.label),
        (label) => {
          const chosen = state.config.quickReplies.find((reply) => reply.label === label);
          handleQuickReply(chosen);
        },
      );
    });
  };

  const handleQuickReply = (reply) => {
    if (!reply) {
      return;
    }

    clearInteractive();
    addMessage("user", reply.label);
    botSays(reply.reply).then(() => {
      if (reply.route === "brief") {
        startBrief();
      } else {
        offerFaq();
      }
    });
  };

  const startBrief = () => {
    state.route = "brief";
    state.questionIndex = 0;
    askQuestion();
  };

  const askQuestion = () => {
    const question = currentQuestion();

    if (!question) {
      botSays("That's everything I need.").then(showSummary);
      return;
    }

    botSays(question.prompt).then(() => {
      if (question.type === "choice" || question.type === "budget") {
        const options = question.type === "budget" ? state.facts.budgetBands() : question.options;
        showChips(options, (option) => {
          clearInteractive();
          addMessage("user", option);
          state.answers[question.id] = option;
          state.questionIndex += 1;
          askQuestion();
        });
        return;
      }
      showInput(question);
    });
  };

  const advance = () => {
    if (state.route === "faq") {
      offerFaq();
      return;
    }

    askQuestion();
  };

  const offerFaq = () => {
    state.route = "faq";

    showChips(
      [state.config.actions.askAnother, "Start a project brief", state.config.actions.restart].map(
        (label, index) => ({ label, index }),
      ),
      (option) => {
        clearInteractive();

        if (option.index === 0) {
          botSays("Go ahead — type your question.").then(() => showInput({ type: "text", prompt: "Your question", placeholder: "e.g. how much for a website?" }));
          return;
        }

        if (option.index === 1) {
          botSays("Let's do the short brief.").then(startBrief);
          return;
        }

        reset();
        greet();
      },
    );
  };

  const answerFaq = (text) => {
    const match = matchFaq(text, state.config.faqs);

    if (!match) {
      botSays(state.config.fallbackFaqReply).then(offerFaq);
      return;
    }

    const answer = match.fromPricingFaq
      ? state.facts.pricingFaq(match.keywords)
      : typeof match.answer === "function"
        ? match.answer(state.facts)
        : match.answer;

    botSays(answer || state.config.fallbackFaqReply).then(offerFaq);
  };

  /* ------------------------------------------------------------------ ui */

  const buildPanel = () => {
    const panel = el("section", "gg-chat");
    panel.id = "gg-chat-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "gg-chat-title");
    panel.hidden = true;

    const header = el("header", "gg-chat-header");

    const logo = document.createElement("img");
    logo.className = "gg-chat-logo";
    logo.src = state.config.brand.logo;
    logo.alt = "";
    logo.width = 40;
    logo.height = 40;

    const heading = el("div", "gg-chat-heading");
    const title = el("p", "gg-chat-title", state.config.brand.name);
    title.id = "gg-chat-title";
    heading.append(title, el("p", "gg-chat-status", state.config.brand.status));

    const close = el("button", "gg-chat-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", state.config.launcher.closeLabel);
    close.addEventListener("click", closePanel);

    header.append(logo, heading, close);

    const log = el("div", "gg-chat-log");
    log.id = "gg-chat-log";
    log.setAttribute("role", "log");
    log.setAttribute("aria-live", "polite");
    log.setAttribute("aria-relevant", "additions");
    log.setAttribute("aria-label", "Conversation");

    const chips = el("div", "gg-chat-chips");
    const error = el("p", "gg-chat-error");
    error.setAttribute("role", "alert");

    const footer = el("div", "gg-chat-footer");
    footer.append(el("p", "gg-chat-privacy", state.config.privacyNote));

    const human = el("a", "gg-chat-human", state.config.actions.human);
    human.href = waLink(chatFallbackMessage());
    human.target = "_blank";
    human.rel = "noopener noreferrer";
    footer.append(human);

    panel.append(header, log, chips, error, footer);

    nodes.panel = panel;
    nodes.log = log;
    nodes.chips = chips;
    nodes.error = error;
    nodes.close = close;
  };

  const chatFallbackMessage = () => {
    const name = packageName();

    return name
      ? `${state.config.whatsappIntro}\n\nI'd like to talk about the ${name} package.`
      : state.config.whatsappIntro;
  };

  const buildLauncher = () => {
    const button = el("button", "gg-wa-launcher");
    button.type = "button";
    button.setAttribute("aria-label", state.config.launcher.label);
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "gg-chat-panel");
    button.dataset.tooltip = state.config.launcher.tooltip;
    button.innerHTML = GLYPH;
    button.addEventListener("click", () => {
      if (state.open) {
        closePanel();
      } else {
        openPanel();
      }
    });

    nodes.launcher = button;
  };

  const openPanel = () => {
    if (state.open) {
      return;
    }

    state.open = true;
    nodes.panel.hidden = false;
    nodes.panel.classList.add("is-open");
    nodes.launcher.setAttribute("aria-expanded", "true");
    nodes.launcher.setAttribute("aria-label", state.config.actions.close);

    if (!nodes.log.childElementCount) {
      greet();
    }

    nodes.close.focus();
  };

  const closePanel = () => {
    if (!state.open) {
      return;
    }

    state.open = false;
    nodes.panel.hidden = true;
    nodes.panel.classList.remove("is-open");
    nodes.launcher.setAttribute("aria-expanded", "false");
    nodes.launcher.setAttribute("aria-label", state.config.launcher.label);
    nodes.launcher.focus();
  };

  const onKeydown = (event) => {
    if (event.key === "Escape" && state.open) {
      event.preventDefault();
      closePanel();
    }
  };

  /* ----------------------------------------------------------------- boot */

  const boot = async () => {
    await ensureScript("./chatbot-config.js", "GG_CHATBOT");
    await ensureScript("./pricing-data.js", "GG_PRICING");

    if (!window.GG_CHATBOT) {
      return;
    }

    state.config = window.GG_CHATBOT;
    state.config.actions = state.config.actions || {};
    state.config.actions.human = state.config.actions.human || "Talk to a human on WhatsApp";
    state.facts = createFacts(window.GG_PRICING);

    injectStyles();
    buildPanel();
    buildLauncher();

    document.body.append(nodes.panel, nodes.launcher);
    document.addEventListener("keydown", onKeydown);

    window.GG_CHAT_WIDGET = {
      open: openPanel,
      close: closePanel,
      state,
      reset,
    };
  };

  if (document.body) {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  }
})();