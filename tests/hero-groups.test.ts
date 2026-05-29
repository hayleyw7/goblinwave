import { describe, expect, it } from "vitest";
import { FOES } from "../src/data/foes-data.js";
import {
  assertHeroPickerOrderCovers,
  HERO_PICKER_ORDER,
  heroPickerOrderIndex,
} from "../src/lib/hero-groups.js";

describe("HERO_PICKER_ORDER", () => {
  it("has no duplicate emojis", () => {
    const seen = new Set<string>();
    for (const emoji of HERO_PICKER_ORDER) {
      expect(seen.has(emoji)).toBe(false);
      seen.add(emoji);
    }
  });
});

describe("assertHeroPickerOrderCovers", () => {
  it("accepts the production foe roster", () => {
    expect(() =>
      assertHeroPickerOrderCovers(FOES.map((f) => f.emoji))
    ).not.toThrow();
  });

  it("throws when roster emoji is missing from picker", () => {
    expect(() => assertHeroPickerOrderCovers(["🐱", "🐶"])).toThrow(
      /missing emoji/i
    );
  });

  it("throws when picker has emoji not in roster", () => {
    const rosterEmoji = FOES[0]!.emoji;
    expect(() => assertHeroPickerOrderCovers([rosterEmoji])).toThrow(
      /not in foe roster/i
    );
  });

});

describe("heroPickerOrderIndex", () => {
  it("returns stable indices for known emojis", () => {
    expect(heroPickerOrderIndex("🐱")).toBe(0);
    expect(heroPickerOrderIndex("🐰")).toBe(8);
  });

  it("sorts unknown emojis last", () => {
    expect(heroPickerOrderIndex("🐱")).toBeLessThan(
      heroPickerOrderIndex("not-an-emoji")
    );
  });
});
