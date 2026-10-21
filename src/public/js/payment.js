// public/js/payment.js
// Razorpay checkout (loaded by views/kiosk/payment.ejs after checkout.razorpay.com/v1/checkout.js)
(() => {
  const container = document.getElementById("razorpay-container");
  if (!container) return;

  const loading = document.getElementById("payment-loading");
  const message = document.getElementById("payment-message");
  const payButton = document.getElementById("pay-button");

  const showMessage = (text, type = "warning") => {
    loading.classList.add("d-none");
    message.className = `alert alert-${type}`;
    message.textContent = text;
    payButton.classList.remove("d-none");
  };

  if (typeof window.Razorpay !== "function") {
    showMessage("The payment service could not be loaded. Check your connection and refresh the page.", "danger");
    payButton.classList.add("d-none");
    return;
  }

  const { key, orderid, amount, currency, email } = container.dataset;

  const rzp = new window.Razorpay({
    key,
    amount,
    currency,
    name: "Restaurant Kiosk",
    description: "Order Payment",
    order_id: orderid,
    prefill: { email },
    theme: { color: "#dc3545" },
    handler: async (response) => {
      loading.classList.remove("d-none");
      message.className = "alert d-none";
      payButton.classList.add("d-none");
      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(response),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Payment verification failed.");
        window.location.href = data.redirect;
      } catch (err) {
        showMessage(`❌ ${err.message} If money was deducted, please contact staff.`, "danger");
      }
    },
    modal: {
      ondismiss: () => showMessage("Payment was cancelled. Your cart has been kept — you can try again."),
    },
  });

  rzp.on("payment.failed", (response) => {
    showMessage(`Payment failed: ${response.error?.description || "please try again."}`, "danger");
  });

  payButton.addEventListener("click", () => {
    message.className = "alert d-none";
    payButton.classList.add("d-none");
    rzp.open();
  });

  rzp.open();
})();
