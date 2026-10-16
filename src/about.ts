import "./about.css";
import { EXPRESSION_NAMES, eyeGrids, ledsFor } from "./expressions.ts";

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
