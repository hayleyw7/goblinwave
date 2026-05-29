#!/usr/bin/env node
/**
 * Validates src/data/foes-data.ts — sound-matched alliteration for every foe.
 * Run: npm run build && npm run generate-foes
 */
import { readFileSync } from "fs";
import { assertAlliterativeName } from "../js/lib/alliteration.js";

const src = readFileSync(
  new URL("../src/data/foes-data.ts", import.meta.url),
  "utf8"
);
const foes = JSON.parse(src.match(/export const FOES = (\[[\s\S]*?\]) as const;/)[1]);

const emojis = new Set();
const adjectives = new Set();
for (const f of foes) {
  if (emojis.has(f.emoji)) {
    console.error("Duplicate emoji:", f.emoji, f.name);
    process.exit(1);
  }
  emojis.add(f.emoji);
  const adjective = f.name.trim().split(/\s+/)[0];
  if (adjectives.has(adjective)) {
    console.error("Duplicate adjective:", adjective, f.name);
    process.exit(1);
  }
  adjectives.add(adjective);
  try {
    assertAlliterativeName(f.name);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

console.log(`Validated ${foes.length} hand-picked foes.`);
