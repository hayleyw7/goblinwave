# Critterwave

Choose your critter. Dance for foes. Survive **100 waves**.

A tiny browser RPG: pick a critter hero, fight alliterative foes, heal, dance, and beat the campaign.

Play online after you enable [GitHub Pages](#github-pages) (Settings → Pages → **GitHub Actions**).

## Features

- Turn-based combat in the browser — no install
- **100 waves** to win; **117** hand-picked alliterative foes (critters and fantasy creatures)
- Pick any roster emoji as your hero
- **Heal** (+3 HP) on your turn — foe may counterattack
- **Dance** for random foe reactions and hype buffs
- **+3 HP after each wave victory** (sparkle on your critter; no battle-log line)
- Shuffled foe order each run
- **Scores persist** in this browser (best wave, run count)
- **Mid-run save** — refresh and your fight continues (with a “restored” message)

## Controls

| Action | Button | Notes |
|--------|--------|--------|
| Attack | ⚔️ | |
| Heal | 💚 | +3 HP; costs your turn |
| Dance | 🕺 | Random reactions; can raise hype |
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
- **Active run** — HP, hype, current foe, wave, turn, and shuffled foe order (until game over or victory)

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

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
3. Push to `main` (or `master`). The workflow builds TypeScript and deploys the site.

Your game will be at `https://<username>.github.io/<repo-name>/`.
