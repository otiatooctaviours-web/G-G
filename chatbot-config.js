/* Edit the conversation here. No UI code changes needed.
   Numbers marked with {tier: "slug"} are pulled from pricing-data.js at runtime. */

window.GG_CHATBOT = {
  brand: {
    name: "G&G Tech",
    logo: "./assets/g&g tech.dev.jpeg",
    status: "Typically replies in minutes",
  },

  launcher: {
    label: "Chat with G&G Tech",
    tooltip: "Chat with us",
    closeLabel: "Close chat",
    typingDelayMs: 650,
  },

  privacyNote: "We only use this to reply to your enquiry.",

  greeting: "Hi 👋 I'm the G&G Tech assistant. What are you looking to build?",

  /* Shown as tappable chips under the greeting. */
  quickReplies: [
    {
      id: "website",
      label: "Website or landing page",
      reply: "Good. A website is the quickest way to get found and start taking enquiries.",
      route: "brief",
    },
    {
      id: "dashboard",
      label: "Dashboard or internal tool",
      reply: "Good. We'll map the data, the users, and the paperwork it replaces.",
      route: "brief",
    },
    {
      id: "app",
      label: "Mobile or web app",
      reply: "Good. We'll start from the workflow, then shape the screens around it.",
      route: "brief",
    },
    {
      id: "question",
      label: "Just ask a question",
      reply: "Ask away. Pricing, timelines, payment, ownership, hosting — type any of those and I'll answer from our price list.",
      route: "faq",
    },
  ],

  /* Asked one at a time, in this order. */
  questions: [
    {
      id: "businessType",
      label: "Business type",
      prompt: "What kind of business is it?",
      type: "text",
      placeholder: "e.g. retail, school, logistics, clinic",
      validate: (value) =>
        value.trim().length >= 2 ? null : "A word or two is enough so I can route it.",
    },
    {
      id: "goal",
      label: "Goal",
      prompt: "In one line, what should we fix or launch?",
      type: "text",
      placeholder: "e.g. customers can't tell what we sell",
      validate: (value) =>
        value.trim().length >= 5 ? null : "A short sentence is fine — even a few words.",
    },
    {
      id: "budget",
      label: "Budget range",
      prompt: "What rough budget range are you working with?",
      type: "budget",
    },
    {
      id: "start",
      label: "Start",
      prompt: "When would you like to start?",
      type: "choice",
      options: ["As soon as possible", "Within a month", "In 1-3 months", "Just exploring for now"],
    },
    {
      id: "name",
      label: "Name",
      prompt: "And your name?",
      type: "text",
      placeholder: "e.g. Jane Wanjiru",
      validate: (value) => (value.trim().length >= 2 ? null : "Please add your name."),
    },
    {
      id: "phone",
      label: "Phone",
      prompt: "Phone number for WhatsApp?",
      type: "phone",
      placeholder: "07xx, 01xx, or +254...",
    },
  ],

  /* Budget bands. Amounts resolve from tier prices in pricing-data.js. */
  budgetBands: [
    { id: "s", template: "Under {amount}", tierSlug: "business-website" },
    { id: "m", template: "{from} – {to}", fromSlug: "business-website", toSlug: "online-store" },
    { id: "l", template: "{from} – {to}", fromSlug: "online-store", toSlug: "web-app-platform" },
    { id: "xl", template: "{from} and above", fromSlug: "web-app-platform" },
  ],

  /* Keyword FAQs. Answers come from pricing-data.js unless `answer` is set. */
  faqs: [
    {
      id: "pricing",
      keywords: ["pricing", "price", "prices", "cost", "costs", "how much", "kes", "quote", "budget", "package", "packages"],
      answer: (facts) =>
        `Here's our published list. ${facts.priceLine("landing-page")}, ${facts.priceLine("business-website")}, ` +
        `${facts.priceLine("online-store")}. ${facts.priceLine("admin-dashboard")}, ${facts.priceLine("back-office-system")}. ` +
        `${facts.priceLine("web-app-platform")} and up. Every project gets a written, fixed quote before any payment.`,
    },
    {
      id: "timelines",
      keywords: ["timeline", "timelines", "how long", "how fast", "how soon", "deadline", "delivery", "duration", "weeks", "days"],
      answer: (facts) =>
        `Typical delivery times: ${facts.deliveryLine("landing-page")}, ${facts.deliveryLine("business-website")}, ` +
        `${facts.deliveryLine("online-store")}. ${facts.deliveryLine("admin-dashboard")}, ${facts.deliveryLine("back-office-system")}. ` +
        `${facts.deliveryLine("web-app-platform")}, ${facts.deliveryLine("mobile-app-android")}.`,
    },
    {
      id: "payment",
      keywords: ["mpesa", "m-pesa", "payment", "payments", "pay", "installment", "installments", "instalment", "deposit", "stages", "stk"],
      answer: (facts) =>
        `${facts.paymentSummary()} You can pay by M-Pesa, bank, or card. ` +
        `${facts.addOnLine("M-Pesa (STK Push) integration")} ${facts.addOnLine("Monthly care plan")}`,
    },
    {
      id: "ownership",
      keywords: ["own", "ownership", "code", "source", "repo", "repository", "mine", "handover", "rights"],
      fromPricingFaq: true,
    },
    {
      id: "hosting",
      keywords: ["hosting", "host", "domain", "server", "uptime", "billed at cost"],
      fromPricingFaq: true,
    },
    {
      id: "support",
      keywords: ["support", "after launch", "maintenance", "care plan", "updates", "backups", "help later"],
      fromPricingFaq: true,
    },
  ],

  fallbackFaqReply:
    "I don't have that one written down yet. Try asking about pricing, timelines, payment, code ownership, or hosting — or start a short brief and we'll answer properly.",

  /* Kenyan mobile formats: 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX / +2541XXXXXXXX. */
  phonePattern: /^(?:0(?:7|1)\d{8}|\+?254(?:7|1)\d{8})$/,
  phoneNormalize: (value) => value.replace(/[\s()\-.]/g, ""),

  summaryHeading: "Here's what I've got so far:",
  summaryMissing: "Not given",
  whatsappIntro: "Hi G&G Tech, I'd like to talk about a project.",
  summary: (answers, questionList) => {
    const label = (id) => {
      const question = questionList.find((entry) => entry.id === id);
      if (!question) {
        return id;
      }

      return question.label || question.prompt.replace(/\?$/, "");
    };

    return Object.keys(answers)
      .map((id) => `${label(id)}: ${answers[id]}`)
      .join("\n");
  },

  leadCapture: {
    enabled: true,
    endpoint: "https://formspree.io/f/xlgwyzwb",
    sourceLabel: "Website chat widget",
  },

  actions: {
    send: "Send to WhatsApp",
    call: "Request a call",
    restart: "Start over",
    askAnother: "Ask something else",
    close: "Close chat",
  },
};