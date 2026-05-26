const body = document.body;
const siteHeader = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const contactForm = document.querySelector(".contact-form-card");
const submitButton = contactForm?.querySelector(".submit-button");
const formStatus = contactForm?.querySelector(".form-status");
const yearNode = document.getElementById("year");
const defaultFormspreeEndpoint = "https://formspree.io/f/xlgwyzwb";

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
