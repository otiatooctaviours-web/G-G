const body = document.body;
const navbar = document.querySelector(".navbar");
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const dropdowns = Array.from(document.querySelectorAll(".has-dropdown"));
const revealItems = document.querySelectorAll("[data-reveal]");
const counters = document.querySelectorAll("[data-counter]");
const tiltCards = document.querySelectorAll(".tilt-card");
const testimonialSlides = Array.from(document.querySelectorAll(".testimonial-slide"));
const dots = Array.from(document.querySelectorAll(".dot"));
const controlButtons = document.querySelectorAll(".testimonial-button");
const contactForm = document.querySelector(".contact-form");
const inquiryTrigger = document.querySelector("[data-open-inquiry]");
const inquiryModal = document.querySelector("[data-inquiry-modal]");
const inquiryDialog = inquiryModal?.querySelector(".inquiry-dialog");
const ambientNodes = document.querySelectorAll(".ambient");
const consultationTrigger = document.querySelector("[data-open-consultation]");
const consultationModal = document.querySelector("[data-consultation-modal]");
const consultationDialog = consultationModal?.querySelector(".consultation-dialog");
const consultationCopy = consultationModal?.querySelector("[data-consultation-copy]");
const consultationCalendarStep = consultationModal?.querySelector('[data-consultation-step="calendar"]');
const consultationTimeStep = consultationModal?.querySelector('[data-consultation-step="time"]');
const consultationResultStep = consultationModal?.querySelector('[data-consultation-step="result"]');
const calendarGrid = consultationModal?.querySelector("[data-calendar-grid]");
const calendarLabel = consultationModal?.querySelector("[data-calendar-label]");
const calendarPrevButton = consultationModal?.querySelector('[data-calendar-nav="prev"]');
const calendarNextButton = consultationModal?.querySelector('[data-calendar-nav="next"]');
const consultationBackButton = consultationModal?.querySelector("[data-consultation-back]");
const consultationSelectedDate = consultationModal?.querySelector("[data-selected-date]");
const timeSlotList = consultationModal?.querySelector("[data-time-slot-list]");
const consultationStatus = consultationModal?.querySelector("[data-consultation-status]");
const consultationResetButton = consultationModal?.querySelector("[data-reset-consultation]");
const consultationRequestForm = document.querySelector(".consultation-request");
const consultationNameInput = consultationModal?.querySelector("[data-consultation-name]");
const consultationContactInput = consultationModal?.querySelector("[data-consultation-contact]");
const consultationTrapInput = consultationModal?.querySelector("[data-consultation-trap]");
const emailLinks = document.querySelectorAll("[data-email-link]");

let activeIndex = 0;
let testimonialIntervalId;
let consultationCloseTimeoutId;
let consultationMonth = new Date();
let consultationDate = null;

const trackAnalyticsEvent = (eventName, eventData = {}) => {
  if (!window.umami || typeof window.umami.track !== "function") {
    return;
  }

  try {
    window.umami.track(eventName, eventData);
  } catch (error) {
    console.warn("Analytics tracking skipped", error);
  }
};

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const appointmentFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

emailLinks.forEach((link) => {
  const user = link.getAttribute("data-email-user");
  const domain = link.getAttribute("data-email-domain");
  const tld = link.getAttribute("data-email-tld");

  if (!user || !domain || !tld) {
    return;
  }

  const address = `${user}@${domain}.${tld}`;
  link.setAttribute("href", `mailto:${address}`);
  const label = link.querySelector("[data-email-label]");
  if (label) {
    label.textContent = address;
  }
});

const setNavbarState = () => {
  navbar?.classList.toggle("is-scrolled", window.scrollY > 18);
};

setNavbarState();
window.addEventListener("scroll", setNavbarState, { passive: true });

if (navToggle && navMenu) {
  const syncNavOpenState = (isOpen) => {
    body.classList.toggle("is-nav-open", isOpen);
    navbar?.classList.toggle("is-menu-open", isOpen);
  };

  const closeNavMenu = () => {
    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    syncNavOpenState(false);
    dropdowns.forEach((dd) => {
      dd.classList.remove("is-open");
      const t = dd.querySelector(".dropdown-trigger");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  };

  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    syncNavOpenState(isOpen);

    if (!isOpen) {
      dropdowns.forEach((dd) => {
        dd.classList.remove("is-open");
        const t = dd.querySelector(".dropdown-trigger");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (
      navMenu.classList.contains("is-open") &&
      target instanceof Node &&
      !navMenu.contains(target) &&
      !navToggle.contains(target)
    ) {
      closeNavMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNavMenu();
    }
  });
}
if (dropdowns.length > 0) {
  dropdowns.forEach((dd) => {
    const trigger = dd.querySelector(".dropdown-trigger");
    if (!trigger) return;

    const toggle = (force) => {
      const nextState = typeof force === "boolean" ? force : !dd.classList.contains("is-open");
      // close others
      dropdowns.forEach((other) => {
        if (other !== dd) {
          other.classList.remove("is-open");
          const ot = other.querySelector(".dropdown-trigger");
          if (ot) ot.setAttribute("aria-expanded", "false");
        }
      });

      dd.classList.toggle("is-open", nextState);
      trigger.setAttribute("aria-expanded", String(nextState));
    };

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
  });

  document.addEventListener("click", (event) => {
    if (!dropdowns.some((dd) => dd.contains(event.target))) {
      dropdowns.forEach((dd) => {
        dd.classList.remove("is-open");
        const t = dd.querySelector(".dropdown-trigger");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      dropdowns.forEach((dd) => {
        dd.classList.remove("is-open");
        const t = dd.querySelector(".dropdown-trigger");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }
  });
}

document.querySelectorAll(".nav-links a, .dropdown a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    body.classList.remove("is-nav-open");
    navbar?.classList.remove("is-menu-open");
    dropdowns.forEach((dd) => {
      dd.classList.remove("is-open");
      const t = dd.querySelector(".dropdown-trigger");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => revealObserver.observe(item));

const animateCounter = (counter) => {
  const rawValue = counter.dataset.counter ?? "0";
  const value = Number(rawValue);
  const hasDecimal = rawValue.includes(".");
  const duration = 1600;
  const start = performance.now();

  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = value * eased;

    counter.textContent = hasDecimal ? current.toFixed(1) : `${Math.round(current)}+`;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      counter.textContent = hasDecimal ? value.toFixed(1) : `${Math.round(value)}+`;
    }
  };

  requestAnimationFrame(step);
};

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

counters.forEach((counter) => counterObserver.observe(counter));

tiltCards.forEach((card) => {
  card.addEventListener("mousemove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateX = ((y / rect.height) - 0.5) * -8;
    const rotateY = ((x / rect.width) - 0.5) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
  });
});

const updateTestimonials = (index) => {
  activeIndex = (index + testimonialSlides.length) % testimonialSlides.length;

  testimonialSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === activeIndex);
  });

  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === activeIndex);
  });
};

const startTestimonials = () => {
  testimonialIntervalId = window.setInterval(() => {
    updateTestimonials(activeIndex + 1);
  }, 5000);
};

const resetTestimonials = () => {
  window.clearInterval(testimonialIntervalId);
  startTestimonials();
};

dots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    updateTestimonials(index);
    resetTestimonials();
  });
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.dataset.direction === "next" ? 1 : -1;
    updateTestimonials(activeIndex + direction);
    resetTestimonials();
  });
});

if (testimonialSlides.length > 0) {
  updateTestimonials(0);
  startTestimonials();
}

window.addEventListener(
  "mousemove",
  (event) => {
    const offsetX = (event.clientX / window.innerWidth) - 0.5;
    const offsetY = (event.clientY / window.innerHeight) - 0.5;

    ambientNodes.forEach((node, index) => {
      const depth = (index + 1) * 10;
      node.style.transform = `translate(${offsetX * depth}px, ${offsetY * depth}px)`;
    });
  },
  { passive: true }
);

window.addEventListener(
  "scroll",
  () => {
    const scrolled = window.scrollY * 0.04;
    ambientNodes.forEach((node, index) => {
      node.style.marginTop = `${scrolled * (index + 1)}px`;
    });
  },
  { passive: true }
);

const today = new Date();
const todayFloor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
consultationMonth = new Date(todayFloor.getFullYear(), todayFloor.getMonth(), 1);

const setStatusMessage = (node, message = "", tone) => {
  if (!node) {
    return;
  }

  node.textContent = message;
  node.classList.remove("is-success", "is-error");

  if (tone) {
    node.classList.add(`is-${tone}`);
  }
};

const formatDateValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const isSameDay = (firstDate, secondDate) =>
  Boolean(firstDate) &&
  Boolean(secondDate) &&
  firstDate.getFullYear() === secondDate.getFullYear() &&
  firstDate.getMonth() === secondDate.getMonth() &&
  firstDate.getDate() === secondDate.getDate();

const getMonthIndex = (date) => date.getFullYear() * 12 + date.getMonth();

const formatHour = (hour) => `${String(hour).padStart(2, "0")}:00`;
const buildTimeRange = (hour) => `${formatHour(hour)} - ${formatHour((hour + 1) % 24)}`;
const isEmailContact = (value) => /\S+@\S+\.\S+/.test(value);
const submitLeadRequest = async (payload) => {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...payload,
      pageUrl: window.location.href,
      referrer: document.referrer,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "We couldn't send your request right now. Please try again.");
  }

  return data;
};

const setConsultationStep = (stepName) => {
  if (!consultationCalendarStep || !consultationTimeStep || !consultationResultStep || !consultationCopy) {
    return;
  }

  consultationCalendarStep.hidden = stepName !== "calendar";
  consultationTimeStep.hidden = stepName !== "time";
  consultationResultStep.hidden = stepName !== "result";

  if (stepName === "calendar") {
    consultationCopy.textContent = "Choose a date to request your consultation call.";
  }

  if (stepName === "time") {
    consultationCopy.textContent = "Choose a one-hour time range for your appointment.";
  }

  if (stepName === "result" && consultationDate) {
    consultationCopy.textContent = `Appointment request for ${appointmentFormatter.format(consultationDate)}.`;
  }
};

const setTimeSlotDisabledState = (disabled) => {
  timeSlotList?.querySelectorAll(".time-slot").forEach((button) => {
    button.disabled = disabled;
  });
};

const renderTimeSlots = () => {
  if (!timeSlotList) {
    return;
  }

  timeSlotList.innerHTML = "";

  for (let hour = 0; hour < 24; hour += 1) {
    const timeRange = buildTimeRange(hour);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-slot";
    button.dataset.timeRange = timeRange;
    button.innerHTML = `
      <span class="time-slot-range">${timeRange}</span>
      <small class="time-slot-meta">One-hour booking window</small>
    `;

    button.addEventListener("click", async () => {
      if (!consultationDate) {
        return;
      }

      const contactName = consultationNameInput?.value.trim() ?? "";
      const contactValue = consultationContactInput?.value.trim() ?? "";

      if (!contactName || !contactValue) {
        if (!contactName) {
          consultationNameInput?.reportValidity();
          consultationNameInput?.focus();
          return;
        }

        consultationContactInput?.reportValidity();
        consultationContactInput?.focus();
        return;
      }

      timeSlotList.querySelectorAll(".time-slot").forEach((timeButton) => {
        timeButton.classList.toggle("is-selected", timeButton === button);
      });

      setConsultationStep("result");
      setStatusMessage(
        consultationStatus,
        `Submitting your request for ${appointmentFormatter.format(consultationDate)} at ${timeRange}...`
      );
      setTimeSlotDisabledState(true);
      const appointmentSummary = `Consultation requested for ${appointmentFormatter.format(consultationDate)} at ${timeRange}. Contact: ${contactValue}.`;

      try {
        const response = await submitLeadRequest({
          type: "consultation",
          source: "Consultation Modal",
          name: contactName,
          contact: contactValue,
          email: isEmailContact(contactValue) ? contactValue : "",
          service: "Consultation Booking",
          message: appointmentSummary,
          appointmentDate: formatDateValue(consultationDate),
          appointmentTime: timeRange,
          website: consultationTrapInput?.value ?? "",
        });

        setStatusMessage(
          consultationStatus,
          response?.message ||
            `Appointment request sent for ${appointmentFormatter.format(consultationDate)} at ${timeRange}. We'll follow up shortly.`,
          "success"
        );
        trackAnalyticsEvent("consultation_request_submitted", {
          date: formatDateValue(consultationDate),
          timeRange,
          contactType: isEmailContact(contactValue) ? "email" : "phone",
          location: window.location.pathname,
        });
      } catch (error) {
        setStatusMessage(consultationStatus, error.message, "error");
      } finally {
        setTimeSlotDisabledState(false);
      }
    });

    timeSlotList.append(button);
  }
};

const renderCalendar = () => {
  if (!calendarGrid || !calendarLabel) {
    return;
  }

  const year = consultationMonth.getFullYear();
  const month = consultationMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  calendarLabel.textContent = monthFormatter.format(firstDayOfMonth);
  calendarGrid.innerHTML = "";

  if (calendarPrevButton) {
    calendarPrevButton.disabled = getMonthIndex(firstDayOfMonth) <= getMonthIndex(todayFloor);
  }

  for (let index = 0; index < firstWeekday; index += 1) {
    const filler = document.createElement("span");
    filler.className = "calendar-day calendar-day-empty";
    filler.setAttribute("aria-hidden", "true");
    calendarGrid.append(filler);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const candidateDate = new Date(year, month, day);
    const button = document.createElement("button");
    const isPastDate = candidateDate < todayFloor;
    const isToday = isSameDay(candidateDate, todayFloor);
    const isSelected = isSameDay(candidateDate, consultationDate);

    button.type = "button";
    button.className = "calendar-day";
    button.disabled = isPastDate;
    button.innerHTML = `
      <span>${day}</span>
      <small>${isToday ? "Today" : candidateDate.toLocaleDateString("en-US", { weekday: "short" })}</small>
    `;

    if (isToday) {
      button.classList.add("is-today");
    }

    if (isSelected) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      consultationDate = candidateDate;

      if (consultationSelectedDate) {
        consultationSelectedDate.textContent = appointmentFormatter.format(candidateDate);
      }

      renderCalendar();
      renderTimeSlots();
      setStatusMessage(consultationStatus);
      setConsultationStep("time");
    });

    calendarGrid.append(button);
  }
};

const resetConsultationFlow = () => {
  consultationDate = null;
  consultationMonth = new Date(todayFloor.getFullYear(), todayFloor.getMonth(), 1);

  if (consultationNameInput) {
    consultationNameInput.value = "";
  }

  if (consultationContactInput) {
    consultationContactInput.value = "";
  }

  if (consultationSelectedDate) {
    consultationSelectedDate.textContent = "";
  }

  setStatusMessage(consultationStatus);
  renderCalendar();
  renderTimeSlots();
  setConsultationStep("calendar");
};

const openConsultationModal = () => {
  if (!consultationModal) {
    return;
  }

  trackAnalyticsEvent("consultation_modal_opened", {
    location: window.location.pathname,
  });
  window.clearTimeout(consultationCloseTimeoutId);
  consultationModal.hidden = false;
  consultationModal.setAttribute("aria-hidden", "false");
  body.classList.add("is-modal-open");
  resetConsultationFlow();

  window.requestAnimationFrame(() => {
    consultationModal.classList.add("is-open");
  });

  (consultationNameInput ?? consultationDialog)?.focus();
};

const closeConsultationModal = () => {
  if (!consultationModal) {
    return;
  }

  consultationModal.classList.remove("is-open");
  consultationModal.setAttribute("aria-hidden", "true");
  body.classList.remove("is-modal-open");

  consultationCloseTimeoutId = window.setTimeout(() => {
    consultationModal.hidden = true;
  }, 220);
};

const openInquiryForm = () => {
  if (!contactForm || !inquiryModal) {
    return;
  }

  trackAnalyticsEvent("inquiry_modal_opened", {
    location: window.location.pathname,
  });
  const status = contactForm.querySelector(".form-status");
  setStatusMessage(status);
  window.clearTimeout(consultationCloseTimeoutId);
  inquiryModal.hidden = false;
  inquiryModal.setAttribute("aria-hidden", "false");
  body.classList.add("is-modal-open");
  inquiryTrigger?.setAttribute("aria-expanded", "true");

  window.requestAnimationFrame(() => {
    inquiryModal.classList.add("is-open");
  });

  const firstField = contactForm.querySelector("input, select, textarea");
  firstField?.focus();
};

const closeInquiryForm = () => {
  if (!inquiryModal) {
    return;
  }

  inquiryModal.classList.remove("is-open");
  inquiryModal.setAttribute("aria-hidden", "true");
  body.classList.remove("is-modal-open");
  inquiryTrigger?.setAttribute("aria-expanded", "false");

  consultationCloseTimeoutId = window.setTimeout(() => {
    inquiryModal.hidden = true;
  }, 220);
};

if (consultationTrigger && consultationModal) {
  consultationTrigger.addEventListener("click", openConsultationModal);

  consultationModal.querySelectorAll("[data-close-consultation]").forEach((button) => {
    button.addEventListener("click", closeConsultationModal);
  });

  consultationResetButton?.addEventListener("click", () => {
    if (consultationDate) {
      setStatusMessage(consultationStatus);
      renderTimeSlots();
      setConsultationStep("time");
      return;
    }

    resetConsultationFlow();
  });

  consultationBackButton?.addEventListener("click", () => {
    setStatusMessage(consultationStatus);
    setConsultationStep("calendar");
  });

  calendarPrevButton?.addEventListener("click", () => {
    const previousMonth = new Date(consultationMonth.getFullYear(), consultationMonth.getMonth() - 1, 1);

    if (getMonthIndex(previousMonth) < getMonthIndex(todayFloor)) {
      return;
    }

    consultationMonth = previousMonth;
    renderCalendar();
  });

  calendarNextButton?.addEventListener("click", () => {
    consultationMonth = new Date(consultationMonth.getFullYear(), consultationMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && consultationModal.classList.contains("is-open")) {
      closeConsultationModal();
    }
  });
}

inquiryTrigger?.addEventListener("click", openInquiryForm);

if (inquiryModal) {
  inquiryModal.querySelectorAll("[data-close-inquiry]").forEach((button) => {
    button.addEventListener("click", closeInquiryForm);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && inquiryModal.classList.contains("is-open")) {
      closeInquiryForm();
    }
  });
}

if (contactForm) {
  const button = contactForm.querySelector(".form-button");
  const status = contactForm.querySelector(".form-status");
  const defaultButtonLabel = button?.textContent ?? "Send Inquiry";
  let buttonResetId;

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatusMessage(status);

    if (button) {
      window.clearTimeout(buttonResetId);
      button.disabled = true;
      button.textContent = "Sending...";
    }

    try {
      const formData = new FormData(contactForm);
      const response = await submitLeadRequest({
        type: "inquiry",
        source: "Inquiry Modal",
        name: formData.get("name"),
        email: formData.get("email"),
        service: formData.get("service"),
        message: formData.get("message"),
        company: formData.get("company"),
      });

      contactForm.reset();
      setStatusMessage(status, response?.message || "Inquiry sent successfully. We'll get back to you soon.", "success");
      trackAnalyticsEvent("inquiry_submitted", {
        service: String(formData.get("service") || ""),
        location: window.location.pathname,
      });

      if (button) {
        button.textContent = "Inquiry Received";
        buttonResetId = window.setTimeout(() => {
          button.textContent = defaultButtonLabel;
        }, 2500);
      }

      window.setTimeout(() => {
        setStatusMessage(status);
        closeInquiryForm();
      }, 1200);
    } catch (error) {
      setStatusMessage(status, error.message, "error");

      if (button) {
        button.textContent = defaultButtonLabel;
      }
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  });
}

document.addEventListener("click", (event) => {
  const anchor = event.target instanceof Element ? event.target.closest("a") : null;

  if (!anchor) {
    return;
  }

  const href = anchor.getAttribute("href") || "";

  if (/wa\.me|whatsapp\.com/i.test(href)) {
    trackAnalyticsEvent("whatsapp_cta_clicked", {
      href,
      label: anchor.textContent?.trim() || "",
      location: window.location.pathname,
    });
  }
});
