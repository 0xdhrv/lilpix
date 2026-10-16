const DATA = __DATA__;
const {
  P,
  FACES,
  PIECES,
  STAGGER,
  SPRING,
  RIBBON,
  SPLIT,
  PITCH,
  EYE_Z,
  EYE_HX,
  MAX_PIXELS,
  BACKS,
} = DATA;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

const nodes = {};
for (const name of STAGGER) nodes[name] = [...svg.querySelectorAll(`[data-piece="${name}"]`)];
const clips = Object.fromEntries(
  ["board", "display"].map((n) => [n, svg.querySelector(`#lp-in-${n} path`)]),
);
const matrixEl = svg.querySelector('[data-part="matrix"]');
const glassEl = svg.querySelector('[data-part="glass"]');
const ribbonEl = svg.querySelector('[data-part="ribbon"]');
const emitters = [...svg.querySelectorAll("[data-emitter]")];
const lenses = [...svg.querySelectorAll("[data-lens]")];

const springs = Object.fromEntries(
  STAGGER.map((n) => [n, { x: 1, v: 0, target: 1, pending: null }]),
);
let open = true,
  face = 0,
  clock = 0,
  frame = 0,
  last = 0,
  visible = false;
let touring = !still.matches,
  tourClock = -1.4,
  tourStep = 0,
  idleTimer = 0,
  blinkAt = 0;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hsl = (h) => `hsl(${(h * 360).toFixed(0)} 100% 50%)`;
function ledLevel({ mode, speed }, t, i) {
  switch (mode) {
    case "breathe":
      return 0.25 + 0.75 * (0.5 + 0.5 * Math.sin((t * speed + i * 0.15) * Math.PI * 2));
    case "blink":
      return (t * speed) % 1 < 0.5 ? 1 : 0.06;
    case "chase":
      return Math.floor(t * speed) % 3 === i ? 1 : 0.1;
    default:
      return 1;
  }
}
const litOf = (f) => [...f.left, ...f.right].join("").split("#").length - 1;

// Face pixels in half-pixel units, the matrix's own pitch.
function pixelsOf(f) {
  const out = [];
  [f.left, f.right].forEach((rows, eye) => {
    const h = rows.length,
      w = rows[0].length;
    rows.forEach((row, r) =>
      [...row].forEach((cell, c) => {
        if (cell === "#" && out.length < MAX_PIXELS)
          out.push([EYE_HX[eye] + 2 * c - (w - 1), h - 1 - 2 * r]);
      }),
    );
  });
  return out;
}
function drawFace() {
  const px = pixelsOf(FACES[face]);
  const rect = (x, y, s) =>
    `<rect x="${(x - s / 2).toFixed(2)}" y="${(y - s / 2).toFixed(2)}" width="${s}" height="${s}"/>`;
  matrixEl.innerHTML = px
    .map(([hx, hy]) =>
      [-0.5, 0.5]
        .map((dx) =>
          [-0.5, 0.5]
            .map((dy) => rect((hx + dx) * PITCH, -(EYE_Z + (hy + dy) * PITCH), 1.9))
            .join(""),
        )
        .join(""),
    )
    .join("");
  glassEl.innerHTML = px.map(([hx, hy]) => rect(hx * PITCH, -(EYE_Z + hy * PITCH), 4.7)).join("");
  blinkAt = 0.12;
}
// torph forces position: relative on its root, so morph an inner span, not the absolutely placed corner.
const readoutSpan = readout.appendChild(document.createElement("span"));
readout.firstChild.remove();
const readoutMorph = new torph.TextMorph({ element: readoutSpan, duration: 450 });
let readoutText = "";
function say() {
  const f = FACES[face];
  const text = `${f.name} · ${litOf(f)} of ${MAX_PIXELS} px · ${open ? "apart" : "assembled"}`;
  if (text === readoutText) return;
  readoutText = text;
  readoutMorph.update(text);
}

function setOpen(next) {
  if (next === open) return;
  open = next;
  const value = open ? 1 : 0;
  const order = open ? STAGGER : [...STAGGER].reverse();
  const changing = order.filter(
    (n) => (springs[n].pending ? springs[n].pending.value : springs[n].target) !== value,
  );
  order.forEach((n) => (springs[n].pending = null));
  changing.forEach((n, i) => (springs[n].pending = { value, at: clock + i * SPRING.stagger }));
  say();
  run();
}
function setFace(next) {
  face = (next + FACES.length) % FACES.length;
  drawFace();
  say();
  status.textContent = FACES[face].name;
  run();
}

const quad = (y0, y1, x0, x1, z) =>
  pathOf(
    [iso([x0, y0, z], P), iso([x1, y0, z], P), iso([x1, y1, z], P), iso([x0, y1, z], P)],
    true,
  );
const strip = (y0, y1, ends) => {
  if (y1 - y0 < 0.05) return "";
  const { x0, x1, z } = RIBBON;
  const line = (x) => pathOf([iso([x, y0, z], P), iso([x, y1, z], P)]);
  const across = (y) => pathOf([iso([x0, y, z], P), iso([x1, y, z], P)]);
  const caps = (ends[0] ? across(y0) : "") + (ends[1] ? across(y1) : "");
  return `<path class="lp-ribbon" d="${quad(y0, y1, x0, x1, z)}"/><path class="iso-line" data-tone="faint" d="${[24.5, 27, 29.5].map(line).join("")}"/><path class="iso-line" data-tone="hi" d="${line(x0) + line(x1) + caps}"/>`;
};
function place() {
  for (const name of STAGGER) {
    const s = springs[name].x;
    const [dx, dy] = axisVector(P, [0, PIECES[name].move * s, 0]);
    const t = s ? `translate(${dx.toFixed(2)} ${dy.toFixed(2)})` : null;
    for (const el of nodes[name]) {
      if (t) el.setAttribute("transform", t);
      else el.removeAttribute("transform");
    }
    if (clips[name]) {
      const inside = BACKS[name] + PIECES[name].move * s < SPLIT;
      const host = nodes[name][1];
      if (inside) host.setAttribute("clip-path", `url(#lp-in-${name})`);
      else host.removeAttribute("clip-path");
      if (t)
        clips[name].setAttribute("transform", `translate(${(-dx).toFixed(2)} ${(-dy).toFixed(2)})`);
      else clips[name].removeAttribute("transform");
    }
  }
  const from = RIBBON.from + PIECES.board.move * springs.board.x;
  const to = RIBBON.to + PIECES.display.move * springs.display.x;
  const split = Math.min(Math.max(from, SPLIT), to);
  ribbonEl.innerHTML = `<g clip-path="url(#lp-in-ribbon)">${strip(from, split, [true, split >= to])}</g>${strip(split, to, [split <= from, true])}`;
}
function leds(t) {
  const { leds: L } = FACES[face];
  const seen = 1 - smooth(0.02, 0.3, springs.cover.x);
  for (let i = 0; i < 3; i++) {
    const color = L.mode === "rainbow" ? hsl((t * L.speed + i / 3) % 1) : L.colors[i];
    const level = still.matches ? 1 : ledLevel(L, t, i);
    emitters[i].style.fill = color;
    emitters[i].style.fillOpacity = (0.2 + 0.8 * level).toFixed(2);
    lenses[i].style.fill = color;
    lenses[i].style.fillOpacity = ((0.15 + 0.85 * level) * seen).toFixed(2);
  }
  glassEl.style.opacity = seen.toFixed(3);
  // Blink every 4 s and squash shut on a new face, as the 3D bot does.
  const shut = blinkAt > 0 || (!still.matches && t % 4 > 3.85);
  const sy = shut ? 0.1 : 1;
  const tr = `translate(0 ${-EYE_Z}) scale(1 ${sy}) translate(0 ${EYE_Z})`;
  matrixEl.setAttribute("transform", tr);
  glassEl.setAttribute("transform", tr);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  blinkAt = Math.max(0, blinkAt - dt);
  if (touring) {
    tourClock += dt;
    if (tourClock >= 2.4) {
      tourClock = 0;
      tourStep++;
      if (tourStep % 4 === 0) setOpen(!open);
      else setFace(face + 1);
    }
  }
  for (const name of STAGGER) {
    const s = springs[name];
    if (s.pending && clock >= s.pending.at) {
      s.target = s.pending.value;
      s.pending = null;
    }
    if (still.matches) {
      s.x = s.target;
      s.v = 0;
    } else
      for (let i = 0; i < SPRING.substeps; i++) {
        const h = dt / SPRING.substeps;
        s.v += ((s.target - s.x) * SPRING.stiffness - s.v * SPRING.damping) * h;
        s.x += s.v * h;
      }
    if (Math.abs(s.target - s.x) < 5e-4 && Math.abs(s.v) < 5e-4) {
      s.x = s.target;
      s.v = 0;
    }
  }
  place();
  leds(clock);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}
function takeOver() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    tourClock = 0;
    run();
  }, 3600);
}

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);
stage.addEventListener("pointerenter", () => {
  if (!finePointer.matches) return;
  takeOver();
  setOpen(false);
});
stage.addEventListener("pointerleave", () => {
  if (!finePointer.matches) return;
  takeOver();
  setOpen(true);
});
stage.addEventListener("click", () => {
  takeOver();
  setFace(face + 1);
  stage.focus({ preventScroll: true });
});
stage.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key;
  let handled = true;
  if (key === " " || key === "Enter") setOpen(!open);
  else if (key === "ArrowRight" || key === "ArrowDown") setFace(face + 1);
  else if (key === "ArrowLeft" || key === "ArrowUp") setFace(face - 1);
  else if (/^[1-9]$/.test(key)) setFace(Number(key) - 1);
  else handled = false;
  if (handled) {
    event.preventDefault();
    takeOver();
  }
});
drawFace();
place();
leds(0);
say();
