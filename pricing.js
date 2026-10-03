(() => {
  const data = window.GG_PRICING;

  if (!data) {
    return;
  }

  const currencyFormat = new Intl.NumberFormat(data.currency.locale, {
    maximumFractionDigits: 0,
  });

  const formatCurrency = (amount) => `${data.currency.code} ${currencyFormat.format(amount)}`;

  const formatPrice = (price) => {
    if (!price) {
      return "";
    }

    if (price.custom) {
      return price.label || "Custom quote";
    }

    const base = formatCurrency(price.amount ?? price.from);
    const range = price.to ? `-${currencyFormat.format(price.to)}` : "";

    return `${price.from ? "from " : ""}${base}${range}${price.unit || ""}`;
  };

  const formatTierPrice = (tier) => {
    const price = tier.price || {};

    if (price.custom) {
      return { prefix: "", value: price.label || "Custom quote", suffix: price.suffix || "" };
    }

    const base = formatCurrency(price.amount ?? price.from);
    const range = price.to ? `-${currencyFormat.format(price.to)}` : "";

    return {
      prefix: price.from ? "from" : "",
      value: `${base}${range}`,
      suffix: price.suffix || tier.priceSuffix || "",
    };
  };

  const ICON_CHECK =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" focusable="false">' +
    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.4" opacity="0.55" />' +
    '<path d="M8.2 12.4l2.6 2.6 5-5.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />' +
    "</svg>";

  const ICON_CLOCK =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" focusable="false">' +
    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.4" opacity="0.55" />' +
    '<path d="M12 6.9V12l3.4 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />' +
    "</svg>";

  const create = (tag, className, text) => {
    const node = document.createElement(tag);

    if (className) {
      node.className = className;
    }

    if (text) {
      node.textContent = text;
    }

    return node;
  };

  const createIcon = (className, markup) => {
    const node = create("span", className);
    node.setAttribute("aria-hidden", "true");
    node.innerHTML = markup;

    return node;
  };

  const contactLink = (slug) => `./contact.html?package=${encodeURIComponent(slug)}`;

  const buildPanel = (tier) => {
    const panel = create("div", "pricing-panel");

    if (tier.popular) {
      panel.append(create("p", "pricing-card-badge", tier.badge || "Most popular"));
    }

    panel.append(create("h3", "pricing-tier-name", tier.name));

    const price = formatTierPrice(tier);
    const priceLine = create("p", "pricing-price");

    if (price.prefix) {
      priceLine.append(create("span", "pricing-price-prefix", price.prefix));
    }

    priceLine.append(create("span", "pricing-price-value", price.value));

    if (price.suffix) {
      priceLine.append(create("span", "pricing-price-suffix", price.suffix));
    }

    panel.append(priceLine);
    panel.append(create("p", "pricing-audience", tier.summary));

    const cta = create("a", "button pricing-cta", tier.ctaLabel || "Start this project");
    cta.href = contactLink(tier.slug);
    cta.dataset.packageName = tier.name;
    panel.append(cta);

    return panel;
  };

  const buildIncludes = (tier) => {
    const list = create("ul", "pricing-includes");

    tier.includes.forEach((item) => {
      const entry = create("li");
      entry.append(createIcon("pricing-check", ICON_CHECK));
      entry.append(create("span", null, item));
      list.append(entry);
    });

    return list;
  };

  const buildTierCard = (tier) => {
    const card = create("article", tier.popular ? "pricing-card pricing-card-popular" : "pricing-card");

    card.append(buildPanel(tier));
    card.append(create("p", "pricing-includes-label", tier.includesLabel || "What's included"));

    if (tier.includesFrom) {
      const compare = create("p", "pricing-includes-compare");
      compare.append(document.createTextNode("Everything in "));
      compare.append(create("strong", null, tier.includesFrom));
      compare.append(document.createTextNode(", plus:"));
      card.append(compare);
    }

    card.append(buildIncludes(tier));

    const delivery = create("p", "pricing-delivery");
    delivery.append(createIcon("pricing-delivery-icon", ICON_CLOCK));
    delivery.append(create("span", null, tier.delivery));
    card.append(delivery);

    return card;
  };

  const buildAddOn = (addOn) => {
    const item = create("p", "addon-item");
    item.append(create("strong", null, addOn.name));

    if (addOn.detail) {
      item.append(create("span", "addon-detail", addOn.detail));
    }

    item.append(create("span", "addon-price", formatPrice(addOn.price)));

    if (addOn.note) {
      item.append(create("span", "addon-note", addOn.note));
    }

    return item;
  };

  const buildPaymentStep = (step, index) => {
    const item = create("li", "payment-step");
    item.append(create("span", "payment-step-index", String(index + 1).padStart(2, "0")));
    item.append(create("h3", null, step.title));
    item.append(create("p", null, step.detail));

    return item;
  };

  const buildFaq = (faq, index) => {
    const item = create("details", "faq-item");
    item.name = "gg-pricing-faq";
    item.open = index === 0;

    item.append(create("summary", null, faq.question));
    item.append(create("p", null, faq.answer));

    return item;
  };

  /* Tabbed pricing groups */
  const tabs = [];
  const panels = [];
  let activeIndex = 0;

  const animatePanel = (panel) => {
    panel.classList.remove("is-entering");
    void panel.offsetWidth;
    panel.classList.add("is-entering");
  };

  const selectTab = (index, { focus = false, animate = true } = {}) => {
    tabs.forEach((tab, position) => {
      const isActive = position === index;

      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      panels[position].hidden = !isActive;
    });

    activeIndex = index;

    if (focus) {
      tabs[index].focus();
    }

    if (animate) {
      animatePanel(panels[index]);
    }
  };

  const buildGroupTabs = (groups) => {
    const section = create("section", "pricing-group");
    const container = create("div", "container");

    const tablist = create("div", "pricing-tabs");
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Pricing categories");

    groups.forEach((group, index) => {
      const tab = create("button", "pricing-tab", group.shortLabel || group.eyebrow);

      tab.type = "button";
      tab.id = `pricing-tab-${group.id}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", `pricing-panel-${group.id}`);
      tab.setAttribute("aria-selected", String(index === 0));
      tab.tabIndex = index === 0 ? 0 : -1;
      tab.addEventListener("click", () => selectTab(index));

      tablist.append(tab);
      tabs.push(tab);
    });

    const panelStack = create("div", "pricing-panels");

    groups.forEach((group, index) => {
      const panel = create("div", "pricing-tabpanel");

      panel.id = `pricing-panel-${group.id}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", `pricing-tab-${group.id}`);
      panel.tabIndex = 0;
      panel.hidden = index !== 0;

      const heading = create("div", "section-heading");
      heading.append(create("p", "eyebrow", group.eyebrow));

      const title = create("h2", null, group.heading);
      title.id = `${group.id}-heading`;
      heading.append(title);

      panel.append(heading);

      const grid = create("div", "pricing-grid");
      grid.style.setProperty("--cols", String(Math.min(group.tiers.length, 3)));
      group.tiers.forEach((tier) => grid.append(buildTierCard(tier)));
      panel.append(grid);

      panelStack.append(panel);
      panels.push(panel);
    });

    tablist.addEventListener("keydown", (event) => {
      const lastIndex = tabs.length - 1;
      let next = null;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = activeIndex === lastIndex ? 0 : activeIndex + 1;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = activeIndex === 0 ? lastIndex : activeIndex - 1;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = lastIndex;
      }

      if (next === null) {
        return;
      }

      event.preventDefault();
      selectTab(next, { focus: true });
    });

    container.append(tablist, panelStack);
    section.append(container);

    return section;
  };

  const mount = (selector, nodes) => {
    const root = document.querySelector(selector);

    if (!root) {
      return;
    }

    nodes.forEach((node) => root.append(node));
  };

  mount("#pricing-groups", [buildGroupTabs(data.groups)]);
  mount("#pricing-addons", data.addOns.map(buildAddOn));
  mount("#payment-steps", data.paymentSteps.map(buildPaymentStep));
  mount("#pricing-faq-list", data.faqs.map(buildFaq));

  const paymentNote = document.querySelector("#payment-note");

  if (paymentNote && data.paymentNote) {
    paymentNote.textContent = data.paymentNote;
  }
})();