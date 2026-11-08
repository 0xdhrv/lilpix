import { describe, expect, it } from "vite-plus/test";
import { COSTUME_NAMES, costumeLoader } from "./costumes.ts";

describe("costumeLoader", () => {
  it.each(COSTUME_NAMES)("loads %s", async (name) => {
    const load = costumeLoader(name);
    expect(load).toBeTypeOf("function");
    const data = await load();
    expect(Array.isArray(data.groups)).toBe(true);
    expect(Array.isArray(data.sprites)).toBe(true);
  });
});
