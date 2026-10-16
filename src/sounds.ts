import { defineSound, ensureReady, type Layer } from "@web-kits/audio";
import type { ExpressionName } from "./expressions.ts";

// Small chiptune motifs to match the pixel-art eyes. Notes in Hz.
const C4 = 261.63;
const EB4 = 311.13;
const G4 = 392;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.5;
const G6 = 1568;

const note = (
  frequency: number,
  delay: number,
  type: "square" | "triangle" = "square",
  decay = 0.12,
): Layer => ({
  source: { type, frequency },
  envelope: { attack: 0.005, decay },
  gain: type === "square" ? 0.12 : 0.25,
  delay,
});

const SOUNDS: Record<ExpressionName, () => void> = {
  neutral: defineSound(note(A5, 0, "square", 0.07)),

  happy: defineSound({
    layers: [note(C5, 0), note(E5, 0.07), note(G5, 0.14), note(C6, 0.21, "square", 0.25)],
    effects: [{ type: "reverb", decay: 0.6, mix: 0.15 }],
  }),

  surprised: defineSound({
    layers: [
      {
        source: { type: "sine", frequency: { start: 300, end: 1400 } },
        envelope: { decay: 0.22 },
        gain: 0.35,
      },
      note(E6, 0.16, "triangle", 0.1),
    ],
  }),

  sleepy: defineSound({
    source: { type: "triangle", frequency: { start: 420, end: 160 } },
    filter: { type: "lowpass", frequency: 900 },
    envelope: { attack: 0.15, decay: 0.9 },
    gain: 0.35,
    effects: [{ type: "tremolo", rate: 3, depth: 0.6 }],
  }),

  angry: defineSound({
    layers: [
      { source: { type: "sawtooth", frequency: 98 }, envelope: { decay: 0.35 }, gain: 0.2 },
      {
        source: { type: "sawtooth", frequency: 104, detune: 15 },
        envelope: { decay: 0.35 },
        gain: 0.2,
      },
    ],
    effects: [
      { type: "distortion", amount: 40 },
      { type: "bitcrusher", bits: 5 },
    ],
  }),

  sad: defineSound({
    layers: [
      note(G4, 0, "triangle", 0.25),
      note(EB4, 0.22, "triangle", 0.25),
      note(C4, 0.44, "triangle", 0.6),
    ],
    effects: [
      { type: "vibrato", rate: 5, depth: 0.004 },
      { type: "reverb", decay: 1.2, mix: 0.25 },
    ],
  }),

  love: defineSound({
    layers: [
      {
        source: { type: "sine", frequency: { start: 140, end: 60 } },
        envelope: { decay: 0.12 },
        gain: 0.6,
      },
      {
        source: { type: "sine", frequency: { start: 140, end: 60 } },
        envelope: { decay: 0.12 },
        gain: 0.5,
        delay: 0.14,
      },
      note(E6, 0.32, "triangle", 0.2),
      note(G6, 0.4, "triangle", 0.3),
    ],
    effects: [{ type: "reverb", decay: 0.8, mix: 0.2 }],
  }),

  dizzy: defineSound({
    source: { type: "sine", frequency: 620 },
    envelope: { attack: 0.02, decay: 0.7 },
    gain: 0.3,
    lfo: { type: "sine", frequency: 9, depth: 220, target: "frequency" },
    effects: [{ type: "delay", time: 0.12, feedback: 0.35, mix: 0.3 }],
  }),

  laughing: defineSound({
    layers: [0, 0.13, 0.26, 0.39].map((delay, i) => note(G5 - i * 60, delay, "square", 0.08)),
  }),

  excited: defineSound({
    layers: [C5, E5, G5, C6, E6, G6].map((f, i) => note(f, i * 0.045, "square", 0.09)),
    effects: [{ type: "reverb", decay: 0.7, mix: 0.2 }],
  }),

  crying: defineSound({
    source: { type: "triangle", frequency: { start: 620, end: 300 } },
    envelope: { attack: 0.05, decay: 0.9 },
    gain: 0.3,
    lfo: { type: "sine", frequency: 7, depth: 30, target: "frequency" },
    effects: [{ type: "reverb", decay: 1.2, mix: 0.3 }],
  }),

  cool: defineSound({
    layers: [
      { source: { type: "sawtooth", frequency: 82 }, envelope: { decay: 0.25 }, gain: 0.18 },
      {
        source: { type: "sawtooth", frequency: 110 },
        envelope: { decay: 0.3 },
        gain: 0.18,
        delay: 0.16,
      },
      note(E6, 0.32, "triangle", 0.25),
    ],
    filter: { type: "lowpass", frequency: 1800 },
  }),

  confused: defineSound({
    layers: [
      {
        source: { type: "sine", frequency: { start: 320, end: 560 } },
        envelope: { decay: 0.18 },
        gain: 0.35,
      },
      {
        source: { type: "sine", frequency: { start: 560, end: 380 } },
        envelope: { decay: 0.22 },
        gain: 0.3,
        delay: 0.18,
      },
    ],
  }),

  skeptical: defineSound({
    source: { type: "triangle", frequency: { start: 200, end: 170 } },
    filter: { type: "lowpass", frequency: 700 },
    envelope: { attack: 0.04, decay: 0.45 },
    gain: 0.4,
    effects: [{ type: "tremolo", rate: 12, depth: 0.5 }],
  }),

  wink: defineSound({
    layers: [note(A5, 0, "square", 0.06), note(E6, 0.07, "square", 0.14)],
  }),
};

export function playExpression(name: ExpressionName) {
  // Browsers keep the AudioContext suspended until a user gesture.
  void ensureReady().then(() => SOUNDS[name]());
}
