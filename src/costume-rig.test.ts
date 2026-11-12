import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from "three";
import { describe, expect, it } from "vite-plus/test";
import { Rig, toBot, type PartInfo } from "./costume-rig.ts";

// Bot z from 6 to 6 + lift has no point in logo units, so these keep clear of it.
const POSITIONS = [0, 0, 0, 1, -2, 1.5, -3, 4, -3.9, 2, 1, 7.5, -1, 0, -9];

const PARTS: [string, PartInfo][] = [
  ["pivot at the head's center", { at: [0, 0, 0], origin: [0, 0, 0] }],
  ["pivot off center", { at: toBot([10, -20, 12]), origin: [10, -20, 12] }],
  ["uniform part", { at: toBot([5, 5, -45]), origin: [5, 5, -45], uniform: true }],
];

function rigged(info: PartInfo) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(POSITIONS, 3));
  const group = new Group();
  group.add(new Mesh(geometry));
  const rig = new Rig();
  rig.define("part", info);
  rig.attach("part", group);
  return { rig, geometry };
}

const positions = (geometry: BufferGeometry) => [...geometry.getAttribute("position").array];

describe("Rig.deform", () => {
  it.each(PARTS)("leaves a %s in place when nothing moves", (_, info) => {
    const { rig, geometry } = rigged(info);
    rig.deform("part", () => {});
    positions(geometry).forEach((value, i) => expect(value).toBeCloseTo(POSITIONS[i], 4));
  });
});
