import { expect, test } from "@playwright/test";
import { patchSaveSnapshot } from "./helpers-save.js";
import { clearSave, clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers.js";

test.describe("Critterwave — happy paths", () => {
  test("hero setup starts a run", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.locator("#hero-name")).toContainText(/test critter/i);
    await expect(page.locator("#wave-banner")).toHaveText(/1\s*\/\s*\d+/);
    await expect(page.locator("#battle-text")).toContainText(/appears!/i);
    await expect(page.locator("#player-hp-text")).toHaveText("20/20");

    const save = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { setupActive?: boolean }) : null;
    }, STORAGE_KEY);
    expect(save?.setupActive).toBeFalsy();
  });

  test("attack resolves combat text", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, {
      timeout: 10_000,
    });
  });

  test("heal restores hp in battle log", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
  });

  test("dance shows player opener and foe reaction", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Dance" }).click();
    await expect(page.locator("#battle-text")).toContainText(/^You /i, {
      timeout: 10_000,
    });
    await expect(page.locator(".battle-line.battle-foe")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("run away keeps wave and shows next foe", async ({ page }) => {
    await startFreshRun(page);
    const waveBefore = await page.locator("#wave-banner").textContent();
    const foeBefore = await page.locator("#foe-name").textContent();
    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(
      /run away from/i,
      { timeout: 10_000 }
    );
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#wave-banner")).toHaveText(waveBefore ?? "");
    await expect(page.locator("#foe-name")).not.toHaveText(foeBefore ?? "");
  });

  test("new run returns to hero setup", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "New Run" }).click();
    await page.locator("#confirm-ok").click();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
  });

  test("hides devil emoji in hero picker on mobile only", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await clearSave(page);
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.locator('.emoji-pick[data-emoji="😈"]')).toHaveCount(0);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.locator('.emoji-pick[data-emoji="😈"]')).toHaveCount(1);
  });
});

test.describe("Critterwave — sad paths", () => {
  test("cannot start without a name", async ({ page }) => {
    await clearSave(page);
    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("");
    await page.getByRole("button", { name: "Fight!" }).click();
    await expect(page.locator("#character-setup")).toBeVisible();
    await expect(page.locator(".game-shell")).toHaveClass(/setup-active/);
    await expect(page.locator("#hero-name-input")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    await expect(page.locator("#hero-name-input")).toHaveClass(
      /setup-name-input--highlight/
    );
    await expect(page.locator("#battle-text")).not.toContainText(/appears!/i);
  });

  test("setup screen survives reload with draft choices", async ({ page }) => {
    await clearSave(page);
    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("Refresh Cat");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue("Refresh Cat");
    await expect(page.locator(".game-shell")).toHaveClass(/setup-active/);
  });

  test("setup draft persists setupActive in save", async ({ page }) => {
    await clearSave(page);
    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("Saved Draft");

    const save = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { setupActive?: boolean; heroName?: string }) : null;
    }, STORAGE_KEY);

    expect(save?.setupActive).toBe(true);
    expect(save?.heroName).toBe("Saved Draft");
  });

  test("new run setup survives reload", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "New Run" }).click();
    await page.locator("#confirm-ok").click();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.locator("#character-setup")).toBeVisible();
    await expect(page.locator(".game-shell")).toHaveClass(/setup-active/);
  });

  test("clear data resets to setup", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Clear Data" }).click();
    await page.locator("#confirm-ok").click();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();

    const save = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(save).toBeTruthy();
    const parsed = JSON.parse(save!) as { bestWave?: number; runsPlayed?: number };
    expect(parsed.bestWave).toBe(0);
    expect(parsed.runsPlayed).toBe(0);
  });

  test("restores mid-run save after reload", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, {
      timeout: 10_000,
    });
    const waveBefore = await page.locator("#wave-banner").textContent();

    await page.reload();
    await expect(page.getByLabel("Combat actions")).toBeVisible();
    await expect(page.locator("#battle-text")).toContainText(/restored/i);
    await expect(page.locator("#wave-banner")).toHaveText(waveBefore ?? "");
    await expect(page.locator("#wave-banner")).toHaveClass(/hud-restore-blink/);
    await page.waitForTimeout(1500);
    await expect(page.locator("#wave-banner")).not.toHaveClass(/hud-restore-blink/);
  });

  test("restore keeps max hype styling without teach flash", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      hypeLevel: 5,
      foeHypeLevel: 5,
      combatHints: { dismissedAttackHint: true },
    });
    await page.reload();
    await expect(page.locator("#battle-text")).toContainText(/restored/i);
    await expect(page.locator("#player-hype-wrap")).toHaveClass(/hype-maxed/);
    await expect(page.locator("#foe-hype-wrap")).toHaveClass(/hype-maxed/);
    await expect(page.locator("#player-hype-wrap")).not.toHaveClass(/hype-maxed-flash/);
    await expect(page.locator("#foe-hype-wrap")).not.toHaveClass(/hype-maxed-flash/);
  });
});
