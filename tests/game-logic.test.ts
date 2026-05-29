import { describe, expect, it } from "vitest";
import { FOES } from "../src/data/foes-data.js";
import {
  applyHypeGain,
  buildFoeOrder,
  CAMPAIGN_WAVE_COUNT,
  canFleeWave,
  clampHype,
  DEFEAT_VERBS,
  effectiveAttack,
  foeColorConflictsWithHero,
  foeLevelForTemplate,
  foesForHero,
  formatFoeInText,
  formatHypeLabel,
  formatSetupBlockerMessage,
  getSetupBlockers,
  heroLabelFromFoeName,
  HERO_NAME_MAX_LENGTH,
  hypeAttackBonus,
  hypeHeadroom,
  HYPE_MAX,
  makeFoeForWave,
  makeFoeFromTemplate,
  nextDefeatVerb,
  normalizeHeroName,
  pickFoeFromOrder,
  pickFoeTemplateIndex,
  playerLevelForWave,
  playerStatsForLevel,
  xpProgressForWave,
  xpPercentForWave,
  randomDamage,
  randomHeal,
  restoreFoeOrder,
  scaleFoeAttack,
  scaleFoeHp,
  shuffleArray,
} from "../src/lib/game-logic.js";

const SAMPLE_FOES = [
  { id: "a", name: "Angry Ant", emoji: "🐜", baseHp: 8, baseAtk: 2 },
  { id: "b", name: "Brave Bear", emoji: "🐻", baseHp: 14, baseAtk: 4 },
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

describe("level progression", () => {
  it("maps waves to player levels 1-10", () => {
    expect(playerLevelForWave(1)).toBe(1);
    expect(playerLevelForWave(10)).toBe(1);
    expect(playerLevelForWave(11)).toBe(2);
    expect(playerLevelForWave(21)).toBe(3);
    expect(playerLevelForWave(100)).toBe(10);
  });

  it("scales player stats by level", () => {
    expect(playerStatsForLevel(1)).toEqual({
      level: 1,
      maxHp: 20,
      attack: 5,
      healMax: 3,
    });
    expect(playerStatsForLevel(5).maxHp).toBe(32);
    expect(playerStatsForLevel(10).attack).toBe(14);
    expect(playerStatsForLevel(10).healMax).toBe(12);
  });

  it("tracks xp progress within each 10-wave band", () => {
    expect(xpProgressForWave(1)).toEqual({ current: 0, max: 10 });
    expect(xpPercentForWave(1)).toBe(0);
    expect(xpProgressForWave(10)).toEqual({ current: 9, max: 10 });
    expect(xpPercentForWave(10)).toBe(90);
    expect(xpProgressForWave(11)).toEqual({ current: 0, max: 10 });
    expect(xpPercentForWave(11)).toBe(0);
    expect(xpProgressForWave(20)).toEqual({ current: 9, max: 10 });
    expect(xpPercentForWave(20)).toBe(90);
  });

  it("offsets foe level from roster toughness", () => {
    const easy = SAMPLE_FOES[0]!;
    const hard = SAMPLE_FOES[1]!;
    expect(foeLevelForTemplate(easy, 5)).toBe(1);
    expect(foeLevelForTemplate(hard, 5)).toBe(1);
    expect(foeLevelForTemplate(easy, 21)).toBe(2);
    expect(foeLevelForTemplate(hard, 21)).toBe(4);
  });

  it("softens waves 1-10 with starter band ease", () => {
    const hard = SAMPLE_FOES[1]!;
    const starter = makeFoeFromTemplate(hard, 5);
    const mid = makeFoeFromTemplate(hard, 15);
    expect(starter.level).toBe(1);
    expect(starter.hp).toBeLessThan(mid.hp);
    expect(starter.attack).toBeLessThanOrEqual(mid.attack);
  });
});

describe("wave scaling", () => {
  it("softens level-1 foes for beginners", () => {
    expect(scaleFoeHp(10, 1)).toBe(7);
    expect(scaleFoeAttack(3, 1)).toBe(2);
  });

  it("scales hp and attack by foe level", () => {
    expect(scaleFoeHp(10, 3)).toBe(14);
    expect(scaleFoeAttack(3, 3)).toBe(5);
  });

  it("builds wave foes from order with levels", () => {
    const hard = SAMPLE_FOES[1]!;
    const wave1 = makeFoeFromTemplate(hard, 1);
    const wave21 = makeFoeFromTemplate(hard, 21);
    expect(wave21.level).toBeGreaterThan(wave1.level);
    expect(wave21.hp).toBeGreaterThan(wave1.hp);
    expect(wave21.attack).toBeGreaterThan(wave1.attack);
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
  it("uses beat not the old best typo", () => {
    expect(DEFEAT_VERBS).toContain("beat");
    expect(DEFEAT_VERBS).not.toContain("best");
    expect(DEFEAT_VERBS).not.toContain("bested");
  });

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

  it("clamps hype to max", () => {
    expect(clampHype(6)).toBe(HYPE_MAX);
    expect(clampHype(-1)).toBe(0);
    expect(applyHypeGain(4, 2)).toBe(HYPE_MAX);
    expect(hypeHeadroom(HYPE_MAX)).toBe(0);
    expect(hypeHeadroom(3)).toBe(2);
    expect(formatHypeLabel(3)).toBe("HYPE 3/5");
    expect(formatHypeLabel(7)).toBe("HYPE 5/5");
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
