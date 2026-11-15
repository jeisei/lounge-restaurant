import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isPlainClick, scrollPageTo } from "./navigation.js";
import { bowlCenter, drawGlass, loadGlassAssets, photoPlacement, sizeCanvas, willOverflow } from "./wine-photo.js";
import { drawGreeting, drawSpill, sampleGreeting } from "./spill.js";

gsap.registerPlugin(ScrollTrigger);
gsap.ticker.lagSmoothing(0);
ScrollTrigger.config({ ignoreMobileResize: true });

const clamp = gsap.utils.clamp(0, 1);
const lerp = gsap.utils.interpolate;
function smooth(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}
const angleAt = (time) => -.065 * Math.sin(time * 9) - 2.33 * smooth((time - .045) / .56);

export async function startOpening(hero) {
  const canvas = hero.querySelector("[data-motion]");
  if (!canvas.getContext("2d")) {
    document.documentElement.classList.remove("motion-layout");
    return;
  }

  const video = hero.querySelector("[data-pour]");
  const photo = hero.querySelector("[data-photo]");
  const photoFrame = hero.querySelector("[data-photo-frame]");
  const opening = hero.parentElement;
  const welcome = hero.querySelector("[data-welcome]");
  const title = welcome.querySelector("strong");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let animation;
  let assets;
  let pending;

  function mountScene() {
    const shot = { progress: 0 };
    let layout;
    let context;
    let playing = false;
    let firstFill = .16;
    let release = .36;

    function onPlaying() {
      photoFrame.classList.add("has-video");
    }

    function setPlayback(allowed) {
      if (playing === allowed) return;
      playing = allowed;
      if (allowed && !video.ended) {
        video.play().catch(() => {});
      } else {
        video.pause();
        if (photoFrame.classList.contains("has-video")) {
          firstFill = lerp(.033, .16, clamp((video.currentTime - .27) / 4.9));
        }
        for (let time = .18; time <= .63; time += .01) {
          if (!willOverflow(angleAt(time), firstFill)) continue;
          release = time;
          break;
        }
      }
    }

    function poseAt(time) {
      const { width, height, photo: placement, small } = layout;
      const angle = angleAt(time);
      const fill = firstFill * (1 - smooth((time - release) / .215)) + .0005;
      const scale = placement.scale * lerp(1, .9, time);
      return {
        time, angle, fill, scale,
        opacity: smooth(time * 17) * (1 - smooth((time - .79) / .16)),
        x: placement.x + bowlCenter.x * placement.scale
          - width * (small ? .125 : .15) * time + width * .045 * time * time,
        y: placement.y + bowlCenter.y * placement.scale +
          height * ((small ? 1.12 : .92) * time * time - .03 * Math.sin(time * Math.PI)),
      };
    }

    function render() {
      const { width, height, greeting } = layout;
      context.clearRect(0, 0, width, height);
      setPlayback(shot.progress < .018 && !document.hidden && window.scrollY <= 16);
      const time = clamp((shot.progress - .025) / .925);
      if (!time) return;

      const pose = poseAt(time);
      if (pose.opacity > .001) drawGlass(context, assets, pose);
      drawGreeting(context, greeting, time);
      drawSpill(context, greeting.points, width, height, time, poseAt, release);
    }

    function measure() {
      const bounds = hero.getBoundingClientRect();
      layout = {
        width: bounds.width,
        height: bounds.height,
        small: bounds.width <= 740,
        photo: photoPlacement(photoFrame, bounds),
        greeting: sampleGreeting(title, bounds),
      };
      context = sizeCanvas(canvas, layout.width, layout.height);
      render();
    }

    video.addEventListener("playing", onPlaying);
    document.addEventListener("visibilitychange", render);
    measure();

    const scene = gsap.timeline({
      defaults: { ease: "none" },
      onUpdate: render,
      scrollTrigger: {
        id: "wine-scene",
        trigger: opening,
        start: "top top",
        end: () => `+=${opening.offsetHeight - hero.offsetHeight}`,
        scrub: .43,
        onRefresh: measure,
      },
    });

    scene
      .to(shot, { progress: 1, duration: 1 }, 0)
      .to(hero.querySelector("[data-hero-content]"), { autoAlpha: 0, y: -32, duration: .21 }, 0)
      .to(hero.querySelector("[data-hero-foot]"), { autoAlpha: 0, duration: .14 }, 0)
      .to(hero.querySelector("[data-fade]"), { opacity: 1, duration: .19 }, .043)
      .to(welcome, { opacity: 1, duration: .23, ease: "sine.inOut" }, .72);
    hero.classList.add("has-motion");

    const scrollLink = hero.querySelector(".scroll-link");
    const previewScene = (event) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      scrollPageTo(scene.scrollTrigger.end * .995, { duration: 1.7 });
    };
    scrollLink.addEventListener("click", previewScene);
    let active = true;
    document.fonts.ready.then(() => {
      if (active) measure();
    });

    return () => {
      active = false;
      video.pause();
      video.removeEventListener("playing", onPlaying);
      document.removeEventListener("visibilitychange", render);
      photoFrame.classList.remove("has-video");
      hero.classList.remove("has-motion");
      scrollLink.removeEventListener("click", previewScene);
      canvas.width = 0;
    };
  }

  async function syncMotionPreference() {
    if (preference.matches) {
      animation?.revert();
      animation = undefined;
      return;
    }
    try {
      pending ??= Promise.all([loadGlassAssets(), photo.decode()]);
      [assets] = await pending;
      if (!preference.matches && !animation) animation = gsap.context(mountScene, hero);
    } catch (error) {
      document.documentElement.classList.remove("motion-layout");
      console.warn("Не вдалося завантажити вступну сцену Lounge.", error);
    }
  }

  preference.addEventListener("change", syncMotionPreference);
  await syncMotionPreference();
}
