import { chromium } from "@playwright/test";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const previewUrl = pathToFileURL(join(root, "scripts/og-preview.html")).href;
const outPath = join(root, "images/og-image.png");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

await page.goto(previewUrl, { waitUntil: "load" });
await page.waitForTimeout(500);

const buffer = await page.screenshot({
  type: "png",
  omitBackground: false,
  clip: { x: 0, y: 0, width: 1200, height: 630 },
});

await browser.close();
writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath}`);
