const body = document.body;
const siteHeader = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const contactForm = document.querySelector(".contact-form-card");
const submitButton = contactForm?.querySelector(".submit-button");
const formStatus = contactForm?.querySelector(".form-status");
const yearNode = document.getElementById("year");
const defaultFormspreeEndpoint = "https://formspree.io/f/xlgwyzwb";

const markPageReady = () => {
  document.documentElement.classList.add("is-ready");
};

requestAnimationFrame(() => window.setTimeout(markPageReady, 360));

if (document.readyState === "complete") {
  window.setTimeout(markPageReady, 280);
} else {
  window.addEventListener("load", () => window.setTimeout(markPageReady, 280), { once: true });
}

window.setTimeout(markPageReady, 2400);

const trackAnalyticsEvent = (eventName, eventData = {}) => {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, eventData);
  }

  if (window.umami && typeof window.umami.track === "function") {
    try {
      window.umami.track(eventName, eventData);
    } catch (error) {
      console.warn("Analytics tracking skipped", error);
    }
  }
};

const setHeaderState = () => {
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 18);
};

const setStatus = (message = "", tone = "") => {
  if (!formStatus) {
    return;
  }

  formStatus.textContent = message;
  formStatus.classList.remove("is-success", "is-error");

  if (tone) {
    formStatus.classList.add(`is-${tone}`);
  }
};

const getFormspreeEndpoint = () => contactForm?.getAttribute("action") || contactForm?.dataset.formspreeEndpoint || defaultFormspreeEndpoint;

const closeNav = () => {
  if (!siteNav || !navToggle) {
    return;
  }

  siteNav.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  body.classList.remove("is-nav-open");
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    body.classList.toggle("is-nav-open", isOpen);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
    }
  });
}

if (contactForm && submitButton) {
  const defaultButtonLabel = submitButton.textContent;

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus();

    const formData = new FormData(contactForm);
    formData.append("type", "inquiry");
    formData.append("source", "Homepage Contact Form");
    formData.append("pageUrl", window.location.href);
    formData.append("referrer", document.referrer);

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    try {
      const response = await fetch(getFormspreeEndpoint(), {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = Array.isArray(body?.errors) ? body.errors.map((entry) => entry.message).join(" ") : body?.error;
        throw new Error(detail || "Something went wrong while sending your inquiry.");
      }

      contactForm.reset();
      setStatus(body?.message || "Inquiry sent successfully. We'll get back to you soon.", "success");
      trackAnalyticsEvent("homepage_inquiry_submitted", {
        service: String(formData.get("service") || ""),
        location: window.location.pathname,
      });
      submitButton.textContent = "Inquiry Received";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong while sending your inquiry.";
      setStatus(message, "error");
      submitButton.textContent = defaultButtonLabel;
    } finally {
      window.setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonLabel;
      }, 1800);
    }
  });
}

const PACKAGE_KEY = "gg:package";

const readStoredPackage = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(PACKAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
};

const writeStoredPackage = (slug, label) => {
  try {
    window.sessionStorage.setItem(PACKAGE_KEY, JSON.stringify({ slug, label }));
  } catch (error) {
    /* Storage unavailable. The slug in the URL still carries the package. */
  }
};

const clearStoredPackage = () => {
  try {
    window.sessionStorage.removeItem(PACKAGE_KEY);
  } catch (error) {
    /* No-op. */
  }
};

const humanizeSlug = (slug) =>
  String(slug)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getPackageSlug = (href) => {
  const match = href.match(/[?&]package=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
};

const prefillContactFormFromPackage = () => {
  if (!contactForm) {
    return;
  }

  const slug = getPackageSlug(window.location.search);
  const stored = readStoredPackage();
  const label = (stored && stored.slug === slug && stored.label) || humanizeSlug(slug);

  clearStoredPackage();

  if (!label) {
    return;
  }

  const serviceSelect = contactForm.querySelector("select[name='service']");

  if (serviceSelect) {
    const hasOption = Array.from(serviceSelect.options).some((option) => option.value === label);

    if (!hasOption) {
      const option = document.createElement("option");
      option.value = label;
      option.textContent = label;
      serviceSelect.append(option);
    }

    serviceSelect.value = label;
  }

  const messageField = contactForm.querySelector("textarea[name='message']");

  if (messageField && !messageField.value.trim()) {
    messageField.value = `I'm interested in the ${label} package.\n\n`;
  }
};

prefillContactFormFromPackage();

document.addEventListener("click", (event) => {
  const anchor = event.target instanceof Element ? event.target.closest("a") : null;

  if (!anchor) {
    return;
  }

  const href = anchor.getAttribute("href") || "";
  const label = anchor.textContent?.trim() || "";
  const eventData = {
    href,
    label,
    location: window.location.pathname,
  };

  const packageSlug = getPackageSlug(href);

  if (packageSlug) {
    writeStoredPackage(packageSlug, anchor.dataset.packageName || "");
  }

  if (/wa\.me|whatsapp\.com/i.test(href)) {
    trackAnalyticsEvent("whatsapp_cta_clicked", eventData);
  } else if (href.startsWith("tel:")) {
    trackAnalyticsEvent("phone_cta_clicked", eventData);
  } else if (href.startsWith("mailto:")) {
    trackAnalyticsEvent("email_cta_clicked", eventData);
  }
});
