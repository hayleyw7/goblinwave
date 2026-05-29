/** Flat picker order — similar emojis adjacent, no visible categories. */
export const HERO_PICKER_ORDER = [
  "🐱",
  "🐈‍⬛",
  "🦁",
  "🐯",
  "🐆",
  "🐭",
  "🐀",
  "🐹",
  "🐰",
  "🐿️",
  "🦫",
  "🦔",
  "🦦",
  "🦨",
  "🦡",
  "🦝",
  "🐕",
  "🐩",
  "🐺",
  "🦊",
  "🐵",
  "🦍",
  "🦧",
  "🐻",
  "🐻‍❄️",
  "🐼",
  "🐨",
  "🦥",
  "🦘",
  "🐴",
  "🫏",
  "🫎",
  "🦄",
  "🦓",
  "🦌",
  "🦬",
  "🐮",
  "🐂",
  "🐃",
  "🐷",
  "🐗",
  "🐑",
  "🐐",
  "🐫",
  "🦙",
  "🦒",
  "🐘",
  "🦣",
  "🦏",
  "🦛",
  "🦇",
  "🦃",
  "🐔",
  "🥚",
  "🐓",
  "🐦",
  "🐧",
  "🕊️",
  "🦅",
  "🦆",
  "🦢",
  "🦉",
  "🦤",
  "🦩",
  "🦚",
  "🦜",
  "🐦‍⬛",
  "🪿",
  "🐦‍🔥",
  "🐸",
  "🐊",
  "🐢",
  "🦎",
  "🐍",
  "🐉",
  "🦕",
  "🦖",
  "🦋",
  "🐛",
  "🐜",
  "🐝",
  "🪲",
  "🐞",
  "🦗",
  "🪳",
  "🕷️",
  "🦂",
  "🦟",
  "🪰",
  "🪱",
  "🦠",
  "🍄",
  "🌳",
  "🪸",
  "🦪",
  "🦀",
  "🦞",
  "🦐",
  "🦑",
  "🐙",
  "🪼",
  "🐌",
  "🐳",
  "🐬",
  "🦭",
  "🐟",
  "🐠",
  "🐡",
  "🦈",
  "⛄",
  "🤖",
  "👽",
  "💀",
  "👻",
  "👺",
  "👹",
  "😈",
] as const;

const orderIndex = new Map<string, number>(
  HERO_PICKER_ORDER.map((emoji, index) => [emoji, index])
);

export function assertHeroPickerOrderCovers(allEmojis: readonly string[]): void {
  const seen = new Set<string>();
  for (const emoji of HERO_PICKER_ORDER) {
    if (seen.has(emoji)) {
      throw new Error(`Duplicate emoji in hero picker order: ${emoji}`);
    }
    seen.add(emoji);
  }
  for (const emoji of allEmojis) {
    if (!seen.has(emoji)) {
      throw new Error(`Hero picker order missing emoji: ${emoji}`);
    }
  }
  if (seen.size !== allEmojis.length) {
    throw new Error("Hero picker order includes emojis not in foe roster.");
  }
}

export function heroPickerOrderIndex(emoji: string): number {
  return orderIndex.get(emoji) ?? Number.MAX_SAFE_INTEGER;
}
