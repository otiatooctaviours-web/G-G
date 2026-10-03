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

  const contactLink = (slug) => `./contact.html?package=${encodeURIComponent(slug)}`;

  const buildTierCard = (tier) => {
    const card = create("article", tier.popular ? "pricing-card pricing-card-popular" : "pricing-card");

    if (tier.popular) {
      card.append(create("p", "pricing-card-badge", tier.badge || "Most popular"));
    }

    card.append(create("h3", "pricing-tier-name", tier.name));
    card.append(create("p", "pricing-price", formatPrice(tier.price)));
    card.append(create("p", "pricing-audience", tier.summary));

    const inclusions = create("ul");
    tier.includes.forEach((item) => inclusions.append(create("li", null, item)));
    card.append(inclusions);

    const foot = create("div", "pricing-card-foot");

    const delivery = create("p", "pricing-delivery");
    delivery.append(create("span", null, "Delivery"), create("strong", null, tier.delivery));
    foot.append(delivery);

    const cta = create("a", "button button-primary pricing-cta", "Start this project");
    cta.href = contactLink(tier.slug);
    cta.dataset.packageName = tier.name;
    foot.append(cta);

    card.append(foot);

    return card;
  };

  const buildGroup = (group) => {
    const section = create("section", "pricing-group");
    const headingId = `${group.id}-heading`;

    section.setAttribute("aria-labelledby", headingId);

    const heading = create("div", "section-heading");
    heading.append(create("p", "eyebrow", group.eyebrow));

    const title = create("h2", null, group.heading);
    title.id = headingId;
    heading.append(title);

    section.append(heading);

    const grid = create("div", "pricing-grid");
    group.tiers.forEach((tier) => grid.append(buildTierCard(tier)));
    section.append(grid);

    return section;
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

  const mount = (selector, nodes) => {
    const root = document.querySelector(selector);

    if (!root) {
      return;
    }

    nodes.forEach((node) => root.append(node));
  };

  mount("#pricing-groups", data.groups.map(buildGroup));
  mount("#pricing-addons", data.addOns.map(buildAddOn));
  mount("#payment-steps", data.paymentSteps.map(buildPaymentStep));
  mount("#pricing-faq-list", data.faqs.map(buildFaq));

  const paymentNote = document.querySelector("#payment-note");

  if (paymentNote && data.paymentNote) {
    paymentNote.textContent = data.paymentNote;
  }
})();