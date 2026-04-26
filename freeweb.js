const form = document.querySelector("#submission-form");
const statusNode = document.querySelector("[data-form-status]");
const submitButton = document.querySelector("[data-submit-button]");
const fileInput = document.querySelector("#website-screenshot");
const fileNameNode = document.querySelector("[data-file-name]");

const websiteUrlPattern =
  /^https:\/\/(?:www\.)?[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+(?:[/?#].*)?$/i;
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const screenshotMaxBytes = 10 * 1024 * 1024;
const submissionLimit = 5;
const submissionCountKey = "ggmarketing-freeweb-submission-count";

let limitReached = false;

const setStatus = (message = "", tone) => {
  if (!statusNode) {
    return;
  }

  statusNode.textContent = message;
  statusNode.classList.remove("is-success", "is-error");

  if (tone) {
    statusNode.classList.add(`is-${tone}`);
  }
};

const getStoredSubmissionCount = () => {
  try {
    return Number(window.localStorage.getItem(submissionCountKey) ?? 0);
  } catch (error) {
    return 0;
  }
};

const setStoredSubmissionCount = (count) => {
  try {
    window.localStorage.setItem(submissionCountKey, String(count));
  } catch (error) {
    console.error("Unable to store submission count.", error);
  }
};

const setFormDisabled = (disabled) => {
  if (!form) {
    return;
  }

  const controls = form.querySelectorAll("input, textarea, button");

  controls.forEach((control) => {
    if (control instanceof HTMLInputElement && control.name === "company") {
      return;
    }

    control.disabled = disabled;
  });
};

const applyLimitState = (reached) => {
  limitReached = reached;
  setFormDisabled(reached);

  if (submitButton && !reached) {
    submitButton.textContent = "Send Submission";
  }

  if (reached) {
    setStatus("Maximum submissions reached.", "error");
  }
};

const syncFileName = () => {
  if (!fileInput || !fileNameNode) {
    return;
  }

  fileNameNode.textContent = fileInput.files?.[0]?.name ?? "No file selected yet.";
};

const validateForm = () => {
  if (!form) {
    return false;
  }

  const websiteInput = form.querySelector("#website-url");

  if (!(websiteInput instanceof HTMLInputElement)) {
    return false;
  }

  if (!form.reportValidity()) {
    return false;
  }

  if (!websiteUrlPattern.test(websiteInput.value.trim())) {
    websiteInput.setCustomValidity("Enter the full website address starting with https://");
    websiteInput.reportValidity();
    websiteInput.focus();
    return false;
  }

  websiteInput.setCustomValidity("");

  const screenshot = fileInput?.files?.[0];

  if (!screenshot) {
    setStatus("Please attach a website screenshot.", "error");
    fileInput?.focus();
    return false;
  }

  if (!allowedImageTypes.has(screenshot.type)) {
    setStatus("Only PNG, JPG, or WEBP screenshots are accepted.", "error");
    fileInput?.focus();
    return false;
  }

  if (screenshot.size > screenshotMaxBytes) {
    setStatus("Screenshot size must be 10MB or less.", "error");
    fileInput?.focus();
    return false;
  }

  return true;
};

const getFormspreeEndpoint = () => form?.dataset.formspreeEndpoint ?? form?.action ?? "";

fileInput?.addEventListener("change", syncFileName);
syncFileName();

if (getStoredSubmissionCount() >= submissionLimit) {
  applyLimitState(true);
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  if (limitReached) {
    applyLimitState(true);
    return;
  }

  if (!validateForm()) {
    return;
  }

  const endpoint = getFormspreeEndpoint();

  if (!endpoint) {
    setStatus("Form submission is not configured.", "error");
    return;
  }

  const formData = new FormData(form);

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.errors?.map((item) => item.message).join(" ") ??
        data?.message ??
        "We could not send your submission right now.";

      throw new Error(message);
    }

    const nextCount = getStoredSubmissionCount() + 1;
    setStoredSubmissionCount(nextCount);

    form.reset();
    syncFileName();

    if (nextCount >= submissionLimit) {
      applyLimitState(true);
      setStatus("Submission received. Maximum submissions reached.", "success");
      return;
    }

    setStatus("Submission received successfully. We will review it and get back to you.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    if (submitButton && !limitReached) {
      submitButton.disabled = false;
      submitButton.textContent = "Send Submission";
    }
  }
});
