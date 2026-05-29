import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = join(dirname(fileURLToPath(import.meta.url)), "../css/styles.css");
const styles = readFileSync(cssPath, "utf8");

describe("teach flash presentation", () => {
  it("flashes hype bar and text in unison on first-hype and maxed flashes", () => {
    const flashRule = styles.match(
      /\.hype-stat-wrap\.hype-first-dance-flash \.hype-bar,\s*[\s\S]*?animation: hype-teach-flash 0\.45s ease-out 3;/
    )?.[0];

    expect(flashRule).toContain(".hype-stat-wrap.hype-first-dance-flash .hype-stat");
    expect(flashRule).toContain(".hype-stat-wrap.hype-maxed-flash .hype-bar");
    expect(flashRule).toContain(".hype-stat-wrap.hype-maxed-flash .hype-stat");
    expect(flashRule).not.toContain("animation-delay");
    expect(styles).toContain("@keyframes hype-teach-flash");
    expect(styles).not.toContain("@keyframes hype-teach-text-pulse");
  });

  it("defines wave restore blink for combat reload", () => {
    expect(styles).toContain(".hud-wave-line.hud-restore-blink");
    expect(styles).toContain("@keyframes hud-restore-blink");
  });

  it("uses compact one-line footer labels on narrow or short viewports", () => {
    expect(styles).toMatch(
      /@media \(max-width: 480px\), \(max-height: 667px\) \{[\s\S]*?\.records-stat-label--long \{[\s\S]*?display: none;/
    );
    expect(styles).toMatch(
      /@media \(max-width: 480px\), \(max-height: 667px\) \{[\s\S]*?\.records-stat-label--short \{[\s\S]*?display: inline;/
    );
    expect(styles).toMatch(
      /@media \(max-width: 480px\), \(max-height: 667px\) \{[\s\S]*?\.records-bar \{[\s\S]*?flex-wrap: nowrap;/
    );
  });

  it("defines hp teach pulse for player and foe bars", () => {
    expect(styles).toContain(".hp-bar.hp-first-heal-flash .player-hp");
    expect(styles).toContain(".hp-bar.hp-first-attack-flash .foe-hp");
    expect(styles).toContain(".hp-bar.hp-first-wave-heal-flash .player-hp");
    expect(styles).toContain("@keyframes hp-teach-pulse");
  });
});
