import { describe, expect, it } from "vite-plus/test";
import { COSTUME_NAMES, costumeLoader } from "./costumes.ts";

describe("costumeLoader", () => {
  it.each(COSTUME_NAMES)("loads %s", async (name) => {
    const data = await costumeLoader(name)();
    expect(Array.isArray(data.groups)).toBe(true);
    expect(Array.isArray(data.sprites)).toBe(true);
  });
});
