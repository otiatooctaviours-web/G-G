/* Edit prices, packages, features, and timelines here. No markup changes needed. */

window.GG_PRICING = {
  currency: {
    code: "KES",
    locale: "en-KE",
  },

  groups: [
    {
      id: "websites",
      shortLabel: "Websites & Landing Pages",
      eyebrow: "Websites & Landing Pages",
      heading: "Get online and get found.",
      tiers: [
        {
          name: "Landing Page",
          slug: "landing-page",
          summary: "One page for a service, offer, or campaign.",
          price: { from: 15000 },
          priceSuffix: "per project",
          includes: ["1 page", "Mobile responsive", "Contact form + WhatsApp button", "Basic SEO"],
          delivery: "Live in 3-5 days",
        },
        {
          name: "Business Website",
          slug: "business-website",
          summary: "A full site for a business that needs to be found and contacted.",
          price: { from: 45000 },
          priceSuffix: "per project",
          includes: [
            "Up to 6 pages",
            "Google Business Profile & SEO setup",
            "Contact forms",
            "Simple content editing",
          ],
          includesFrom: "Landing Page",
          delivery: "Live in 7-14 days",
          popular: true,
        },
        {
          name: "Online Store",
          slug: "online-store",
          summary: "Sell products online and take payment by M-Pesa.",
          price: { from: 120000 },
          priceSuffix: "per project",
          includes: ["Product catalog", "Cart", "M-Pesa checkout", "Order management"],
          includesFrom: "Business Website",
          delivery: "Live in 3-4 weeks",
        },
      ],
    },

    {
      id: "dashboards",
      shortLabel: "Dashboards & Tools",
      eyebrow: "Dashboards & Internal Tools",
      heading: "Replace spreadsheets and paperwork.",
      tiers: [
        {
          name: "Admin Dashboard",
          slug: "admin-dashboard",
          summary: "One internal screen for the data your team checks daily.",
          price: { from: 150000 },
          priceSuffix: "per project",
          includes: ["User roles", "Data tables", "Reports and exports", "Notifications"],
          delivery: "Delivered in 3-5 weeks",
        },
        {
          name: "Back-Office System",
          slug: "back-office-system",
          summary: "Staff records, approvals, and stock or payroll in one place.",
          price: { from: 250000 },
          priceSuffix: "per project",
          includes: [
            "Staff records",
            "Approvals",
            "Payroll or inventory flows",
            "Audit trail",
            "Handover and training",
          ],
          includesFrom: "Admin Dashboard",
          delivery: "Delivered in 5-8 weeks",
        },
      ],
    },

    {
      id: "apps",
      shortLabel: "Apps & Platforms",
      eyebrow: "Apps & Platforms",
      heading: "Build a product people use.",
      tiers: [
        {
          name: "Web App / Platform",
          slug: "web-app-platform",
          summary: "A product built around your own workflow.",
          price: { from: 300000 },
          priceSuffix: "per project",
          includes: ["Custom workflows", "User accounts", "Payments", "Admin panel", "Launch support"],
          delivery: "Delivered in 6-10 weeks",
        },
        {
          name: "Mobile App (Android)",
          slug: "mobile-app-android",
          summary: "An Android app with its own backend and admin.",
          price: { from: 350000 },
          priceSuffix: "per project",
          includes: ["Native-feeling Android app", "Backend", "Admin panel", "Play Store publishing"],
          delivery: "Delivered in 8-12 weeks",
        },
        {
          name: "Enterprise / Complex Build",
          slug: "enterprise-build",
          summary: "Multi-system work scoped with you, line by line.",
          price: { custom: true },
          ctaLabel: "Talk to us",
          includes: ["Multi-system integrations", "High-scale platforms", "Multi-tenant platforms"],
          delivery: "Delivery scoped per project",
        },
      ],
    },
  ],

  addOns: [
    {
      name: "Domain & hosting setup",
      price: { amount: 5000 },
      note: "Domain and hosting costs billed at cost.",
    },
    {
      name: "M-Pesa (STK Push) integration",
      price: { from: 25000 },
    },
    {
      name: "WhatsApp / SMS alerts integration",
      price: { from: 15000 },
    },
    {
      name: "Admin training session",
      price: { amount: 5000, unit: " per session" },
    },
    {
      name: "Logo & interface polish",
      price: { from: 8000 },
    },
    {
      name: "Monthly care plan",
      detail: "Updates, backups, and support",
      price: { amount: 3000, to: 10000, unit: "/month" },
    },
  ],

  paymentSteps: [
    {
      title: "50% deposit",
      detail: "To start. Pay by M-Pesa, bank, or card.",
    },
    {
      title: "30% at sign-off",
      detail: "Paid at the design or prototype sign-off.",
    },
    {
      title: "20% on launch",
      detail: "Paid on launch and handover.",
    },
  ],

  paymentNote:
    "Prices are starting points. Final quote depends on features, integrations, and content. You get a written, fixed quote before any payment.",

  faqs: [
    {
      question: "What affects the final price?",
      answer:
        "The number of pages or screens, the integrations you need, and how much content is ready to go in. All three are confirmed in the written quote.",
    },
    {
      question: "How long does a project take?",
      answer:
        "Sites go live in one to two weeks. Dashboards and back-office systems take three to eight weeks. Apps and platforms take six to twelve weeks.",
    },
    {
      question: "Do I own the code and the site?",
      answer: "Yes. The code, the site, and the accounts are yours.",
    },
    {
      question: "What about hosting and domain costs?",
      answer:
        "We set up hosting and your domain, then bill those costs at cost. Nothing is marked up.",
    },
    {
      question: "Do you offer support after launch?",
      answer:
        "Yes. Take a monthly care plan for updates, backups, and support, or ask for support when you need it.",
    },
    {
      question: "Can I pay in installments?",
      answer:
        "Yes. Every project is paid in stages: 50% to start, 30% at sign-off, and 20% on launch.",
    },
  ],
};