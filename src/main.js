import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource-variable/manrope";
import { isPlainClick, scrollPageTo, stopPageScroll } from "./navigation.js";
import "./motion.css";
import "./style.css";

document.documentElement.classList.add("js");

const header = document.querySelector(".site-header");
const nav = document.querySelector(".site-nav");
const toggle = document.querySelector(".nav-toggle");
const mobile = matchMedia("(max-width: 740px)");

function setMenu(open, restoreFocus = false) {
  header.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
  nav.inert = mobile.matches && !open;
  if (restoreFocus) toggle.focus();
}

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 35);
}

toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") === "false"));
nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && header.classList.contains("is-open")) setMenu(false, true);
});
document.addEventListener("click", (event) => {
  if (!header.contains(event.target)) setMenu(false);
  const link = event.target.closest('a[href^="#"]');
  if (!link || !isPlainClick(event)) return;
  const hash = link.getAttribute("href");
  const target = document.getElementById(hash.slice(1));
  if (!target) return;

  event.preventDefault();
  if (location.hash !== hash) history.pushState(null, "", hash);
  scrollPageTo(target).then((completed) => {
    if (!completed) return;
    if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  });
});
mobile.addEventListener("change", () => setMenu(false));
window.addEventListener("popstate", stopPageScroll);
window.addEventListener("scroll", updateHeader, { passive: true });
setMenu(false);
updateHeader();

const copyAddress = document.querySelector("[data-copy-address]");
const address = document.querySelector("[data-visit-address]");
const copyStatus = document.querySelector("[data-copy-status]");

copyAddress.addEventListener("click", async () => {
  copyStatus.textContent = "";
  try {
    await navigator.clipboard.writeText(address.innerText.trim().replace(/\s*\n\s*/g, ", "));
    copyStatus.textContent = "Адресу скопійовано.";
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(address);
    selection.removeAllRanges();
    selection.addRange(range);
    copyStatus.textContent = "Адресу виділено. Скопіюйте її вручну.";
  }
});
copyAddress.hidden = false;

const hero = document.querySelector("[data-hero]");
if ("Path2D" in window) {
  import("./opening.js")
    .then(({ startOpening }) => startOpening(hero))
    .catch((error) => {
      document.documentElement.classList.remove("motion-layout");
      console.warn("Увімкнено статичну сцену Lounge.", error);
    });
}
