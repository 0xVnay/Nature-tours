import "@babel/polyfill";
import { displayMap } from "./mapbox";
import { login, logout } from "./login";

//DOM ELEMENTS
const map = document.getElementById("map");
const loginForm = document.querySelector(".form--login");
const logOutBtn = document.querySelector(".nav__el--logout");

//DELEGATION
if (map) {
  const locations = JSON.parse(map.dataset.locations);
  displayMap(locations);
}

if (loginForm)
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    login(email, password);
  });

if (logOutBtn) logOutBtn.addEventListener("click", logout);
