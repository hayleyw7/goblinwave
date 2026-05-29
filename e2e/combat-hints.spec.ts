import { expect, test } from "@playwright/test";
import { patchSaveSnapshot } from "./helpers-save.js";
import { clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers.js";

test.describe("combat hints — button glow", () => {
  test("attack glows on fresh run then stops after first attack", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.locator("#cmd-attack")).toHaveAttribute("data-combat-hint", "on");
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, { timeout: 10_000 });
    await expect(page.locator("#cmd-attack")).toHaveAttribute("data-combat-hint", "off");
  });

  test("heal glows at low hp but not dance on same fight", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await page.reload();

    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");
  });

  test("run glows at lethal hp and hides when safe", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 3, maxHp: 20 },
      foe: { attack: 5 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        dismissedDanceHint: true,
      },
    });
    await page.reload();

    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "on");

    await patchSaveSnapshot(page, { player: { hp: 20, maxHp: 20 } });
    await page.reload();
    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "off");
  });

  test("heal hint stays off after heal was used this run", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await page.reload();

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "off");

    await patchSaveSnapshot(page, { player: { hp: 8, maxHp: 20 } });
    await page.reload();
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "off");
  });

  test("heal hint stays off after run grants a free heal", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await page.reload();

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });

    await patchSaveSnapshot(page, { player: { hp: 8, maxHp: 20 } });
    await page.reload();
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "off");
  });

  test("heal hint stays off after topping up from a low-hp kill", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      foe: { hp: 1, maxHp: 10 },
      combatHints: { dismissedAttackHint: true },
    });
    await page.reload();

    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You (hit|defeat|vanquish|crush)/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });

    await patchSaveSnapshot(page, { player: { hp: 8, maxHp: 20 } });
    await page.reload();
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "off");
  });
  test("dance glows on wave 2 at full hp until first hype after wasted heal", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 20, maxHp: 20 },
      foe: { hp: 1, maxHp: 10 },
      combatHints: { dismissedAttackHint: true },
    });
    await page.reload();

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#battle-text")).toContainText(/hits you for/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await expect(async () => {
      await page.getByRole("button", { name: "Attack" }).click();
      await expect(page.locator("#battle-text")).toContainText(/You (hit|defeat|vanquish|crush)/i);
    }).toPass({ timeout: 10_000 });
    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
  });
});

test.describe("combat hints — dance after heal", () => {
  test("dance does not glow during heal fight", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await page.reload();

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");
  });

  test("dance glows at full hp when save restored mid-run", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 20, maxHp: 20 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        showDanceHintThisFoe: true,
      },
    });
    await page.reload();
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
  });

  test("dance keeps glowing across mobs until first hype", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 20, maxHp: 20 },
      foe: { hp: 1, maxHp: 12 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        showDanceHintThisFoe: true,
      },
    });
    await page.reload();
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");

    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You (hit|defeat|vanquish|crush)/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
  });

  test("dance returns after run once topped up to full hp", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 12, maxHp: 20 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
      },
    });
    await page.reload();
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await patchSaveSnapshot(page, { foe: { hp: 1, maxHp: 12 } });
    await page.reload();
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#player-hp-text")).toHaveText("20/20");
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
  });

  test("run hides dance while lethal then dance returns when safe", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 1, maxHp: 20 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
      },
    });
    await page.reload();

    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await patchSaveSnapshot(page, { player: { hp: 20, maxHp: 20 } });
    await page.reload();
    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "off");
    await patchSaveSnapshot(page, {
      combatHints: { showDanceHintThisFoe: true },
    });
    await page.reload();
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
  });
});

test.describe("combat hints — save persistence", () => {
  test("hint dismissals survive reload", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#cmd-attack")).toHaveAttribute("data-combat-hint", "off");

    await page.reload();
    await expect(page.locator("#cmd-attack")).toHaveAttribute("data-combat-hint", "off");
  });

  test("heal press clears dance hint for the current foe in save", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 20, maxHp: 20 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        showDanceHintThisFoe: true,
      },
    });
    await page.reload();

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");
  });
});

test.describe("combat hints — setup", () => {
  test("empty name shows highlight and teach pulse on fight click", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();

    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("");
    await page.getByRole("button", { name: "Fight!" }).click();

    await expect(page.locator("#hero-name-input")).toHaveClass(/setup-name-input--highlight/);
    await expect(page.locator("#hero-name-input")).toHaveClass(/setup-name-teach-flash/);
  });
});

test.describe("wave victory heal", () => {
  test("defeating a foe tops hp to max before next appears", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 8, maxHp: 20 },
      foe: { hp: 1, maxHp: 12 },
    });
    await page.reload();

    const waveBefore = await page.locator("#wave-banner").textContent();
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#player-hp-text")).toHaveText("20/20");
    await expect(page.locator(".hero-hp-wrap .hp-bar")).toHaveClass(/hp-first-wave-heal-flash/);
    await expect(page.locator("#wave-banner")).not.toHaveText(waveBefore ?? "");

    await page.waitForTimeout(1500);
    await expect(page.locator(".hero-hp-wrap .hp-bar")).not.toHaveClass(
      /hp-first-wave-heal-flash/
    );
  });
});

test.describe("foe queue — run away", () => {
  test("run keeps wave number and changes foe", async ({ page }) => {
    await startFreshRun(page);
    const waveBefore = await page.locator("#wave-banner").textContent();
    const foeBefore = await page.locator("#foe-name").textContent();

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#wave-banner")).toHaveText(waveBefore ?? "");
    await expect(page.locator("#foe-name")).not.toHaveText(foeBefore ?? "");
  });

  test("run grants one free heal roll when hurt", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 6, maxHp: 20 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        dismissedDanceHint: true,
      },
    });
    await page.reload();

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });
    await expect(page.locator(".damage-pop.heal-pop")).toBeVisible();

    const hpText = await page.locator("#player-hp-text").textContent();
    const match = hpText?.match(/^(\d+)\/20$/);
    expect(match).not.toBeNull();
    const hp = Number(match![1]);
    expect(hp).toBeGreaterThan(6);
    expect(hp).toBeLessThanOrEqual(11);
  });

  test("deferred foe id is stored after run", async ({ page }) => {
    await startFreshRun(page);
    const foeBefore = await page.locator("#foe-name").textContent();

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });

    const deferred = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      const data = JSON.parse(raw!) as { snapshot?: { deferredFoeIds?: string[] } };
      return data.snapshot?.deferredFoeIds ?? [];
    }, STORAGE_KEY);

    expect(deferred.length).toBe(1);
    expect(foeBefore?.length).toBeGreaterThan(0);
  });
});

test.describe("combat hints — teach flashes", () => {
  test("first attack blinks foe hp bar once", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#foe-panel .hp-bar")).toHaveClass(/hp-first-attack-flash/);

    await page.waitForTimeout(1500);
    await expect(page.locator("#foe-panel .hp-bar")).not.toHaveClass(/hp-first-attack-flash/);
  });

  test("first heal blinks player hp bar once", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await page.reload();

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator(".hero-hp-wrap .hp-bar")).toHaveClass(/hp-first-heal-flash/);

    await page.waitForTimeout(1500);
    await expect(page.locator(".hero-hp-wrap .hp-bar")).not.toHaveClass(/hp-first-heal-flash/);
  });

  test("first heal does not blink player hype when counter zeros HYPE", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await page.reload();

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });

    await expect(page.locator("#player-buff")).toHaveText("HYPE 0/5");
    await expect(page.locator("#player-hype-wrap")).not.toHaveClass(/hype-first-dance-flash/);

    await page.waitForTimeout(1600);
    await expect(page.locator("#player-hype-wrap")).not.toHaveClass(/hype-first-dance-flash/);
  });
});

test.describe("combat hints — wave 12 dance fallback", () => {
  test("dance glows at wave 12 when full hp and still at 0 hype", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      wave: 12,
      hypeLevel: 0,
      player: { hp: 23, maxHp: 23 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        showDanceHintThisFoe: true,
      },
    });
    await page.reload();

    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#wave-banner")).toContainText("12");
  });

  test("dance does not glow at wave 11 without a post-kill arm", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      wave: 11,
      hypeLevel: 0,
      player: { hp: 23, maxHp: 23 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
      },
    });
    await page.reload();
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");
  });
});

test.describe("combat — foe hype", () => {
  test("foe hype drops by one when player damage lands", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      foeHypeLevel: 3,
      foe: { hp: 40, maxHp: 40 },
      combatHints: { dismissedAttackHint: true },
    });
    await page.reload();

    await expect(page.locator("#foe-buff")).toHaveText("HYPE 3/5");
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#foe-buff")).toHaveText("HYPE 2/5");
  });
});

test.describe("ui labels", () => {
  test("shows high score and new run labels", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.getByText("High Score", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "New Run" })).toBeVisible();
  });

  test("shows title case footer and restart labels", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.getByText("Runs Played")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear Data" })).toBeVisible();
    await patchSaveSnapshot(page, {
      player: { hp: 1, maxHp: 20 },
      foe: { attack: 20 },
    });
    await page.reload();
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#cmd-attack")).toBeEnabled({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Try Again?" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
