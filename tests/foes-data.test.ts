import { describe, expect, it } from "vitest";
import { assertAlliterativeName } from "../src/lib/alliteration.js";
import { FOES } from "../src/data/foes-data.js";
import { heroLabelFromFoeName } from "../src/lib/game-logic.js";
import { assertHeroPickerOrderCovers } from "../src/lib/hero-groups.js";

describe("foes roster", () => {
  it("has unique emojis and ids", () => {
    const emojis = new Set<string>();
    const ids = new Set<string>();
    for (const foe of FOES) {
      expect(emojis.has(foe.emoji), `${foe.name} duplicate emoji`).toBe(false);
      expect(ids.has(foe.id), `${foe.id} duplicate id`).toBe(false);
      emojis.add(foe.emoji);
      ids.add(foe.id);
    }
  });

  it("uses alliterative two-word names", () => {
    for (const foe of FOES) {
      expect(() => assertAlliterativeName(foe.name)).not.toThrow();
    }
  });

  it("has sensible combat baselines", () => {
    for (const foe of FOES) {
      expect(foe.baseHp).toBeGreaterThan(0);
      expect(foe.baseAtk).toBeGreaterThan(0);
      expect(foe.id.length).toBeGreaterThan(0);
      expect(foe.name.trim()).toBe(foe.name);
    }
  });

  it("derives hero labels from foe names", () => {
    for (const foe of FOES) {
      const label = heroLabelFromFoeName(foe.name);
      expect(label.length).toBeGreaterThan(0);
      expect(foe.name).toContain(label);
    }
  });

  it("matches hero picker order to roster emojis", () => {
    expect(() =>
      assertHeroPickerOrderCovers(FOES.map((f) => f.emoji))
    ).not.toThrow();
  });

  it("includes renamed critters", () => {
    expect(FOES.find((f) => f.id === "shrill-shrimp")?.name).toBe("Skrill Skrimp");
    expect(FOES.find((f) => f.id === "cursed-cockroach")?.name).toBe(
      "Rotten Roach"
    );
  });

  it("has a large roster for campaign variety", () => {
    expect(FOES.length).toBeGreaterThanOrEqual(100);
  });
});
