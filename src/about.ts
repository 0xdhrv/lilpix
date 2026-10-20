import "./about.css";
import "./sweep.ts";
import { EXPRESSION_NAMES, eyeGrids, ledsFor } from "./expressions.ts";

// Keep the theme in step with the app: the inline script in about/index.html
// applies it before first paint; this follows changes made in other tabs and
// changes to the system theme while nothing is saved.
const dark = matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  let saved: unknown = null;
  try {
    saved = JSON.parse(localStorage.getItem("lilpix:theme") ?? "null");
  } catch {
    // Storage blocked or unreadable: follow the system.
  }
  document.documentElement.dataset.theme =
    saved === "light" || saved === "dark" ? saved : dark.matches ? "dark" : "light";
  syncThemeButton();
}

// Nav toggle: same storage key as the app, so the choice carries over.
const themeButton = document.getElementById("theme") as HTMLButtonElement;
function syncThemeButton() {
  themeButton.setAttribute(
    "aria-pressed",
    String(document.documentElement.dataset.theme === "dark"),
  );
}
themeButton.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("lilpix:theme", JSON.stringify(next));
  } catch {
    // Storage blocked: the choice just won't carry over.
  }
  applyTheme();
});
syncThemeButton();

addEventListener("storage", (event) => {
  if (event.key === "lilpix:theme" || event.key === null) applyTheme();
});
dark.addEventListener("change", applyTheme);

// Fill the expression gallery from the same data the 3D bot uses, so the
// about page never drifts from the app.

function eye(rows: string[]) {
  const grid = document.createElement("span");
  grid.className = "eye";
  grid.style.gridTemplateColumns = `repeat(${rows[0].length}, var(--px))`;
  for (const cell of rows.join("")) {
    const pixel = document.createElement("i");
    if (cell === "#") pixel.className = "on";
    grid.append(pixel);
  }
  return grid;
}

const list = document.getElementById("faces")!;

EXPRESSION_NAMES.forEach((name, i) => {
  const [left, right] = eyeGrids(name);

  const screen = document.createElement("span");
  screen.className = "screen";
  screen.append(eye(left), eye(right));

  const leds = document.createElement("span");
  leds.className = "leds";
  for (const color of ledsFor(name).colors) {
    const led = document.createElement("i");
    led.style.setProperty("--c", color);
    leds.append(led);
  }

  const label = document.createElement("span");
  label.className = "name";
  label.textContent = name;

  const item = document.createElement("li");
  item.append(leds, screen, label);
  if (i < 9) {
    const key = document.createElement("kbd");
    key.textContent = String(i + 1);
    item.append(key);
  }
  list.append(item);
});

// Infinite carousel: a second, hidden copy makes the -50% loop seamless.
// Speed stays constant however many expressions there are.
const copies = [...list.children].map((item) => {
  const copy = item.cloneNode(true) as HTMLElement;
  copy.setAttribute("aria-hidden", "true");
  return copy;
});
list.append(...copies);
list.style.setProperty("--duration", `${EXPRESSION_NAMES.length * 3}s`);

// Hero face: cycles on its own, and on click. Reduced motion keeps it still until clicked.
const moodScreen = document.getElementById("mood-screen")!;
let mood = 0;
function showMood() {
  const [left, right] = eyeGrids(EXPRESSION_NAMES[mood]);
  moodScreen.replaceChildren(eye(left), eye(right));
}
function nextMood() {
  mood = (mood + 1) % EXPRESSION_NAMES.length;
  showMood();
}
showMood();
let timer: number | undefined;
function autoCycle() {
  clearInterval(timer);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(nextMood, 2200);
}
autoCycle();
document.getElementById("mood")!.addEventListener("click", () => {
  nextMood();
  autoCycle();
});

// The teardown figure is same-origin: size the iframe to its content so it never scrolls.
const anatomy = document.querySelector<HTMLIFrameElement>("iframe.anatomy");
function fitAnatomy() {
  const doc = anatomy?.contentDocument;
  if (!anatomy || !doc?.body || doc.location.href === "about:blank") return;
  const fit = () =>
    (anatomy.style.height = `${Math.ceil(doc.body.getBoundingClientRect().height)}px`);
  new ResizeObserver(fit).observe(doc.body);
  fit();
}
anatomy?.addEventListener("load", fitAnatomy);
if (anatomy?.contentDocument?.readyState === "complete") fitAnatomy();

// Dev-only feedback toolbar; the DEV check lets the bundler drop it from production.
if (import.meta.env.DEV) void import("./dev-agentation.tsx");
