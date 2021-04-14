export const hideAlert = () => {
  const el = document.querySelector(".alert");
  if (el) el.parentElement.removeChild(el);
};

//type is "success" or "error"
export const showAlert = (type, msg) => {
  // whenever showing alert, first make sure to hide other alerts.
  hideAlert();

  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector("body").insertAdjacentHTML("afterbegin", markup);

  window.setTimeout(hideAlert, 5000);
};
