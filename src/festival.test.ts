import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { festivalCostume } from "./festival.ts";

// Local dates, as the festival calendar is.
const DIWALI = new Date(2026, 10, 8, 9);
const PLAIN_DAY = new Date(2026, 10, 20, 9);

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe("festivalCostume", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("has nothing on a plain day", () => {
    expect(festivalCostume(PLAIN_DAY)).toBeNull();
  });

  it("dresses up once per festival day", () => {
    expect(festivalCostume(DIWALI)).toBe("diwali");
    expect(festivalCostume(new Date(2026, 10, 8, 22))).toBeNull();
    expect(festivalCostume(new Date(2026, 10, 10, 9))).toBe("bestu-varas");
  });

  it("dresses up every visit when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(festivalCostume(DIWALI)).toBe("diwali");
    expect(festivalCostume(DIWALI)).toBe("diwali");
  });
});
