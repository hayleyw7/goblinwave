const INITIAL_CLUSTERS = [
  "scr", "squ", "str", "spl", "shr", "th", "ch", "sh", "wh",
  "cr", "br", "bl", "cl", "dr", "fl", "fr", "gl", "gr", "pl", "pr",
  "sk", "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw", "wr",
];

export function initialSoundCluster(word: string): string {
  const lower = word.toLowerCase();
  for (const cluster of INITIAL_CLUSTERS) {
    if (lower.startsWith(cluster)) return cluster;
  }
  return lower[0] ?? "";
}

/** Adjective + noun must share the same opening sound (not just the same letter). */
export function assertAlliterativeName(name: string): void {
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || words.length > 3) {
    throw new Error(`"${name}" must be two words (or "Adjective T-Rex").`);
  }
  const adjective = words[0]!;
  const noun = words.slice(1).join(" ");
  if (noun === "T-Rex") {
    if (initialSoundCluster(adjective) !== "t") {
      throw new Error(`"${name}" is not alliterative (${adjective} vs T-Rex).`);
    }
    return;
  }
  const nounWord = noun.split(/[\s-]/)[0]!;
  const adjSound = initialSoundCluster(adjective);
  const nounSound = initialSoundCluster(nounWord);
  if (!adjSound || adjSound !== nounSound) {
    throw new Error(
      `"${name}" is not alliterative ("${adjective}" ${adjSound} vs "${nounWord}" ${nounSound}).`
    );
  }
}

export function isAlliterativeName(name: string): boolean {
  try {
    assertAlliterativeName(name);
    return true;
  } catch {
    return false;
  }
}
