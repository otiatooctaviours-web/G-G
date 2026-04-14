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

let activeIndex = 0;
let testimonialIntervalId;
let consultationCloseTimeoutId;
let consultationMonth = new Date();
let consultationDate = null;

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const appointmentFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

window.addEventListener("load", () => {
  body.classList.add("is-ready");
});

const setNavbarState = () => {
  navbar?.classList.toggle("is-scrolled", window.scrollY > 18);
};

setNavbarState();
window.addEventListener("scroll", setNavbarState, { passive: true });

if (navToggle && navMenu) {
  const closeNavMenu = () => {
    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    dropdowns.forEach((dd) => {
      dd.classList.remove("is-open");
      const t = dd.querySelector(".dropdown-trigger");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  };

  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));

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

const getFormspreeEndpoint = (form) => form?.dataset.formspreeEndpoint ?? "";

const submitToFormspree = async (form, formData) => {
  const endpoint = getFormspreeEndpoint(form);

  if (!endpoint || endpoint.includes("YOUR_FORM_ID")) {
    throw new Error("Add your Formspree form ID before publishing.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      data?.errors?.map((item) => item.message).join(" ") ??
      "We couldn't send your request right now. Please try again.";

    throw new Error(message);
  }
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
      if (!consultationDate || !consultationRequestForm) {
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

      const appointmentDateField = consultationRequestForm.querySelector('input[name="appointment_date"]');
      const appointmentTimeField = consultationRequestForm.querySelector('input[name="appointment_time"]');
      const nameField = consultationRequestForm.querySelector('input[name="name"]');
      const contactField = consultationRequestForm.querySelector('input[name="contact"]');
      const emailField = consultationRequestForm.querySelector('input[name="email"]');
      const serviceField = consultationRequestForm.querySelector('input[name="service"]');
      const messageField = consultationRequestForm.querySelector('input[name="message"]');
      const appointmentSummary = `Consultation requested for ${appointmentFormatter.format(consultationDate)} at ${timeRange}. Contact: ${contactValue}.`;

      if (appointmentDateField) {
        appointmentDateField.value = formatDateValue(consultationDate);
      }

      if (appointmentTimeField) {
        appointmentTimeField.value = timeRange;
      }

      if (nameField) {
        nameField.value = contactName;
      }

      if (contactField) {
        contactField.value = contactValue;
      }

      if (emailField) {
        emailField.value = isEmailContact(contactValue) ? contactValue : "";
      }

      if (serviceField) {
        serviceField.value = "Consultation Booking";
      }

      if (messageField) {
        messageField.value = appointmentSummary;
      }

      try {
        await submitToFormspree(consultationRequestForm, new FormData(consultationRequestForm));
        setStatusMessage(
          consultationStatus,
          `Appointment request sent for ${appointmentFormatter.format(consultationDate)} at ${timeRange}. We'll follow up shortly.`,
          "success"
        );
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
      await submitToFormspree(contactForm, new FormData(contactForm));
      contactForm.reset();
      setStatusMessage(status, "Inquiry sent successfully. We'll get back to you soon.", "success");

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
