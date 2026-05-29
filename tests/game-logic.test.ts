import { describe, expect, it } from "vitest";
import { FOES } from "../src/data/foes-data.js";
import {
  buildFoeOrder,
  CAMPAIGN_WAVE_COUNT,
  canFleeWave,
  DEFEAT_VERBS,
  effectiveAttack,
  foeColorConflictsWithHero,
  foesForHero,
  formatFoeInText,
  formatSetupBlockerMessage,
  getSetupBlockers,
  heroLabelFromFoeName,
  HERO_NAME_MAX_LENGTH,
  hypeAttackBonus,
  makeFoeForWave,
  makeFoeFromTemplate,
  nextDefeatVerb,
  normalizeHeroName,
  pickFoeFromOrder,
  pickFoeTemplateIndex,
  randomDamage,
  randomHeal,
  restoreFoeOrder,
  scaleFoeAttack,
  scaleFoeHp,
  shuffleArray,
} from "../src/lib/game-logic.js";

const SAMPLE_FOES = [
  { id: "a", name: "Angry Ant", emoji: "🐜", baseHp: 8, baseAtk: 2 },
  { id: "b", name: "Brave Bear", emoji: "🐻", baseHp: 12, baseAtk: 3 },
  { id: "c", name: "Clever Cat", emoji: "🐱", baseHp: 10, baseAtk: 3 },
] as const;

describe("heroLabelFromFoeName", () => {
  it("uses the noun half of alliterative names", () => {
    expect(heroLabelFromFoeName("Rabid Rabbit")).toBe("Rabbit");
    expect(heroLabelFromFoeName("Skrill Skrimp")).toBe("Skrimp");
  });

  it("falls back to the only word when needed", () => {
    expect(heroLabelFromFoeName("Solo")).toBe("Solo");
  });
});

describe("foesForHero", () => {
  it("excludes the hero emoji from the roster", () => {
    const roster = foesForHero(SAMPLE_FOES, "🐱");
    expect(roster).toHaveLength(2);
    expect(roster.every((f) => f.emoji !== "🐱")).toBe(true);
  });

  it("returns a full copy when hero emoji is not in roster", () => {
    expect(foesForHero(SAMPLE_FOES, "🦄")).toHaveLength(3);
  });
});

describe("shuffleArray", () => {
  it("is deterministic with a seeded random", () => {
    const makeSeededRandom = () => {
      const values = [0.9, 0.1, 0.5];
      let i = 0;
      return () => values[i++ % values.length]!;
    };
    expect(shuffleArray(["a", "b", "c"], makeSeededRandom())).toEqual(
      shuffleArray(["a", "b", "c"], makeSeededRandom())
    );
  });

  it("preserves all items", () => {
    const shuffled = shuffleArray([1, 2, 3, 4], () => 0.25);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("buildFoeOrder", () => {
  it("never includes the hero emoji", () => {
    const order = buildFoeOrder(SAMPLE_FOES, "🐻", () => 0.5);
    expect(order.some((f) => f.emoji === "🐻")).toBe(false);
  });
});

describe("restoreFoeOrder", () => {
  it("restores a valid saved order", () => {
    const hero = "🐱";
    const expected = foesForHero(SAMPLE_FOES, hero);
    const ids = [...expected].reverse().map((f) => f.id);
    const restored = restoreFoeOrder(ids, hero, SAMPLE_FOES, () => 0);
    expect(restored.map((f) => f.id)).toEqual(ids);
  });

  it("rebuilds when ids are missing or invalid", () => {
    const hero = "🐱";
    const rebuilt = restoreFoeOrder(["nope"], hero, SAMPLE_FOES, () => 0);
    expect(rebuilt).toHaveLength(foesForHero(SAMPLE_FOES, hero).length);
  });

  it("rebuilds when saved order includes hero emoji foe", () => {
    const hero = "🐱";
    const badIds = ["a", "c", "c"];
    const rebuilt = restoreFoeOrder(badIds, hero, SAMPLE_FOES, () => 0);
    expect(rebuilt).toHaveLength(2);
  });
});

describe("wave scaling", () => {
  it("scales hp by wave", () => {
    expect(scaleFoeHp(10, 1)).toBe(10);
    expect(scaleFoeHp(10, 3)).toBe(14);
    expect(scaleFoeHp(10, 5)).toBe(18);
  });

  it("scales attack every 3 waves", () => {
    expect(scaleFoeAttack(3, 1)).toBe(3);
    expect(scaleFoeAttack(3, 3)).toBe(3);
    expect(scaleFoeAttack(3, 4)).toBe(4);
    expect(scaleFoeAttack(3, 7)).toBe(5);
  });

  it("builds wave foes from order", () => {
    const order = foesForHero(SAMPLE_FOES, "🐱");
    const wave1 = makeFoeForWave(order, 1);
    const wave4 = makeFoeForWave(order, 4);
    expect(wave1.name).toBe(order[0]!.name);
    expect(wave4.hp).toBeGreaterThan(wave1.hp);
    expect(wave4.attack).toBeGreaterThanOrEqual(wave1.attack);
  });

  it("cycles templates when waves exceed roster size", () => {
    const order = foesForHero(SAMPLE_FOES, "🐜");
    const waves = [1, 2, 3, 4].map((w) => pickFoeFromOrder(order, w).id);
    expect(waves[2]).toBe(waves[0]);
    expect(waves[3]).toBe(waves[1]);
  });

  it("throws when foe order is empty", () => {
    expect(() => pickFoeTemplateIndex(1, 0)).toThrow(/empty/i);
  });
});

describe("normalizeHeroName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeHeroName("  Spaced   Out  ")).toBe("Spaced Out");
  });

  it("truncates to max length", () => {
    const long = "a".repeat(HERO_NAME_MAX_LENGTH + 10);
    expect(normalizeHeroName(long)).toHaveLength(HERO_NAME_MAX_LENGTH);
  });

  it("returns empty for blank input", () => {
    expect(normalizeHeroName("   ")).toBe("");
  });
});

describe("setup blockers", () => {
  it("blocks when critter or name missing", () => {
    expect(getSetupBlockers(null, "")).toEqual([
      "pick a critter",
      "enter your name",
    ]);
    expect(getSetupBlockers("🐱", "")).toEqual(["enter your name"]);
    expect(getSetupBlockers(null, "Pat")).toEqual(["pick a critter"]);
  });

  it("allows fight when ready", () => {
    expect(getSetupBlockers("🐱", "Pat")).toEqual([]);
  });

  it("formats blocker messages", () => {
    expect(formatSetupBlockerMessage([])).toBe("");
    expect(formatSetupBlockerMessage(["enter your name"])).toBe(
      "To fight, enter your name."
    );
    expect(
      formatSetupBlockerMessage(["pick a critter", "enter your name"])
    ).toBe("To fight, pick a critter and enter your name.");
  });
});

describe("foe color conflicts", () => {
  it("conflicts when hero and foe use the same theme", () => {
    expect(foeColorConflictsWithHero("green", "green")).toBe(true);
    expect(foeColorConflictsWithHero("green", "amber")).toBe(false);
    expect(foeColorConflictsWithHero("rose", "rose")).toBe(true);
    expect(foeColorConflictsWithHero("sky", "amber")).toBe(false);
  });
});

describe("formatFoeInText", () => {
  it("substitutes foe name placeholders", () => {
    expect(formatFoeInText("{foe} boos loudly.", "Rotten Roach")).toBe(
      "Rotten Roach boos loudly."
    );
    expect(formatFoeInText("{foe} and {foe}", "X")).toBe("X and X");
  });
});

describe("defeat verbs", () => {
  it("cycles through verbs", () => {
    let index = 0;
    const first = nextDefeatVerb(index);
    expect(first.verb).toBe(DEFEAT_VERBS[0]);
    const second = nextDefeatVerb(first.nextIndex);
    expect(second.verb).toBe(DEFEAT_VERBS[1]);
  });

  it("wraps at end of list", () => {
    const wrapped = nextDefeatVerb(DEFEAT_VERBS.length);
    expect(wrapped.verb).toBe(DEFEAT_VERBS[0]);
  });
});

describe("combat math", () => {
  it("rolls damage between 1 and max inclusive", () => {
    expect(randomDamage(5, () => 0)).toBe(1);
    expect(randomDamage(5, () => 0.99)).toBe(5);
  });

  it("rolls heal between 1 and max inclusive", () => {
    expect(randomHeal(3, () => 0)).toBe(1);
    expect(randomHeal(3, () => 0.99)).toBe(3);
  });

  it("rejects invalid damage max", () => {
    expect(() => randomDamage(0, () => 0.5)).toThrow(/at least 1/i);
  });

  it("adds hype to attack", () => {
    expect(hypeAttackBonus(0)).toBe(0);
    expect(hypeAttackBonus(2)).toBe(2);
    expect(hypeAttackBonus(-1)).toBe(0);
    expect(effectiveAttack(5, 2)).toBe(7);
  });
});

describe("canFleeWave", () => {
  it("blocks fleeing on the final wave", () => {
    expect(canFleeWave(CAMPAIGN_WAVE_COUNT)).toBe(false);
    expect(canFleeWave(CAMPAIGN_WAVE_COUNT - 1)).toBe(true);
  });
});

describe("production roster smoke", () => {
  it("builds a full foe order for default hero", () => {
    const order = buildFoeOrder(FOES, "🐱", () => 0.5);
    expect(order.length).toBe(FOES.length - 1);
  });
});
