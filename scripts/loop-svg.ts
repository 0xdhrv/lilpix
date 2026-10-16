// Writes public/lilpix-loop.svg: the bot's face cycling through every
// expression, for the README and the about page. Pure SVG + SMIL, no scripts,
// so it plays inside a GitHub <img>.
//
// Run with `pnpm loop` after changing src/expressions.ts.

import { writeFileSync } from "node:fs";
import { EXPRESSION_NAMES, eyeGrids, ledsFor } from "../src/expressions.ts";

// Geometry from Bot.tsx, in the same units, with y flipped to point down.
const PIXEL = 0.86;
const EYES = [-2.58, 2.65];
const EYES_Y = 0.95;
const SLOTS = [-6.16, -3.5, -0.88];
const LED_Y = -6.2;

const HOLD = 1.1; // seconds per expression
const SQUASH = 0.12; // seconds the eyes spend shut between expressions
const BOB = 3; // seconds per float cycle
const DUR = EXPRESSION_NAMES.length * HOLD;

const n = (v: number) => +v.toFixed(4);
const t = (s: number) => n(s / DUR);

// Path data for one eye. Pixels overlap a hair so no seams show between them.
function eyePixels(rows: string[], cx: number) {
  const h = rows.length;
  const w = rows[0].length;
  const size = PIXEL + 0.02;
  const cells: string[] = [];
  rows.forEach((row, r) =>
    row.split("").forEach((cell, c) => {
      if (cell !== "#") return;
      const x = cx + (c - (w - 1) / 2) * PIXEL - PIXEL / 2;
      const y = EYES_Y + (r - (h - 1) / 2) * PIXEL - PIXEL / 2;
      cells.push(`M${n(x - 0.01)} ${n(y - 0.01)}h${size}v${size}h-${size}z`);
    }),
  );
  return cells.join("");
}

// One path per expression, shown only during its slot.
const faces = EXPRESSION_NAMES.map((name, i) => {
  const [left, right] = eyeGrids(name);
  const start = t(i * HOLD);
  const end = t((i + 1) * HOLD);
  const values = i === 0 ? "1;0" : "0;1;0";
  const keyTimes = i === 0 ? `0;${end}` : `0;${start};${end}`;
  return (
    `<path opacity="${i === 0 ? 1 : 0}" d="${eyePixels(left, EYES[0])}${eyePixels(right, EYES[1])}">` +
    `<animate attributeName="opacity" dur="${DUR}s" repeatCount="indefinite" calcMode="discrete" values="${values}" keyTimes="${keyTimes}"/>` +
    `</path>`
  );
}).join("\n    ");

// Eyes squash shut at every change, then pop open, like Bot.tsx does.
const squash = (() => {
  const times = ["0"];
  const values = ["1 1"];
  EXPRESSION_NAMES.forEach((_, i) => {
    const end = (i + 1) * HOLD;
    times.push(`${t(end - SQUASH)}`, `${t(end - SQUASH / 2)}`);
    values.push("1 1", "1 0.08");
    if (i < EXPRESSION_NAMES.length - 1) {
      times.push(`${t(end + SQUASH / 2)}`);
      values.push("1 1");
    }
  });
  times.push("1");
  values.push("1 1");
  return `<animateTransform attributeName="transform" type="scale" dur="${DUR}s" repeatCount="indefinite" values="${values.join(";")}" keyTimes="${times.join(";")}"/>`;
})();

// Each LED steps through the expression colors, with a soft glow behind it.
const leds = SLOTS.map((x, led) => {
  const colors = EXPRESSION_NAMES.map((name) => ledsFor(name).colors[led]);
  const keyTimes = EXPRESSION_NAMES.map((_, i) => t(i * HOLD)).join(";");
  const fill = `<animate attributeName="fill" dur="${DUR}s" repeatCount="indefinite" calcMode="discrete" values="${colors.join(";")}" keyTimes="${keyTimes}"/>`;
  const pulse = `<animate attributeName="opacity" dur="1.6s" begin="${n(led * 0.2)}s" repeatCount="indefinite" values="0.75;1;0.75" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>`;
  return (
    `<rect x="${n(x - 0.875)}" y="${n(LED_Y - 0.875)}" width="1.75" height="1.75" fill="#000"/>` +
    `<rect x="${n(x - 1.1)}" y="${n(LED_Y - 1.1)}" width="2.2" height="2.2" filter="url(#glow)" fill="${colors[0]}">${fill}${pulse}</rect>` +
    `<rect x="${n(x - 0.55)}" y="${n(LED_Y - 0.55)}" width="1.1" height="1.1" fill="${colors[0]}">${fill}</rect>`
  );
}).join("\n    ");

const ease = `calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="-24 -12 48 24" role="img" aria-label="lilpix, a cube robot with a pixel face, cycling through ${EXPRESSION_NAMES.length} expressions">
  <title>lilpix</title>
  <defs>
    <filter id="glow" x="-150%" y="-150%" width="400%" height="400%">
      <feGaussianBlur stdDeviation="0.7"/>
    </filter>
    <linearGradient id="body" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#3a393b"/>
      <stop offset="1" stop-color="#262526"/>
    </linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1c1c1f"/>
      <stop offset="0.4" stop-color="#050506"/>
    </linearGradient>
    <radialGradient id="shadow">
      <stop offset="0" stop-color="#000" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <ellipse cx="0" cy="10.4" rx="9" ry="1.1" fill="url(#shadow)">
    <animate attributeName="rx" dur="${BOB}s" repeatCount="indefinite" values="9;7.6;9" ${ease}/>
  </ellipse>

  <g>
    <animateTransform attributeName="transform" type="translate" dur="${BOB}s" repeatCount="indefinite" values="0 0;0 -0.9;0 0" ${ease}/>
    <rect x="-8.85" y="-7" width="17.7" height="14" rx="0.35" fill="#1f1e1f"/>
    <rect x="-7.9" y="-7.9" width="15.8" height="15.8" rx="0.35" fill="url(#body)"/>
    <rect x="-7.9" y="-7.9" width="15.8" height="15.8" rx="0.35" fill="none" stroke="#fff" stroke-opacity="0.07" stroke-width="0.12"/>
    <rect x="-7.1" y="-3.5" width="14.2" height="9.8" rx="0.2" fill="url(#screen)"/>

    ${leds}

    <g transform="translate(0 ${EYES_Y})">
      <g>
        ${squash}
        <g transform="translate(0 ${-EYES_Y})" fill="#f2f2f2" shape-rendering="crispEdges">
    ${faces}
        </g>
      </g>
    </g>
  </g>
</svg>
`;

writeFileSync(new URL("../public/lilpix-loop.svg", import.meta.url), svg);
console.log(
  `public/lilpix-loop.svg: ${EXPRESSION_NAMES.length} expressions, ${DUR.toFixed(1)}s loop`,
);
