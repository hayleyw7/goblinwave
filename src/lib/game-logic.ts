export const CAMPAIGN_WAVE_COUNT = 100;
export const HERO_NAME_MAX_LENGTH = 16;
export const HYPE_ATTACK_PER_LEVEL = 1;

export const DEFEAT_VERBS = [
  "defeat",
  "vanquish",
  "crush",
  "destroy",
  "best",
  "obliterate",
  "smite",
  "flatten",
  "annihilate",
  "pulverize",
  "rout",
  "trounce",
  "clobber",
  "wallop",
  "thrash",
] as const;

export type FoeTemplate = {
  id: string;
  name: string;
  emoji: string;
  baseHp: number;
  baseAtk: number;
};

export type WaveFoe = {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
};

export function heroLabelFromFoeName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.slice(1).join(" ") || words[0]!;
}

export function shuffleArray<T>(
  items: readonly T[],
  random: () => number = Math.random
): T[] {
  const order = items.map((item) => item);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

export function foesForHero(
  allFoes: readonly FoeTemplate[],
  heroEmoji: string
): FoeTemplate[] {
  return allFoes.filter((f) => f.emoji !== heroEmoji);
}

export function buildFoeOrder(
  allFoes: readonly FoeTemplate[],
  heroEmoji: string,
  random: () => number = Math.random
): FoeTemplate[] {
  return shuffleArray(foesForHero(allFoes, heroEmoji), random);
}

export function restoreFoeOrder(
  ids: string[] | undefined,
  heroEmoji: string,
  allFoes: readonly FoeTemplate[],
  random: () => number = Math.random
): FoeTemplate[] {
  const expected = foesForHero(allFoes, heroEmoji);
  if (ids?.length === expected.length) {
    const byId = new Map(allFoes.map((f) => [f.id, f]));
    const restored = ids
      .map((id) => byId.get(id))
      .filter((f): f is FoeTemplate => !!f && f.emoji !== heroEmoji);
    if (restored.length === expected.length) {
      return restored;
    }
  }
  return buildFoeOrder(allFoes, heroEmoji, random);
}

export function pickFoeTemplateIndex(wave: number, orderLength: number): number {
  if (orderLength <= 0) {
    throw new Error("Foe order is empty");
  }
  return (wave - 1) % orderLength;
}

export function pickFoeFromOrder(
  foeOrder: readonly FoeTemplate[],
  wave: number
): FoeTemplate {
  return foeOrder[pickFoeTemplateIndex(wave, foeOrder.length)]!;
}

export function scaleFoeHp(baseHp: number, wave: number): number {
  return baseHp + Math.max(0, wave - 1) * 2;
}

export function scaleFoeAttack(baseAtk: number, wave: number): number {
  return baseAtk + Math.floor((wave - 1) / 3);
}

export function makeFoeFromTemplate(
  template: FoeTemplate,
  wave: number
): WaveFoe {
  const hp = scaleFoeHp(template.baseHp, wave);
  return {
    id: template.id,
    name: template.name,
    emoji: template.emoji,
    hp,
    maxHp: hp,
    attack: scaleFoeAttack(template.baseAtk, wave),
  };
}

export function makeFoeForWave(
  foeOrder: readonly FoeTemplate[],
  wave: number
): WaveFoe {
  return makeFoeFromTemplate(pickFoeFromOrder(foeOrder, wave), wave);
}

export function normalizeHeroName(
  raw: string,
  maxLength = HERO_NAME_MAX_LENGTH
): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function getSetupBlockers(
  heroEmoji: string | null | undefined,
  rawHeroName: string
): string[] {
  const blockers: string[] = [];
  if (!heroEmoji) {
    blockers.push("pick a critter");
  }
  if (!normalizeHeroName(rawHeroName)) {
    blockers.push("enter your name");
  }
  return blockers;
}

export function formatSetupBlockerMessage(blockers: string[]): string {
  if (blockers.length === 0) {
    return "";
  }
  if (blockers.length === 1) {
    return `To fight, ${blockers[0]}.`;
  }
  return `To fight, ${blockers[0]} and ${blockers[1]}.`;
}

export function foeColorConflictsWithHero(
  heroColorTheme: string,
  foeColorTheme: string
): boolean {
  if (heroColorTheme === "green") {
    return false;
  }
  return heroColorTheme === foeColorTheme;
}

export function formatFoeInText(template: string, foeName: string): string {
  return template.replace(/\{foe\}/g, foeName);
}

export function nextDefeatVerb(
  index: number,
  verbs: readonly string[] = DEFEAT_VERBS
): { verb: string; nextIndex: number } {
  const verb = verbs[index % verbs.length]!;
  return { verb, nextIndex: index + 1 };
}

export function randomDamage(max: number, random: () => number): number {
  if (max < 1) {
    throw new Error("randomDamage max must be at least 1");
  }
  return Math.floor(random() * max) + 1;
}

export function hypeAttackBonus(hypeLevel: number): number {
  return Math.max(0, hypeLevel) * HYPE_ATTACK_PER_LEVEL;
}

export function effectiveAttack(baseAttack: number, hypeLevel: number): number {
  return baseAttack + hypeAttackBonus(hypeLevel);
}

export function canFleeWave(wave: number, campaignLength = CAMPAIGN_WAVE_COUNT): boolean {
  return wave < campaignLength;
}
