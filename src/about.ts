import "./about.css";
import "./sweep.ts";
import { EXPRESSION_NAMES, eyeGrids, ledsFor } from "./expressions.ts";

// about/index.html's inline script applies the theme before first paint.
const dark = matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  let saved: unknown = null;
  try {
    saved = JSON.parse(localStorage.getItem("lilpix:theme") ?? "null");
  } catch {}
  document.documentElement.dataset.theme =
    saved === "light" || saved === "dark" ? saved : dark.matches ? "dark" : "light";
  syncThemeButton();
}

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
  } catch {}
  applyTheme();
});
syncThemeButton();

addEventListener("storage", (event) => {
  if (event.key === "lilpix:theme" || event.key === null) applyTheme();
});
dark.addEventListener("change", applyTheme);

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

// A second, hidden copy makes the -50% carousel loop seamless.
const copies = [...list.children].map((item) => {
  const copy = item.cloneNode(true) as HTMLElement;
  copy.setAttribute("aria-hidden", "true");
  return copy;
});
list.append(...copies);
list.style.setProperty("--duration", `${EXPRESSION_NAMES.length * 3}s`);

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

if (import.meta.env.DEV) void import("./dev-agentation.tsx");
