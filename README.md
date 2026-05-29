# Critterwave

Choose your critter. Dance for foes. Survive **100 waves**.

A tiny browser RPG: pick a critter hero, fight alliterative foes, heal, dance, and beat the campaign.

**Play online:** [https://hayleyw7.github.io/critterwave/](https://hayleyw7.github.io/critterwave/)

Deploy or update hosting via [GitHub Pages](#github-pages) (Settings → Pages → **GitHub Actions**).

## Features

- Turn-based combat in the browser — no install
- **100 waves** to win; **117** hand-picked alliterative foes (critters and fantasy creatures)
- Pick any roster emoji as your hero
- **Heal** (+3 HP) on your turn — foe may counterattack
- **Dance** for random foe reactions — hype for you, hype for them, both, or neither
- **+3 HP after each wave victory** (sparkle on your critter; no battle-log line)
- Shuffled foe order each run
- **Scores persist** in this browser (best wave, run count)
- **Mid-run save** — refresh and your fight continues (with a “restored” message)

## Controls

| Action | Button | Notes |
|--------|--------|--------|
| Attack | ⚔️ | |
| Heal | 💚 | +3 HP; costs your turn |
| Dance | 🕺 | Random reactions; +1 HYPE for you, them, or both |
| Run | 🏃 | Skip to the next wave — **not on wave 100** |

## Footer

| Button | What it does |
|--------|----------------|
| **New game** | New hero and fresh run. Best wave and run count are kept. |
| **Clear data** | Deletes your critter and all saved history on this browser. |

## What gets saved

Stored under `critterwave-v1` in the browser (migrates from older `goblinwave-*` keys):

- **Best** — highest wave number you’ve reached (updates when you die or beat all 100 waves)
- **Runs** — how many runs you’ve finished (game over or full win)
- **Hero** — emoji and name from your last run
- **Active run** — HP, your hype & foe hype, current foe, wave, turn, and shuffled foe order (until game over or victory)

## Project layout

```
index.html          # entry page
site.webmanifest
src/                # TypeScript source
  game.ts           # main game
  lib/              # rules, alliteration, hero picker order
  data/             # foe roster
  content/          # dance lines
  ui/               # victory celebration
js/                 # compiled output (npm run build — gitignored)
css/styles.css
icons/              # favicons & PWA icons
images/             # og-image.png (social preview)
assets/goblins/     # legacy placeholder art
scripts/            # generate-foes, generate:og
tests/              # Vitest unit tests
e2e/                # Playwright browser tests
.github/workflows/  # deploy + CI
```

## Local play

```bash
npm install
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test              # unit tests (Vitest): alliteration, roster, dance, game logic
npm run test:watch    # unit tests in watch mode
npm run test:e2e      # browser tests (downloads Chromium if needed, then runs)
```

`npm run test:e2e` runs `playwright install chromium` automatically first. To install browsers manually: `npx playwright install chromium`.

## GitHub Pages

This project uses **plain TypeScript** (`tsc`) — no bundler. `npm run build` compiles `src/**/*.ts` → `js/`; the browser loads `js/game.js` from `index.html`.

Hosting is automated by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### One-time setup on GitHub

1. Push the repo to GitHub (e.g. `hayleyw7/critterwave`).
2. Open the repo on GitHub → **Settings** → **Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions** (not “Deploy from a branch”).
4. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually under **Actions**).

The workflow runs `npm ci`, `npm run build`, then publishes the site root (`index.html`, compiled `.js`, CSS, images, etc.).

### Your live URL

For a project repo named `critterwave`:

**https://hayleyw7.github.io/critterwave/**

(Replace username/repo if yours differ.)

### Local check before you push

```bash
npm install
npm run build   # src/ → js/
npm run dev     # http://localhost:3000
```

### What *not* to do (common bad advice)

- **No Vite/Webpack required** — `tsc` is enough for this app.
- **No `gh-pages` branch** — the Actions workflow deploys for you.
- **No bundler `dist/` folder** — output goes to `js/` at the repo root.

After the first successful deploy, link previews may need absolute image URLs (`og:image`) — use your full Pages URL + `/images/og-image.png` if Discord/iMessage show a broken preview.
