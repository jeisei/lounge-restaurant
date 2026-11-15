import "@fontsource/cormorant-garamond/500.css";
import "@fontsource-variable/manrope";
import catalog from "./menu-data.json";
import { isPlainClick, reducedMotion, scrollPageTo, stopPageScroll } from "./navigation.js";
import "./motion.css";
import "./menu.css";

const currency = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 });
const labelNames = { new: "Новинка", recommended: "Рекомендовано", spicy: "Гостре", "middle-spicy": "Помірно гостре" };
const units = { g: "г", kg: "кг", ml: "мл", l: "л" };
const popularIds = [
  "cezar-z-kurkoyu", "salat-z-lososem-i-avokado", "lavash-gril-iz-sirom-ta-zelennyu", "pasta-z-kurkoyu-i-gribami",
  "kartoplya-zapechena", "kuryache-file-gril-iz-vershkovo-gribnim-sousom", "salat-z-kuryachim-file-ta-grusheyu",
  "salat-z-tigrovimi-krevetkami-i-avokado", "pasta-z-tigrovoyu-krevetkoyu-i-cukini", "sirne-plato", "karbonara",
  "salat-rostbif", "steyk-svinniy", "m-yasne-plato", "gril-salat-z-yalovichinoyu", "trio-brusket",
  "kuryache-file-su-vid-z-mocareloyu", "ovochi-gril", "shokoladniy-fondan", "shashlik-zi-svinini", "gribniy-krem-sup",
  "kartoplya-fri", "borshch", "salat-proshuto-gorgonzola-duo", "kotleti-po-kiyivski-z-goroshkom-i-pyure",
  "salat-iz-moreproduktami", "kamamber-fri-z-tryufelnim-medom", "indichka-po-grecki", "shashlik-kuryachiy",
];
const tastingNotes = {
  "sirne-plato": "Рокфор, брі, дорблю, моцарела, чедер і гауда з горіхом. До плато додаємо грісіні, мед і фундук.",
  "m-yasne-plato": "В’ялена телятина та дві сиров’ялені ковбаси з копченим салом.",
  "ribne-plato": "Тунець гарячого копчення, масляна риба та лосось власного посолу. З томатами кімчі, лаймом і зеленню.",
  "marinovaniy-vugor-iz-gorihovim-sousom": "З соусом із кеш’ю, чукою, томатами кімчі, кунжутом і цитрусовими.",
  "tartar-z-lososom": "Лосось, авокадо й лимонна цедра з оливковою олією. Подаємо з крем-сиром.",
  "krem-bryule": "Ванільний крем із медом під тонкою карамельною скоринкою.",
};

const selectors = {
  sidebar: document.querySelector("#categories"),
  nav: document.querySelector("[data-categories]"),
  favorites: document.querySelector("[data-favorites]"),
  popular: document.querySelector("[data-popular]"),
  count: document.querySelector(".favorites-count"),
  sections: document.querySelector(".mobile-sections"),
  search: document.querySelector("#menu-search"),
  status: document.querySelector("[data-menu-status]"),
  results: document.querySelector("[data-results]"),
  dialog: document.querySelector(".dish-dialog"),
  detail: document.querySelector("[data-item-detail]"),
};
const items = new Map();
for (const group of catalog) {
  for (const category of group.categories) {
    for (const [index, item] of category.items.entries()) {
      item.key = [group.id, category.id, item.id, index].join("/");
      item.category = category.name;
      items.set(item.key, item);
    }
  }
}
const dishesById = new Map(catalog[0].categories.flatMap(({ items }) => items.map((item) => [item.id, item])));
const popular = popularIds.map((id) => dishesById.get(id)).filter(Boolean);

const storedFavorites = "lounge-menu-favorites";
function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(storedFavorites) ?? "[]");
    return new Set(Array.isArray(saved) ? saved.filter((key) => items.has(key)) : []);
  } catch {
    return new Set();
  }
}
const favorites = loadFavorites();
const mobile = matchMedia("(max-width: 690px)");
let currentGroup = catalog[0];
let visibleCategory = currentGroup.categories[0]?.id;
let view = "group";
let detailItem;
let scrollFrame = 0;
let renderedSections = [];
let routeVersion = 0;
let catalogEntrance;

const escape = (input) => String(input ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
const photoPath = (item) => `./media/menu/${encodeURIComponent(item.image)}`;
const price = (item) => `${currency.format(item.price)} ₴`;

function renderMeta(item) {
  const unit = units[item.unit ?? "g"];
  const facts = [
    item.weight && `${item.weight}${unit ? ` ${unit}` : ""}`,
    item.alcohol && `${item.alcohol}% об.`,
    item.kcal && `${item.kcal} ккал`,
    ...(item.labels ?? []).map((label) => labelNames[label]),
  ].filter(Boolean);
  if (!facts.length) return "";
  return `<div class="menu-card__meta">${facts.map((fact) => `<span>${escape(fact)}</span>`).join("")}</div>`;
}

function favoriteButton(item) {
  const saved = favorites.has(item.key);
  return `<button type="button" class="menu-button favorite-button" data-save="${escape(item.key)}"
    aria-pressed="${saved}" aria-label="Зберегти «${escape(item.name)}» в обране"><span aria-hidden="true">${saved ? "♥" : "♡"}</span></button>`;
}

function renderCard(item) {
  const key = escape(item.key);
  const name = escape(item.name);
  const notes = tastingNotes[item.id];
  return `<article class="menu-card">
    <div class="menu-card__body">
      <h3 class="menu-card__heading"><button type="button" data-dish="${key}">${name}</button></h3>
      <p class="menu-card__price">${price(item)}</p>
      ${notes ? `<p class="menu-card__notes">${escape(notes)}</p>` : ""}
      ${renderMeta(item)}
    </div>
    ${item.image ? `<button type="button" class="menu-card__photo" data-dish="${key}" aria-label="Фото «${name}»">
      <img src="${photoPath(item)}" alt="" loading="lazy" decoding="async" width="400" height="300">
    </button>` : ""}
    <div class="menu-card__actions">${favoriteButton(item)}</div>
  </article>`;
}

function renderSection(category) {
  const heading = escape(category.name);
  return `<section class="menu-category" id="${escape(category.id)}" aria-label="${heading}">
    <h2>${heading}</h2>${category.items.map(renderCard).join("")}
  </section>`;
}

const normalize = (value) => String(value).toLocaleLowerCase("uk").normalize("NFKC").replace(/[’ʼ']/g, "");
function renderCatalog() {
  const query = normalize(selectors.search.value).trim();
  if (query || view !== "group") {
    const pool = view === "popular" ? popular : [...items.values()];
    const words = query.split(/\s+/);
    const matches = pool.filter((item) => {
      if (view === "favorites" && !favorites.has(item.key)) return false;
      return !query || words.every((term) => normalize(`${item.name} ${item.category}`).includes(term));
    });
    const title = view === "favorites" ? "Обране" : view === "popular" ? "Популярне" : "Результати пошуку";
    const empty = view === "favorites" && !query ? "Збережені страви з’являться тут." : "За цим запитом нічого не знайдено.";
    selectors.results.innerHTML = `<h1>${title}</h1>${matches.length
      ? `<p class="menu-muted menu-card__notes">Позицій: ${matches.length}</p>${matches.map(renderCard).join("")}`
      : `<p class="menu-empty">${empty}</p>`}`;
    selectors.status.textContent = `${title}. Позицій: ${matches.length}`;
  } else {
    selectors.results.innerHTML = `<h1>${escape(currentGroup.name)}</h1>${currentGroup.categories.map(renderSection).join("")}`;
    selectors.status.textContent = currentGroup.name;
  }
  renderedSections = [...selectors.results.querySelectorAll(".menu-category")];
}

function renderNav() {
  selectors.nav.innerHTML = catalog.map((group) => {
    const expanded = group === currentGroup && view === "group";
    return `<div class="menu-group"><a href="#${escape(group.id)}" ${expanded ? 'aria-current="true"' : ""}>${escape(group.name)}</a>
      ${expanded ? `<ul>${group.categories.map((category) => `<li><a href="#${escape(group.id)}/${escape(category.id)}"
        data-category="${escape(category.id)}">${escape(category.name)}</a></li>`).join("")}</ul>` : ""}</div>`;
  }).join("");
  for (const name of ["favorites", "popular"]) {
    if (view === name) selectors[name].setAttribute("aria-current", "true");
    else selectors[name].removeAttribute("aria-current");
  }
  selectors.count.textContent = favorites.size || "";
  highlightCategory();
}

function highlightCategory() {
  for (const link of selectors.nav.querySelectorAll("[data-category]")) {
    if (link.dataset.category === visibleCategory) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

function setDrawer(open, focus = false) {
  selectors.sidebar.classList.toggle("is-open", open);
  selectors.sidebar.inert = mobile.matches && !open;
  selectors.sections.setAttribute("aria-expanded", String(open));
  if (focus) selectors.sections.focus();
}

function categoryFromScroll() {
  if (!renderedSections.length) return;
  const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 8;
  let category = renderedSections[0].id;
  for (const section of renderedSections) {
    if (section.getBoundingClientRect().top > offset) break;
    category = section.id;
  }
  if (category === visibleCategory) return;
  visibleCategory = category;
  highlightCategory();
}

async function applyRoute({ scroll = false, animate = false, focus = false } = {}) {
  const version = ++routeVersion;
  stopPageScroll();
  const [groupId, categoryId] = location.hash.slice(1).split("/");
  const nextView = groupId === "obrane" ? "favorites" : groupId === "popular" ? "popular" : "group";
  const nextGroup = catalog.find((group) => group.id === groupId) ?? catalog[0];
  const changedView = nextGroup !== currentGroup || nextView !== view;
  const rerender = changedView
    || selectors.search.value || !selectors.results.querySelector(".menu-card");
  setDrawer(false);
  if (animate && rerender && window.scrollY > 12 && !reducedMotion.matches) {
    const completed = await scrollPageTo(0);
    if (version !== routeVersion) return;
    if (!completed) scroll = false;
  }
  currentGroup = nextGroup;
  view = nextView;
  visibleCategory = currentGroup.categories.find((category) => category.id === categoryId)?.id ?? currentGroup.categories[0]?.id;
  selectors.search.value = "";
  if (rerender) {
    renderCatalog();
    catalogEntrance?.cancel();
    if (animate && !reducedMotion.matches) {
      catalogEntrance = selectors.results.animate(
        [{ opacity: .38, transform: "translateY(9px)" }, { opacity: 1, transform: "none" }],
        { duration: 370, easing: "cubic-bezier(.22, 1, .36, 1)" },
      );
    }
  }
  if (changedView || !selectors.nav.childElementCount) renderNav();
  else highlightCategory();
  if (scroll) {
    if (categoryId && view === "group") {
      const section = document.getElementById(visibleCategory);
      if (section) await scrollPageTo(section, { animate });
    } else {
      await scrollPageTo(0, { animate });
    }
  }
  if (focus && version === routeVersion) selectors.results.parentElement.focus({ preventScroll: true });
}

function openDish(item) {
  detailItem = item;
  const name = escape(item.name);
  const notes = tastingNotes[item.id];
  const allergens = item.allergens?.map((allergen) => String(allergen)).join(", ");
  selectors.detail.innerHTML = `${item.image ? `<img class="dish-dialog__photo" src="${photoPath(item)}" alt="${name}" width="650" height="420">` : ""}
    <div class="dish-dialog__copy">
      <p class="menu-muted">${escape(item.category)}</p>
      <h2 id="dish-dialog-title">${name}</h2><p class="menu-card__price">${price(item)}</p>
      ${notes ? `<p>${escape(notes)}</p>` : ""}${renderMeta(item)}
      ${allergens ? `<p class="menu-muted">Алергени (коди меню): ${escape(allergens)}</p>` : ""}
      ${favoriteButton(item)}
    </div>`;
  selectors.dialog.showModal();
}

function toggleFavorite(item) {
  if (!favorites.delete(item.key)) favorites.add(item.key);
  try {
    localStorage.setItem(storedFavorites, JSON.stringify([...favorites]));
  } catch {
    // Favorites remain usable for the current tab if storage is unavailable.
  }
  if (view === "favorites") renderCatalog();
  selectors.count.textContent = favorites.size || "";
  for (const button of document.querySelectorAll(`[data-save="${CSS.escape(item.key)}"]`)) {
    button.setAttribute("aria-pressed", String(favorites.has(item.key)));
    button.firstElementChild.textContent = favorites.has(item.key) ? "♥" : "♡";
  }
  selectors.status.textContent = favorites.has(item.key) ? "Збережено в обране" : "Видалено з обраного";
}

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (link?.matches(".menu-skip") && isPlainClick(event)) {
    const catalog = selectors.results.parentElement;
    event.preventDefault();
    scrollPageTo(catalog).then((completed) => {
      if (completed) catalog.focus({ preventScroll: true });
    });
    return;
  }
  if (link && (link.closest(".menu-sidebar") || link.closest(".menu-topnav"))
    && isPlainClick(event)) {
    event.preventDefault();
    if (location.hash !== link.getAttribute("href")) history.pushState(null, "", link.getAttribute("href"));
    applyRoute({ scroll: true, animate: true, focus: event.detail === 0 || mobile.matches });
    return;
  }
  const save = event.target.closest("[data-save]");
  if (save) {
    const item = items.get(save.dataset.save);
    if (item) toggleFavorite(item);
    return;
  }
  const card = event.target.closest("[data-dish]");
  if (card) {
    const item = items.get(card.dataset.dish);
    if (item) openDish(item);
    return;
  }
  if (event.target === selectors.dialog) selectors.dialog.close();
  if (!selectors.sidebar.contains(event.target) && !selectors.sections.contains(event.target)) setDrawer(false);
});

selectors.dialog.addEventListener("close", () => {
  if (detailItem && view === "favorites" && !favorites.has(detailItem.key)) selectors.favorites.focus();
  detailItem = undefined;
});
selectors.sections.addEventListener("click", () => setDrawer(!selectors.sidebar.classList.contains("is-open")));
mobile.addEventListener("change", () => setDrawer(false));
selectors.search.addEventListener("input", () => {
  catalogEntrance?.cancel();
  renderCatalog();
  if (window.scrollY > 120) scrollPageTo(0);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && selectors.sidebar.classList.contains("is-open")) setDrawer(false, true);
});
window.addEventListener("hashchange", () => applyRoute({ scroll: true, animate: true }));
window.addEventListener("scroll", () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    categoryFromScroll();
  });
}, { passive: true });

applyRoute({ scroll: Boolean(location.hash) });
