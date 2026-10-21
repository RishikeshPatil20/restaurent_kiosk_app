// public/js/admin.js
// Confirmation for destructive admin forms (inline onsubmit handlers are blocked by the CSP)
document.querySelectorAll("form.confirm-delete").forEach((form) => {
  form.addEventListener("submit", (e) => {
    if (!window.confirm(form.dataset.confirm || "Are you sure?")) {
      e.preventDefault();
    }
  });
});
