// Lightweight M-Pesa STK Push client helper
(function () {
  const bindMpesaPaymentButtons = () => {
    document.querySelectorAll("[data-pay-package]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();

        const amount = Number(btn.dataset.amount || btn.getAttribute("data-amount"));
        const accountReference = btn.dataset.ref || btn.getAttribute("data-ref") || "Subscription";
        const description = btn.dataset.desc || btn.getAttribute("data-desc") || accountReference;

        if (!amount || Number.isNaN(amount)) {
          alert("Payment amount is not configured for this package.");
          return;
        }

        const phone = window.prompt("Enter phone number in international format (e.g. 2547XXXXXXXX):");
        if (!phone) return;

        btn.disabled = true;
        const originalLabel = btn.textContent;
        btn.textContent = "Processing...";

        try {
          const res = await fetch("/mpesa/stk-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, phone, accountReference, description }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.error) {
            const err = data.error || JSON.stringify(data);
            alert("Payment initiation failed: " + err);
          } else {
            alert("Payment initiated. Check your phone to complete the payment.");
          }
        } catch (err) {
          alert("Payment request error: " + (err.message || err));
        } finally {
          btn.disabled = false;
          btn.textContent = originalLabel;
        }
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindMpesaPaymentButtons);
  } else {
    bindMpesaPaymentButtons();
  }
})();
