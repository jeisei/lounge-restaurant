import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let pageScroll;

export function isPlainClick(event) {
  return !event.defaultPrevented && event.button === 0
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function stopPageScroll() {
  pageScroll?.kill();
}

export function scrollPageTo(target, { animate = true, duration } = {}) {
  stopPageScroll();
  const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const top = typeof target === "number" ? target : window.scrollY + target.getBoundingClientRect().top - offset;
  const limit = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const y = Math.min(Math.max(0, limit), Math.max(0, top));
  const distance = Math.abs(y - window.scrollY);
  if (!animate || reducedMotion.matches || distance < 3) {
    window.scrollTo({ top: y, behavior: "instant" });
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const finish = (completed) => {
      pageScroll = undefined;
      resolve(completed);
    };
    pageScroll = gsap.to(window, {
      scrollTo: { y, autoKill: true },
      duration: duration ?? Math.min(.92, .39 + distance / 4500),
      ease: "power2.inOut",
      onComplete: () => finish(true),
      onInterrupt: () => finish(false),
    });
  });
}

reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) stopPageScroll();
});
