import { FOES as FOES_RAW } from "./data/foes-data.js";
import { assertAlliterativeName } from "./lib/alliteration.js";
import {
  buildFoeOrder as buildFoeOrderForHero,
  CAMPAIGN_WAVE_COUNT,
  DEFEAT_VERBS,
  foeColorConflictsWithHero as heroFoeColorConflicts,
  formatFoeInText as formatFoeMessage,
  formatSetupBlockerMessage,
  getSetupBlockers as getSetupBlockersForInput,
  HERO_NAME_MAX_LENGTH,
  HYPE_ATTACK_PER_LEVEL,
  HYPE_MAX,
  applyPlayerHealRoll,
  applyHypeGain,
  hypeAfterTakingHit,
  applyPlayerStatsForWave,
  clampHype,
  formatHypeLabel as formatHypeStatLabel,
  healHpAfterWaveVictory,
  hypeHeadroom,
  isLevelBandFinale,
  advanceFoeQueueAfterFlee,
  advanceFoeQueueAfterVictory,
  buildInitialFoeQueue,
  buildQueueCycleFromWave,
  makeFoeFromQueueHead,
  makeFoeFromTemplate,
  nextDefeatVerb as advanceDefeatVerb,
  pickFoeFromOrder,
  playerLevelForWave,
  playerStatsForWave,
  refreshWaveFoeFromTemplate,
  WAVES_PER_LEVEL,
  xpProgressForDisplay,
  xpProgressForWave,
  xpPercentForDisplay,
  xpPercentForWave,
  heroLabelFromFoeName,
  normalizeHeroName,
  restoreFoeOrder as restoreFoeOrderForHero,
  randomDamage,
} from "./lib/game-logic.js";
import {
  formatDanceHypeTail,
  getPlayerHypeGain,
  getFoeHypeGain,
  pickRandomDanceOpener,
  pickRandomDanceResponse,
  resetDancePicker,
} from "./content/dance-responses.js";
import { appendBattleHypeTail, setBattleLines } from "./lib/battle-log-dom.js";
import {
  isDebugHost,
  parseSaveMeta,
  sanitizeGamePhase,
  sanitizeHypeLevel,
  sanitizeIdList,
  sanitizeSavedHeroName,
  sanitizeSnapshotFoe,
  sanitizeSnapshotPlayer,
  sanitizeTurn,
  sanitizeWave,
} from "./lib/save-validation.js";
import {
  assertHeroPickerOrderCovers,
  heroPickerOrderIndex,
  isHeroEmojiHiddenInPicker,
  isMobileHeroPickerViewport,
} from "./lib/hero-groups.js";
import {
  COLOR_THEME_IDS,
  COLOR_THEMES,
  DEFAULT_COLOR_THEME,
  getColorTheme,
  isColorThemeId,
  type ColorThemeId,
} from "./lib/color-themes.js";
import {
  beginAwaitingFoeResponse,
  blockCombatForScreenEnd,
  canUseCombatActions as canUseCombatActionsGate,
  finishCombatAction as finishCombatActionGate,
  foeFollowUpDelayMs,
  FOE_FOLLOW_UP_DELAY_MS,
  isFollowUpTimerStale,
  resetCombatGate,
  tryLockCombat as tryLockCombatGate,
  type CombatGateState,
} from "./lib/combat-gate.js";
import {
  createCombatHintsState,
  combatHintsForSnapshot,
  deferDanceHintAfterRun,
  dismissHealHint,
  dismissHealHintIfWasLow,
  maybeArmDanceHintForWave,
  onNextFoeForHints,
  onVictoryForHints,
  recordAttackForHints,
  recordDanceForHints,
  recordHealForHints,
  recordPlayerDamageForHints,
  tryCelebrateFirstFoeHype,
  tryCelebrateFirstPlayerHype,
  tryCelebrateFirstWaveVictoryHeal,
  hypeMaxPresentation,
  recordRunForHints,
  shouldShowAttackHint,
  shouldShowDanceHint,
  shouldShowHealHint,
  shouldShowRunHint,
  type CombatHintsState,
} from "./lib/combat-hints.js";
import {
  startVictoryCelebration,
  stopVictoryCelebration,
} from "./ui/victory-celebration.js";

const HYPE_METER_TEXT_STAGGER_MS = FOE_FOLLOW_UP_DELAY_MS;
/** Bar flash (3×) plus staggered text — matches floating pop beat. */
const HYPE_METER_FLASH_MS = HYPE_METER_TEXT_STAGGER_MS + 450 * 3 + 50;

declare global {
  interface Window {
    critterwave?: { win: () => void };
  }
}

type Player = {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  emoji: string;
};

type Enemy = {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  level: number;
};

type FoeTemplate = {
  id: string;
  /** Two words; adjective + creature must share the same opening sound. */
  name: string;
  emoji: string;
  baseHp: number;
  baseAtk: number;
};

type HeroOption = {
  id: string;
  label: string;
  emoji: string;
};

const FOE_COLOR_THEMES = COLOR_THEME_IDS;
type FoeColorTheme = ColorThemeId;

function normalizeFoeColorTheme(theme: string | undefined): FoeColorTheme {
  if (theme && isColorThemeId(theme)) {
    return theme;
  }
  return "amber";
}

type HeroColorTheme = ColorThemeId;
const DEFAULT_HERO_COLOR_THEME: HeroColorTheme = DEFAULT_COLOR_THEME;

type SaveData = {
  bestWave: number;
  runsPlayed: number;
  playerEmoji?: string;
  /** Custom display name chosen by the player. */
  heroName?: string;
  /** @deprecated Legacy — creature label; use heroName when present. */
  heroLabel?: string;
  heroColorTheme?: HeroColorTheme;
  /** True while the hero setup overlay should stay up (survives refresh). */
  setupActive?: boolean;
};

type GameSnapshot = {
  player: Player;
  foe: Enemy | null;
  turn: number;
  wave: number;
  phase: "combat" | "gameover" | "victory";
  hypeLevel: number;
  foeHypeLevel: number;
  /** Shuffled foe sequence for this run (foe template ids). */
  foeOrderIds?: string[];
  /** Active foe queue — front is the current encounter. */
  foeQueueIds?: string[];
  /** Foes fled from; appended after the queue empties. */
  deferredFoeIds?: string[];
  foeColorTheme?: FoeColorTheme;
  heroColorTheme?: HeroColorTheme;
  combatHints?: CombatHintsState;
};

const STORAGE_KEY = "critterwave-v1";
const LEGACY_STORAGE_KEYS = ["goblinwave-v4", "goblinwave-v1"] as const;
const CAMPAIGN_WAVES = CAMPAIGN_WAVE_COUNT;
const FOE_POOF_MS = 450;
const FOE_ENTRANCE_MS = 550;
const DEATH_BEAT_MS = 1200;
const GOLD_FLASH_MS = 650;
const HEAL_ANIM_MS = 420;
const DANCE_ANIM_MS = 550;
const XP_FILL_BEAT_MS = 220;
const DEFAULT_HERO_EMOJI = "🐱";
const DEFAULT_HERO_LABEL = "Cat";

function assertUniqueEmojis(entries: { emoji: string; name?: string; label?: string }[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.emoji)) {
      throw new Error(`Duplicate emoji ${entry.emoji} (${entry.name ?? entry.label})`);
    }
    seen.add(entry.emoji);
  }
}

function heroesFromFoes(foes: FoeTemplate[]): HeroOption[] {
  return foes.map((foe) => ({
    id: foe.id,
    label: heroLabelFromFoeName(foe.name),
    emoji: foe.emoji,
  }));
}

const FOES: FoeTemplate[] = FOES_RAW.map((f) => ({ ...f }));
const HEROES: HeroOption[] = heroesFromFoes(FOES).sort(
  (a, b) => heroPickerOrderIndex(a.emoji) - heroPickerOrderIndex(b.emoji)
);
const HERO_EMOJIS = new Set(HEROES.map((hero) => hero.emoji));
const FOES_BY_ID = new Map(FOES.map((foe) => [foe.id, foe]));
const FOE_IDS = new Set(FOES.map((foe) => foe.id));

for (const foe of FOES) {
  assertAlliterativeName(foe.name);
}
assertUniqueEmojis(FOES);
assertHeroPickerOrderCovers(FOES.map((f) => f.emoji));
function buildFoeOrder(heroEmoji: string): FoeTemplate[] {
  return buildFoeOrderForHero(FOES, heroEmoji);
}

function restoreFoeQueueState(
  snapshot: GameSnapshot,
  order: FoeTemplate[]
): { queue: string[]; deferred: string[] } {
  if (snapshot.foeQueueIds && snapshot.foeQueueIds.length > 0) {
    return {
      queue: snapshot.foeQueueIds,
      deferred: snapshot.deferredFoeIds ?? [],
    };
  }
  const cycle = buildQueueCycleFromWave(order, snapshot.wave);
  if (snapshot.foe?.id) {
    const idx = cycle.indexOf(snapshot.foe.id);
    if (idx >= 0) {
      return { queue: cycle.slice(idx), deferred: [] };
    }
  }
  return { queue: cycle, deferred: [] };
}

function spawnFoeFromQueue(): Enemy {
  return makeFoeFromQueueHead(foeQueue, foeOrder, wave);
}

function getCampaignLength(): number {
  return CAMPAIGN_WAVES;
}

function getHealMax(): number {
  return playerStatsForWave(wave).healMax;
}

function syncPlayerForCurrentWave(options?: {
  healToMax?: boolean;
  grantMaxHpIncrease?: boolean;
}): number {
  const next = applyPlayerStatsForWave(wave, player, options);
  player.hp = next.hp;
  player.maxHp = next.maxHp;
  player.attack = next.attack;
  return next.level;
}

function refreshFoeStatsPreservingHp(): void {
  const currentFoe = foe;
  if (!currentFoe || foeOrder.length === 0) {
    return;
  }
  const template =
    foeOrder.find((entry) => entry.id === currentFoe.id) ??
    pickFoeFromOrder(foeOrder, wave);
  const refreshed = refreshWaveFoeFromTemplate(currentFoe.hp, template, wave);
  currentFoe.maxHp = refreshed.maxHp;
  currentFoe.attack = refreshed.attack;
  currentFoe.level = refreshed.level;
  currentFoe.hp = refreshed.hp;
}

function restoreFoeOrder(ids: string[] | undefined, heroEmoji: string): FoeTemplate[] {
  return restoreFoeOrderForHero(ids, heroEmoji, FOES);
}

const player: Player = {
  name: "Hero",
  hp: 20,
  maxHp: 20,
  attack: 5,
  emoji: DEFAULT_HERO_EMOJI,
};

let foe: Enemy | null = null;
let foeOrder: FoeTemplate[] = [];
let foeQueue: string[] = [];
let deferredFoeIds: string[] = [];
let turn = 1;
let wave = 1;
let hypeLevel = 0;
let foeHypeLevel = 0;
let phase: GameSnapshot["phase"] = "combat";
let combatHints: CombatHintsState = createCombatHintsState();
let pendingHeroEmoji = DEFAULT_HERO_EMOJI;
let pendingHeroLabel = DEFAULT_HERO_LABEL;
let heroColorTheme: HeroColorTheme = DEFAULT_HERO_COLOR_THEME;
let pendingHeroColorTheme: HeroColorTheme = DEFAULT_HERO_COLOR_THEME;
let foeColorTheme: FoeColorTheme = "amber";
let lastFoeColorTheme: FoeColorTheme | null = null;
let defeatVerbIndex = 0;
/** Blocks combat buttons during counters, run, wave change, death anim, etc. */
let combatBusy = false;
let combatActionGeneration = 0;
/** After attack/heal until foe counter finishes — one hero strike per foe response. */
let awaitingFoeResponse = false;
/** Keep showing the fleeing foe until exit poof finishes (run away). */
let suppressFoePanelRender = false;
let displayedPlayerHype = 0;
let displayedFoeHype = 0;
/** Skip first-HYPE teach on the render beat right after Heal (gain may be lost to counter). */
let skipPlayerHypeTeachThisRender = false;

const el = {
  arena: document.getElementById("arena")!,
  battleStage: document.getElementById("battle-stage")!,
  playerPanel: document.getElementById("player-panel")!,
  playerStatus: document.querySelector("#player-panel .hero-status") as HTMLElement,
  foePanel: document.getElementById("foe-panel")!,
  foeStatus: document.querySelector("#foe-panel .enemy-status") as HTMLElement,
  damageLayer: document.getElementById("damage-layer")!,
  heroLevelUpLayer: document.getElementById("hero-level-up-layer")!,
  xpBar: document.getElementById("xp-bar")!,
  xpFill: document.getElementById("xp-fill")!,
  xpText: document.getElementById("xp-text")!,
  bestWave: document.getElementById("stat-best-wave")!,
  runs: document.getElementById("stat-runs")!,
  waveBanner: document.getElementById("wave-banner")!,
  playerHpFill: document.getElementById("player-hp-fill")!,
  playerHpText: document.getElementById("player-hp-text")!,
  playerLevel: document.getElementById("player-level")!,
  playerAttack: document.getElementById("player-attack")!,
  playerBuff: document.getElementById("player-buff")!,
  playerHypeWrap: document.getElementById("player-hype-wrap")!,
  playerHypeBar: document.getElementById("player-hype-bar")!,
  playerHypeFill: document.getElementById("player-hype-fill")!,
  playerEmoji: document.getElementById("hero-emoji")!,
  playerName: document.getElementById("hero-name")!,
  foeName: document.getElementById("foe-name")!,
  foeLevel: document.getElementById("foe-level")!,
  foeAttack: document.getElementById("foe-attack")!,
  foeBuff: document.getElementById("foe-buff")!,
  foeHypeWrap: document.getElementById("foe-hype-wrap")!,
  foeHypeBar: document.getElementById("foe-hype-bar")!,
  foeHypeFill: document.getElementById("foe-hype-fill")!,
  foeEmoji: document.getElementById("foe-emoji")!,
  foeHpFill: document.getElementById("foe-hp-fill")!,
  foeHpText: document.getElementById("foe-hp-text")!,
  turnLabel: document.getElementById("turn-label")!,
  battleText: document.getElementById("battle-text")!,
  actions: document.getElementById("actions")!,
  healBtn:
    document.getElementById("cmd-heal") ??
    document.querySelector<HTMLButtonElement>('[data-action="heal"]')!,
  danceBtn:
    document.getElementById("cmd-dance") ??
    document.querySelector<HTMLButtonElement>('[data-action="dance"]')!,
  attackBtn:
    document.getElementById("cmd-attack") ??
    document.querySelector<HTMLButtonElement>('[data-action="attack"]')!,
  runBtn:
    document.getElementById("cmd-run") ??
    document.querySelector<HTMLButtonElement>('[data-action="run"]')!,
  gameOver: document.getElementById("game-over")!,
  victoryEmojiLayer: document.getElementById("victory-emoji-layer")!,
  gameOverTag: document.getElementById("game-over-tag")!,
  gameOverSummary: document.getElementById("game-over-summary")!,
  restartLabel: document.querySelector("#restart-btn .cmd-label")!,
  restartBtn: document.getElementById("restart-btn")!,
  quitBtn: document.getElementById("quit-btn")!,
  resetStatsBtn: document.getElementById("reset-stats-btn")!,
  confirmOverlay: document.getElementById("confirm-overlay")!,
  confirmTitle: document.getElementById("confirm-title")!,
  confirmMessage: document.getElementById("confirm-message")!,
  confirmOk: document.getElementById("confirm-ok")!,
  confirmCancel: document.getElementById("confirm-cancel")!,
  setupOverlay: document.getElementById("character-setup")!,
  heroPicker: document.getElementById("hero-picker")!,
  heroNameInput: document.getElementById("hero-name-input") as HTMLInputElement,
  heroColorSwatches: document.getElementById("hero-color-swatches")!,
  heroColorToggle: document.getElementById("hero-color-toggle") as HTMLButtonElement,
  heroColorPopup: document.getElementById("hero-color-popup")!,
  setupStartBtn: document.getElementById("setup-start-btn") as HTMLButtonElement,
  setupHint: document.getElementById("setup-hint")!,
  gameShell: document.querySelector(".game-shell") as HTMLElement,
};

let setupHintForced = false;
let setupColorPickerBound = false;

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

let confirmResolve: ((confirmed: boolean) => void) | null = null;

function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    el.confirmTitle.textContent = options.title;
    el.confirmMessage.textContent = options.message;
    el.confirmOk.textContent = options.confirmLabel ?? "Yes";
    el.confirmCancel.textContent = options.cancelLabel ?? "Cancel";
    el.confirmOverlay.classList.toggle("confirm-danger", options.danger ?? false);
    el.confirmOverlay.classList.remove("hidden");
    confirmResolve = resolve;
    el.confirmCancel.focus();
  });
}

function closeConfirm(confirmed: boolean): void {
  el.confirmOverlay.classList.add("hidden");
  el.confirmOverlay.classList.remove("confirm-danger");
  const resolve = confirmResolve;
  confirmResolve = null;
  resolve?.(confirmed);
}

function bindConfirmDialog(): void {
  el.confirmOk.addEventListener("click", () => {
    closeConfirm(true);
  });

  el.confirmCancel.addEventListener("click", () => {
    closeConfirm(false);
  });

  el.confirmOverlay.addEventListener("click", (event) => {
    if (event.target === el.confirmOverlay) {
      closeConfirm(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (el.confirmOverlay.classList.contains("hidden")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeConfirm(false);
    }
  });
}

function getStorageRaw(): string | null {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) return current;
  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) return legacy;
  }
  return null;
}

function loadSave(): SaveData {
  try {
    const raw = getStorageRaw();
    if (!raw) {
      return { bestWave: 0, runsPlayed: 0 };
    }
    return parseSaveMeta(JSON.parse(raw) as unknown, {
      allowedHeroEmojis: HERO_EMOJIS,
      campaignWaves: CAMPAIGN_WAVES,
    });
  } catch {
    return { bestWave: 0, runsPlayed: 0 };
  }
}

type LegacySnapshot = GameSnapshot & {
  goblin?: Enemy | null;
  goblinHypeLevel?: number;
};

function loadSnapshot(): GameSnapshot | null {
  try {
    const raw = getStorageRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { snapshot?: LegacySnapshot };
    const snap = parsed.snapshot;
    if (!snap) return null;
    return normalizeSnapshot(snap);
  } catch {
    return null;
  }
}

function normalizeSnapshot(snap: LegacySnapshot): GameSnapshot {
  const wave = sanitizeWave(snap.wave, CAMPAIGN_WAVES);
  const legacyFoe = snap.foe ?? snap.goblin;
  const playerEmoji =
    typeof snap.player?.emoji === "string" ? snap.player.emoji : DEFAULT_HERO_EMOJI;
  const player = sanitizeSnapshotPlayer(
    snap.player,
    wave,
    HERO_EMOJIS,
    DEFAULT_HERO_EMOJI,
    getHeroLabelForEmoji(playerEmoji)
  );
  const foeNormalized = legacyFoe
    ? sanitizeSnapshotFoe(legacyFoe, wave, FOES_BY_ID)
    : null;

  return {
    player,
    foe: foeNormalized,
    turn: sanitizeTurn(snap.turn),
    wave,
    phase: sanitizeGamePhase(snap.phase),
    hypeLevel: sanitizeHypeLevel(snap.hypeLevel),
    foeHypeLevel: sanitizeHypeLevel(snap.foeHypeLevel ?? snap.goblinHypeLevel),
    foeOrderIds: sanitizeIdList(snap.foeOrderIds, FOE_IDS),
    foeColorTheme: snap.foeColorTheme,
    heroColorTheme:
      snap.heroColorTheme && isHeroColorTheme(snap.heroColorTheme)
        ? snap.heroColorTheme
        : undefined,
    combatHints: createCombatHintsState(snap.combatHints ?? {}),
    foeQueueIds: sanitizeIdList(snap.foeQueueIds, FOE_IDS),
    deferredFoeIds: sanitizeIdList(snap.deferredFoeIds, FOE_IDS),
  };
}

function persistStatsOnly(): void {
  const save = loadSave();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      bestWave: save.bestWave,
      runsPlayed: save.runsPlayed,
      playerEmoji: player.emoji,
      heroName: player.name,
      heroColorTheme,
      setupActive: false,
    })
  );
}

function persistSetupDraft(): void {
  if (el.setupOverlay.classList.contains("hidden")) {
    return;
  }
  const save = loadSave();
  const name = readHeroNameFromSetup();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      bestWave: save.bestWave,
      runsPlayed: save.runsPlayed,
      playerEmoji: pendingHeroEmoji,
      heroName: name || undefined,
      heroColorTheme: pendingHeroColorTheme,
      setupActive: true,
    })
  );
}

function persist(snapshot?: GameSnapshot): void {
  const save = loadSave();
  const activeSnapshot =
    phase === "gameover" || phase === "victory" ? undefined : (snapshot ?? getSnapshot());
  const payload = activeSnapshot
    ? {
        bestWave: save.bestWave,
        runsPlayed: save.runsPlayed,
        playerEmoji: player.emoji,
        heroName: player.name,
        heroColorTheme,
        setupActive: false,
        snapshot: activeSnapshot,
      }
    : {
        bestWave: save.bestWave,
        runsPlayed: save.runsPlayed,
        playerEmoji: player.emoji,
        heroName: player.name,
        heroColorTheme,
        setupActive: false,
      };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function foeColorConflictsWithHero(theme: FoeColorTheme): boolean {
  return heroFoeColorConflicts(heroColorTheme, theme);
}

function getAvailableFoeColorThemes(excludeLast: boolean): FoeColorTheme[] {
  let options = FOE_COLOR_THEMES.filter((theme) => !foeColorConflictsWithHero(theme));
  if (excludeLast && lastFoeColorTheme !== null) {
    const withoutLast = options.filter((theme) => theme !== lastFoeColorTheme);
    if (withoutLast.length > 0) {
      options = withoutLast;
    }
  }
  return options;
}

function pickNextFoeColor(): FoeColorTheme {
  let options = getAvailableFoeColorThemes(true);
  if (options.length === 0) {
    options = getAvailableFoeColorThemes(false);
  }
  if (options.length === 0) {
    options = FOE_COLOR_THEMES.filter((theme) => !foeColorConflictsWithHero(theme));
  }
  const picked = options[Math.floor(Math.random() * options.length)] ?? "amber";
  lastFoeColorTheme = picked;
  foeColorTheme = picked;
  return picked;
}

function ensureFoeColorDistinctFromHero(): void {
  if (!foeColorConflictsWithHero(foeColorTheme)) return;
  pickNextFoeColor();
}

function applyFoeColorTheme(theme: FoeColorTheme): void {
  const panel = el.foePanel.querySelector(".enemy-status");
  if (!panel) return;
  for (const name of FOE_COLOR_THEMES) {
    panel.classList.remove(`foe-theme-${name}`);
  }
  panel.classList.add(`foe-theme-${theme}`);
  el.gameShell.style.setProperty("--foe-accent", getColorTheme(theme).accent);
}

function getSnapshot(): GameSnapshot {
  return {
    player: { ...player },
    foe: foe ? { ...foe } : null,
    turn,
    wave,
    phase,
    hypeLevel,
    foeHypeLevel,
    foeOrderIds: foeOrder.map((f) => f.id),
    foeQueueIds: foeQueue,
    deferredFoeIds,
    foeColorTheme,
    heroColorTheme,
    combatHints: combatHintsForSnapshot(combatHints),
  };
}

function applySnapshot(snapshot: GameSnapshot): void {
  Object.assign(player, snapshot.player);
  foe = snapshot.foe ? { ...snapshot.foe } : null;
  turn = snapshot.turn;
  wave = snapshot.wave;
  phase = snapshot.phase;
  hypeLevel = clampHype(snapshot.hypeLevel ?? 0);
  foeHypeLevel = clampHype(snapshot.foeHypeLevel ?? 0);
  combatHints = createCombatHintsState(snapshot.combatHints ?? {});
  foeOrder = restoreFoeOrder(snapshot.foeOrderIds, snapshot.player.emoji);
  const queueState = restoreFoeQueueState(snapshot, foeOrder);
  foeQueue = queueState.queue;
  deferredFoeIds = queueState.deferred;
  if (snapshot.heroColorTheme) {
    applyHeroColorTheme(snapshot.heroColorTheme);
  }
  foeColorTheme = normalizeFoeColorTheme(snapshot.foeColorTheme);
  lastFoeColorTheme = foeColorTheme;
  ensureFoeColorDistinctFromHero();
  applyFoeColorTheme(foeColorTheme);
  if (wave > CAMPAIGN_WAVES) {
    wave = CAMPAIGN_WAVES;
  }
  syncPlayerForCurrentWave();
  refreshFoeStatsPreservingHp();
  combatHints = maybeArmDanceHintForWave(combatHints, wave);
}

function getHeroLabelForEmoji(emoji: string): string {
  return HEROES.find((h) => h.emoji === emoji)?.label ?? DEFAULT_HERO_LABEL;
}

function resolveSavedHeroName(save: SaveData, emoji: string): string {
  return sanitizeSavedHeroName(
    save.heroName,
    save.heroLabel,
    getHeroLabelForEmoji(emoji)
  );
}

function readHeroNameFromSetup(): string {
  return normalizeHeroName(el.heroNameInput.value);
}

function isHeroColorTheme(value: string): value is HeroColorTheme {
  return isColorThemeId(value);
}

function getHeroColorThemeDefinition(theme: HeroColorTheme) {
  return getColorTheme(theme);
}

function resolveHeroColorTheme(save: SaveData): HeroColorTheme {
  if (save.heroColorTheme && isHeroColorTheme(save.heroColorTheme)) {
    return save.heroColorTheme;
  }
  return DEFAULT_HERO_COLOR_THEME;
}

function applyHeroColorTheme(theme: HeroColorTheme): void {
  const colors = getHeroColorThemeDefinition(theme);
  heroColorTheme = theme;
  el.playerPanel.style.setProperty("--hero", colors.accent);
  el.playerPanel.style.setProperty("--hero-dark", colors.dark);
  el.playerPanel.style.setProperty("--hero-panel-bg", colors.panelBg);
  el.playerPanel.style.setProperty("--hero-plate-bg", colors.plateBg);
  el.playerPanel.style.setProperty("--hero-plate-text", colors.plateText);
  el.playerPanel.style.setProperty("--hero-hp-wrap-bg", colors.hpWrapBg);
  el.playerPanel.style.setProperty("--hero-divider", colors.divider);
  el.gameShell.style.setProperty("--hero", colors.accent);
  el.gameShell.style.setProperty("--hero-dark", colors.dark);
  el.xpFill.style.background = colors.accent;
}

function updateHeroColorTogglePreview(): void {
  const colors = getHeroColorThemeDefinition(pendingHeroColorTheme);
  const swatch = el.heroColorToggle.querySelector(
    ".setup-color-toggle-swatch"
  ) as HTMLElement | null;
  swatch?.style.setProperty("--swatch-color", colors.accent);
  el.heroColorToggle.setAttribute("aria-label", `Card color: ${colors.label}`);
}

function openHeroColorPopup(): void {
  el.heroColorPopup.classList.remove("hidden");
  el.heroColorToggle.setAttribute("aria-expanded", "true");
}

function closeHeroColorPopup(): void {
  el.heroColorPopup.classList.add("hidden");
  el.heroColorToggle.setAttribute("aria-expanded", "false");
}

function toggleHeroColorPopup(): void {
  if (el.heroColorPopup.classList.contains("hidden")) {
    openHeroColorPopup();
  } else {
    closeHeroColorPopup();
  }
}

function bindSetupColorPicker(): void {
  if (setupColorPickerBound) return;
  setupColorPickerBound = true;
  el.heroColorToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleHeroColorPopup();
  });
  document.addEventListener("click", (e) => {
    if (el.heroColorPopup.classList.contains("hidden")) return;
    const target = e.target as Node;
    if (
      !el.heroColorPopup.contains(target) &&
      !el.heroColorToggle.contains(target)
    ) {
      closeHeroColorPopup();
    }
  });
}

function readHeroColorThemeFromSetup(): HeroColorTheme {
  return pendingHeroColorTheme;
}

function syncHeroColorSwatchSelection(): void {
  for (const btn of el.heroColorSwatches.querySelectorAll<HTMLButtonElement>(
    ".setup-color-swatch"
  )) {
    btn.classList.toggle("selected", btn.dataset.theme === pendingHeroColorTheme);
    btn.setAttribute(
      "aria-checked",
      btn.dataset.theme === pendingHeroColorTheme ? "true" : "false"
    );
  }
}

function buildHeroColorSwatches(): void {
  if (!el.heroColorSwatches) return;
  el.heroColorSwatches.replaceChildren();
  for (const theme of COLOR_THEMES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "setup-color-swatch";
    btn.dataset.theme = theme.id;
    btn.style.setProperty("--swatch-color", theme.accent);
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-label", theme.label);
    btn.setAttribute("aria-checked", theme.id === pendingHeroColorTheme ? "true" : "false");
    if (theme.id === pendingHeroColorTheme) {
      btn.classList.add("selected");
    }
    btn.addEventListener("click", () => {
      pendingHeroColorTheme = theme.id;
      applyHeroColorTheme(theme.id);
      syncHeroColorSwatchSelection();
      updateHeroColorTogglePreview();
      closeHeroColorPopup();
      persistSetupDraft();
    });
    el.heroColorSwatches.appendChild(btn);
  }
  updateHeroColorTogglePreview();
}

function getSetupBlockers(): string[] {
  return getSetupBlockersForInput(pendingHeroEmoji, el.heroNameInput.value);
}

function updateSetupStartButton(): void {
  const blockers = getSetupBlockers();
  const canStart = blockers.length === 0;
  const nameMissing = blockers.includes("enter your name");
  const hintBlockers = blockers.filter((blocker) => blocker !== "enter your name");

  el.setupStartBtn.disabled = false;
  el.setupStartBtn.classList.toggle("cmd-start-ready", canStart);
  el.heroNameInput.classList.toggle(
    "setup-name-input--highlight",
    setupHintForced && nameMissing
  );
  el.heroNameInput.setAttribute(
    "aria-invalid",
    setupHintForced && nameMissing ? "true" : "false"
  );

  if (canStart || !setupHintForced) {
    if (canStart) {
      setupHintForced = false;
    }
    el.setupHint.hidden = true;
    el.setupHint.textContent = "";
    el.setupHint.classList.remove("setup-hint-error");
    return;
  }

  if (hintBlockers.length === 0) {
    el.setupHint.hidden = true;
    el.setupHint.textContent = "";
    el.setupHint.classList.remove("setup-hint-error");
    return;
  }

  el.setupHint.hidden = false;
  el.setupHint.textContent = formatSetupBlockerMessage(hintBlockers);
  el.setupHint.classList.add("setup-hint-error");
}

const SETUP_NAME_TEACH_FLASH_MS = 1400;

function playSetupNameTeachFlash(): void {
  el.heroNameInput.classList.remove("setup-name-teach-flash");
  void el.heroNameInput.offsetWidth;
  el.heroNameInput.classList.add("setup-name-teach-flash");
  window.setTimeout(() => {
    el.heroNameInput.classList.remove("setup-name-teach-flash");
  }, SETUP_NAME_TEACH_FLASH_MS);
}

function showSetupBlockedHint(): void {
  setupHintForced = true;
  updateSetupStartButton();
  if (!readHeroNameFromSetup()) {
    playSetupNameTeachFlash();
    el.heroNameInput.focus();
  } else {
    el.heroPicker.focus();
  }
}

function getPlayerHypeBonus(): number {
  return clampHype(hypeLevel) * HYPE_ATTACK_PER_LEVEL;
}

function getFoeHypeBonus(): number {
  return clampHype(foeHypeLevel) * HYPE_ATTACK_PER_LEVEL;
}

function getEffectiveAttack(): number {
  return player.attack + getPlayerHypeBonus();
}

function getEffectiveFoeAttack(): number {
  if (!foe) return 0;
  return foe.attack + getFoeHypeBonus();
}

function applyPlayerDanceBuff(amount = 1): void {
  gainPlayerHype(amount);
}

function applyFoeDanceBuff(amount = 1): void {
  gainFoeHype(amount);
}

function formatHypeAriaLabel(level: number): string {
  const clamped = clampHype(level);
  return `HYPE ${clamped} of ${HYPE_MAX}`;
}

function clearAllHype(): void {
  hypeLevel = 0;
  foeHypeLevel = 0;
  displayedPlayerHype = 0;
  displayedFoeHype = 0;
}

function syncHypeMaxPresentation(
  wrap: HTMLElement,
  level: number,
  side: "player" | "foe"
): void {
  const previous = side === "player" ? displayedPlayerHype : displayedFoeHype;
  const pres = hypeMaxPresentation(previous, level);
  wrap.classList.toggle("hype-maxed", pres.atMax);
  if (pres.flashReachedMax) {
    wrap.classList.remove("hype-maxed-flash");
    void wrap.offsetWidth;
    wrap.classList.add("hype-maxed-flash");
    window.setTimeout(() => wrap.classList.remove("hype-maxed-flash"), HYPE_METER_FLASH_MS);
  }
  const clamped = clampHype(level);
  if (side === "player") {
    displayedPlayerHype = clamped;
  } else {
    displayedFoeHype = clamped;
  }
}

function applyPlayerHitHypeLoss(): void {
  hypeLevel = Math.max(0, hypeLevel - 1);
}

function applyFoeHitHypeLoss(damageDealt: number): void {
  foeHypeLevel = hypeAfterTakingHit(foeHypeLevel, damageDealt);
}

function renderHypeMeter(
  wrap: HTMLElement,
  statusPanel: HTMLElement,
  bar: HTMLElement,
  fill: HTMLElement,
  label: HTMLElement,
  level: number,
  side: "player" | "foe"
): void {
  const clamped = clampHype(level);
  label.textContent = formatHypeStatLabel(clamped);
  label.setAttribute("aria-label", formatHypeAriaLabel(clamped));
  setHpBar(fill, clamped, HYPE_MAX);
  bar.setAttribute("aria-valuenow", String(clamped));
  bar.setAttribute("aria-valuemax", String(HYPE_MAX));
  statusPanel.classList.toggle("hype-full", clamped >= HYPE_MAX);
  syncHypeMaxPresentation(wrap, level, side);
}

function foeDisplayName(): string {
  return foe?.name ?? "foe";
}

function formatFoeInText(template: string): string {
  return formatFoeMessage(template, foeDisplayName());
}

function renderRecords(): void {
  const save = loadSave();
  el.bestWave.textContent = String(save.bestWave);
  el.runs.textContent = String(save.runsPlayed);
}

function setHpBar(fill: HTMLElement, current: number, max: number): void {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  fill.style.width = `${pct}%`;
}

function playXpBarFullBeat(): Promise<void> {
  const { max } = xpProgressForWave(wave);
  setHpBar(el.xpFill, max, max);
  el.xpText.textContent = "100%";
  el.xpBar.setAttribute("aria-valuenow", String(max));
  el.xpBar.setAttribute("aria-valuemax", String(max));
  return pause(XP_FILL_BEAT_MS);
}

function playFirstHypeFlash(wrap: HTMLElement): void {
  wrap.classList.add("hype-first-dance-flash");
  window.setTimeout(() => {
    wrap.classList.remove("hype-first-dance-flash");
  }, HYPE_METER_FLASH_MS);
}

function gainPlayerHype(amount: number): void {
  if (amount <= 0) {
    return;
  }
  hypeLevel = applyHypeGain(hypeLevel, amount);
}

function gainFoeHype(amount: number): void {
  if (amount <= 0) {
    return;
  }
  foeHypeLevel = applyHypeGain(foeHypeLevel, amount);
}

function syncFirstHypeFlashes(): void {
  const skipPlayer = skipPlayerHypeTeachThisRender;
  skipPlayerHypeTeachThisRender = false;

  if (!skipPlayer) {
    const player = tryCelebrateFirstPlayerHype(combatHints, hypeLevel);
    combatHints = player.flags;
    if (player.flashFirstHype) {
      playFirstHypeFlash(el.playerHypeWrap);
    }
  }

  const foe = tryCelebrateFirstFoeHype(combatHints, foeHypeLevel);
  combatHints = foe.flags;
  if (foe.flashFirstHype) {
    playFirstHypeFlash(el.foeHypeWrap);
  }
}

const HP_TEACH_FLASH_MS = 1400;

function playHpBarTeachFlash(fill: HTMLElement, className: string): void {
  const bar = fill.parentElement;
  if (!bar) {
    return;
  }
  bar.classList.remove(className);
  void bar.offsetWidth;
  bar.classList.add(className);
  window.setTimeout(() => bar.classList.remove(className), HP_TEACH_FLASH_MS);
}

function playFirstHealHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-heal-flash");
}

function playFirstPlayerDamageHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-damage-flash");
}

function playFirstAttackFoeHpFlash(): void {
  playHpBarTeachFlash(el.foeHpFill, "hp-first-attack-flash");
}

function playFirstWaveVictoryHealHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-wave-heal-flash");
}

function syncCombatHintClasses(): void {
  if (!el.healBtn || !el.danceBtn || !el.attackBtn || !el.runBtn) {
    return;
  }
  const hasFoe = foe !== null;
  const showAttack = shouldShowAttackHint(combatHints, phase, hasFoe);
  const showHeal = shouldShowHealHint(
    combatHints,
    player.hp,
    player.maxHp,
    phase,
    hasFoe
  );
  const showRun =
    foe !== null &&
    shouldShowRunHint(
      combatHints,
      player.hp,
      foe.attack,
      foeHypeLevel,
      phase,
      hasFoe
    );
  const showDance = shouldShowDanceHint(
    combatHints,
    player.hp,
    player.maxHp,
    phase,
    hasFoe,
    hypeLevel,
    foe?.attack ?? 0,
    foeHypeLevel
  );
  el.attackBtn.classList.toggle("cmd-hint-flash", showAttack);
  el.healBtn.classList.toggle("cmd-hint-flash", showHeal);
  el.danceBtn.classList.toggle("cmd-hint-flash", showDance);
  el.runBtn.classList.toggle("cmd-hint-flash", showRun);
  el.attackBtn.dataset.combatHint = showAttack ? "on" : "off";
  el.healBtn.dataset.combatHint = showHeal ? "on" : "off";
  el.danceBtn.dataset.combatHint = showDance ? "on" : "off";
  el.runBtn.dataset.combatHint = showRun ? "on" : "off";
}

function briefClass(element: HTMLElement, className: string, ms: number): void {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), ms);
}

function playStageClass(className: string, ms: number): Promise<void> {
  return new Promise((resolve) => {
    el.battleStage.classList.remove(className);
    void el.battleStage.offsetWidth;
    el.battleStage.classList.add(className);
    window.setTimeout(() => {
      el.battleStage.classList.remove(className);
      resolve();
    }, ms);
  });
}

function clearCombatAnimations(): void {
  el.playerPanel.classList.remove(
    "hero-death",
    "hero-death-knockback",
    "hero-victory-wobble",
    "hero-heal",
    "hero-dance"
  );
  el.foePanel.classList.remove(
    "foe-poof",
    "foe-enter",
    "foe-dance",
    "foe-sprite-hidden"
  );
  clearHitReact(el.playerPanel);
  clearHitReact(el.foePanel);
  el.battleStage.classList.remove("stage-death-vignette", "stage-flash-gold");
}

function clearHitReact(panel: HTMLElement): void {
  panel
    .querySelector(".emoji-stack")
    ?.classList.remove(
      "hero-took-hit",
      "hero-took-hit-fatal",
      "foe-took-hit",
      "foe-took-hit-fatal",
      "hero-lunge",
      "foe-lunge"
    );
  panel
    .querySelector(".hit-mark")
    ?.classList.remove("hit-mark-active", "hit-mark-active-kill");
}

function playHeroHeal(): Promise<void> {
  return new Promise((resolve) => {
    el.playerPanel.classList.remove("hero-heal");
    void el.playerPanel.offsetWidth;
    el.playerPanel.classList.add("hero-heal");
    window.setTimeout(() => {
      el.playerPanel.classList.remove("hero-heal");
      resolve();
    }, HEAL_ANIM_MS);
  });
}

function playHeroDance(): void {
  briefClass(el.playerPanel, "hero-dance", DANCE_ANIM_MS);
}

function playFoeDance(): void {
  briefClass(el.foePanel, "foe-dance", DANCE_ANIM_MS);
}

async function playRunExit(): Promise<void> {
  await playFoePoof();
}

function playRunEntrance(): void {
  playFoeEntrance();
}

function playFoeEntrance(): void {
  el.foePanel.classList.remove("foe-sprite-hidden");
  briefClass(el.foePanel, "foe-enter", FOE_ENTRANCE_MS);
}

function playFoePoof(): Promise<void> {
  return new Promise((resolve) => {
    el.foePanel.classList.remove("foe-poof", "foe-sprite-hidden");
    void el.foePanel.offsetWidth;
    el.foePanel.classList.add("foe-poof");
    window.setTimeout(() => {
      el.foePanel.classList.remove("foe-poof");
      el.foePanel.classList.add("foe-sprite-hidden");
      resolve();
    }, FOE_POOF_MS);
  });
}

async function playFoeDefeat(isFinal: boolean): Promise<void> {
  if (isFinal) {
    await Promise.all([playFoePoof(), playStageClass("stage-flash-gold", GOLD_FLASH_MS)]);
    briefClass(el.playerPanel, "hero-victory-wobble", 450);
    await pause(350);
    return;
  }
  await playFoePoof();
}

async function handlePlayerDeath(): Promise<void> {
  await pause(420);
  el.playerPanel.classList.add("hero-death");
  await playStageClass("stage-death-vignette", DEATH_BEAT_MS);
  endGame();
}

function spritePopAnchor(side: "hero" | "foe"): { left: string; top: string } {
  const panel = side === "hero" ? el.playerPanel : el.foePanel;
  const stack = panel.querySelector<HTMLElement>(".sprite-wrap .emoji-stack");
  const layerRect = el.damageLayer.getBoundingClientRect();
  if (!stack || layerRect.width <= 0 || layerRect.height <= 0) {
    const fallbackLeft = side === "hero" ? 22 : 78;
    return { left: `${fallbackLeft}%`, top: "42%" };
  }
  const stackRect = stack.getBoundingClientRect();
  const centerX =
    ((stackRect.left + stackRect.width / 2 - layerRect.left) / layerRect.width) *
    100;
  const gapAbove = Math.max(32, stackRect.height * 0.78);
  const anchorY =
    ((stackRect.top - gapAbove - layerRect.top) / layerRect.height) * 100;
  return { left: `${centerX}%`, top: `${anchorY}%` };
}

function showDamagePop(
  side: "hero" | "foe",
  text: string,
  kind: "damage" | "heal" | "hype",
  anchorOverride?: { left: string; top: string }
): void {
  const pop = document.createElement("span");
  pop.className =
    kind === "heal"
      ? "damage-pop heal-pop"
      : kind === "hype"
        ? "damage-pop hype-pop"
        : "damage-pop";
  pop.textContent = text;
  const anchor = anchorOverride ?? spritePopAnchor(side);
  pop.style.left = anchor.left;
  pop.style.top = anchor.top;
  el.damageLayer.appendChild(pop);
  void pop.offsetWidth;
  window.setTimeout(() => pop.remove(), 900);
}

const LEVEL_UP_NOTICE_MS = 1800;

function playLevelUpNotice(): Promise<void> {
  return new Promise((resolve) => {
    const pop = document.createElement("span");
    pop.className = "level-up-pop";
    pop.textContent = "LEVEL UP";
    pop.setAttribute("role", "status");
    el.heroLevelUpLayer.setAttribute("aria-hidden", "false");
    el.heroLevelUpLayer.appendChild(pop);
    void pop.offsetWidth;
    window.setTimeout(() => {
      pop.remove();
      el.heroLevelUpLayer.setAttribute("aria-hidden", "true");
      resolve();
    }, LEVEL_UP_NOTICE_MS);
  });
}

function pulseWaveHud(): void {
  el.waveBanner.classList.remove("wave-pop");
  void el.waveBanner.offsetWidth;
  el.waveBanner.classList.add("wave-pop");
}

function renderHeroSprite(): void {
  el.playerEmoji.textContent = player.emoji;
  el.playerEmoji.setAttribute("aria-label", player.name);
  el.playerName.textContent = player.name.toUpperCase();
}

function render(): void {
  renderRecords();
  applyHeroColorTheme(heroColorTheme);
  renderHeroSprite();
  el.waveBanner.textContent = `${Math.min(wave, getCampaignLength())} / ${getCampaignLength()}`;
  el.turnLabel.textContent = String(turn);
  const xp = xpProgressForDisplay(wave, phase);
  setHpBar(el.xpFill, xp.current, xp.max);
  el.xpText.textContent = `${xpPercentForDisplay(wave, phase)}%`;
  el.xpBar.setAttribute("aria-valuenow", String(xp.current));
  el.xpBar.setAttribute("aria-valuemax", String(xp.max));

  setHpBar(el.playerHpFill, player.hp, player.maxHp);
  el.playerHpText.textContent = `${player.hp}/${player.maxHp}`;
  el.playerLevel.textContent = String(playerLevelForWave(wave));
  el.playerAttack.textContent = String(getEffectiveAttack());
  renderHypeMeter(
    el.playerHypeWrap,
    el.playerStatus,
    el.playerHypeBar,
    el.playerHypeFill,
    el.playerBuff,
    hypeLevel,
    "player"
  );

  const playerHpBar = el.playerPanel.querySelector(".hp-bar");
  playerHpBar?.classList.toggle("hp-low", player.hp / player.maxHp < 0.3);

  if (foe && !suppressFoePanelRender) {
    applyFoeColorTheme(foeColorTheme);
    el.foeName.textContent = foe.name.toUpperCase();
    el.foeLevel.textContent = String(foe.level);
    el.foeAttack.textContent = String(getEffectiveFoeAttack());
    renderHypeMeter(
      el.foeHypeWrap,
      el.foeStatus,
      el.foeHypeBar,
      el.foeHypeFill,
      el.foeBuff,
      foeHypeLevel,
      "foe"
    );
    el.foeEmoji.textContent = foe.emoji;
    el.foeEmoji.setAttribute("aria-label", foe.name);
    setHpBar(el.foeHpFill, foe.hp, foe.maxHp);
    el.foeHpText.textContent = `${foe.hp}/${foe.maxHp}`;
    const foeHpBar = el.foePanel.querySelector(".hp-bar");
    foeHpBar?.classList.toggle("hp-low", foe.hp / foe.maxHp < 0.3);
  } else {
    el.foeStatus.classList.remove("hype-full");
  }

  const inEndScreen = phase === "gameover" || phase === "victory";
  if (phase !== "victory") {
    stopVictoryCelebration(el.victoryEmojiLayer);
  }
  el.gameOver.classList.toggle("hidden", !inEndScreen);
  el.gameOver.classList.toggle("game-victory", phase === "victory");
  el.gameOverTag.textContent = phase === "victory" ? "YOU WIN!" : "GAME OVER";
  el.restartLabel.textContent = phase === "victory" ? "Play Again?" : "Try Again?";
  el.actions.classList.toggle("hidden", inEndScreen);
  el.turnLabel.classList.toggle("hidden", inEndScreen);
  syncFirstHypeFlashes();
  syncCombatHintClasses();
}

function logLine(text: string, kind: "info" | "player" | "foe" | "win" | "lose" = "info"): void {
  el.battleText.textContent = text;
  el.battleText.className = `battle-text battle-${kind}`;
  revealBattleLog();
}

function logBattleLines(
  primary: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" },
  secondary: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" }
): void {
  setBattleLines(el.battleText, [primary, secondary]);
  revealBattleLog();
}

function logDanceLines(opener: string, reaction: string, tail: string): void {
  setBattleLines(el.battleText, [
    { text: opener, kind: "player" },
    { text: reaction, kind: "foe" },
  ]);
  appendBattleHypeTail(el.battleText, tail);
  revealBattleLog();
}

function revealBattleLog(): void {
  el.battleText.closest(".dialog-box")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function combatGateState(): CombatGateState {
  return {
    phase,
    combatBusy,
    awaitingFoeResponse,
    combatActionGeneration,
    playerHp: player.hp,
    hasFoe: foe !== null,
  };
}

function applyCombatGateState(state: CombatGateState): void {
  combatBusy = state.combatBusy;
  awaitingFoeResponse = state.awaitingFoeResponse;
  combatActionGeneration = state.combatActionGeneration;
}

function canUseCombatActions(): boolean {
  return canUseCombatActionsGate(combatGateState());
}

/** Returns action generation id when locked; null if actions are not allowed. */
function lockCombat(): number | null {
  const locked = tryLockCombatGate(combatGateState());
  if (!locked.ok) {
    return null;
  }
  applyCombatGateState(locked.state);
  return locked.generation;
}

function finishCombatAction(generation: number): void {
  applyCombatGateState(finishCombatActionGate(generation, combatGateState()));
  syncCombatHintClasses();
}

function playNextFoeReveal(
  primary: { text: string; kind: "player" },
  secondary: { text: string; kind: "foe" }
): void {
  applyFoeColorTheme(foeColorTheme);
  render();
  playFoeEntrance();
  logBattleLines(primary, secondary);
}

async function transitionToNextWave(
  previousFoeName: string,
  transition: "flee" | "defeat",
  entrance: "run" | "foe" = "foe",
  exitAnimPromise?: Promise<void>,
  knownDefeatVerb?: string
): Promise<void> {
  const defeatVerb =
    transition === "defeat" ? (knownDefeatVerb ?? nextDefeatVerb()) : undefined;
  const fleeWithExitAnim = exitAnimPromise !== undefined;
  const fledId = foe?.id;

  if (fleeWithExitAnim) {
    logLine(`You run away from ${previousFoeName},`, "player");
  } else if (!(transition === "defeat" && knownDefeatVerb)) {
    const actionText =
      transition === "flee"
        ? `You run away from ${previousFoeName},`
        : `You ${defeatVerb} ${previousFoeName},`;

    logLine(actionText, "player");
  }

  turn = 1;
  pickNextFoeColor();
  let flashWaveVictoryHealHp = false;

  if (transition === "defeat") {
    const completedWave = wave;
    const isLevelBandFinaleWave = isLevelBandFinale(
      completedWave,
      getCampaignLength()
    );
    if (isLevelBandFinaleWave) {
      await playXpBarFullBeat();
    }

    wave += 1;
    const levelBefore = playerLevelForWave(wave - 1);
    const hpBeforeHeal = player.hp;
    const maxHpBeforeHeal = player.maxHp;
    const advanced = advanceFoeQueueAfterVictory(
      foeQueue,
      deferredFoeIds,
      foeOrder,
      wave
    );
    foeQueue = advanced.queue;
    deferredFoeIds = advanced.deferred;
    const playerLevel = syncPlayerForCurrentWave({
      grantMaxHpIncrease: true,
      healToMax: true,
    });
    applyWaveVictoryHealPop(hpBeforeHeal);
    const waveHealFlash = tryCelebrateFirstWaveVictoryHeal(
      combatHints,
      completedWave,
      hpBeforeHeal,
      player.hp
    );
    combatHints = waveHealFlash.flags;
    flashWaveVictoryHealHp = waveHealFlash.flashHp;
    combatHints = dismissHealHintIfWasLow(
      combatHints,
      hpBeforeHeal,
      maxHpBeforeHeal
    );
    combatHints = onVictoryForHints(combatHints);
    foe = spawnFoeFromQueue();
    combatHints = onNextFoeForHints(combatHints);
    combatHints = maybeArmDanceHintForWave(combatHints, wave);
    foeHypeLevel = 0;
    pulseWaveHud();

    if (playerLevel > levelBefore) {
      render();
      void playLevelUpNotice();
    }
  } else if (fledId) {
    const advanced = advanceFoeQueueAfterFlee(
      foeQueue,
      deferredFoeIds,
      fledId,
      foeOrder,
      wave
    );
    foeQueue = advanced.queue;
    deferredFoeIds = advanced.deferred;
    foe = spawnFoeFromQueue();
    combatHints = onNextFoeForHints(combatHints);
    combatHints = maybeArmDanceHintForWave(combatHints, wave);
    foeHypeLevel = 0;
    pulseWaveHud();
  }

  if (fleeWithExitAnim) {
    suppressFoePanelRender = true;
    render();
    await exitAnimPromise;
    suppressFoePanelRender = false;
    playNextFoeReveal(
      { text: `You run away from ${previousFoeName},`, kind: "player" },
      { text: `but you run into ${foe!.name}!`, kind: "foe" }
    );
  } else {
    playNextFoeReveal(
      { text: `You ${defeatVerb} ${previousFoeName},`, kind: "player" },
      { text: `but ${foe!.name} appears!`, kind: "foe" }
    );
  }

  if (flashWaveVictoryHealHp) {
    playFirstWaveVictoryHealHpFlash();
  }

  persist();
}

function clearLog(): void {
  logLine("What will you do?", "info");
}

function rollDamage(max: number): number {
  return randomDamage(max, Math.random);
}

function rollAndApplyPlayerHeal(): {
  rolled: number;
  gained: number;
  hpBefore: number;
} {
  const hpBefore = player.hp;
  const result = applyPlayerHealRoll(
    hpBefore,
    player.maxHp,
    getHealMax(),
    Math.random
  );
  player.hp = result.hp;
  return { rolled: result.rolled, gained: result.gained, hpBefore };
}

function showPlayerHealRoll(rolled: number): void {
  showDamagePop("hero", `+${rolled}`, "heal");
  void playHeroHeal();
}

function nextDefeatVerb(): string {
  const result = advanceDefeatVerb(defeatVerbIndex, DEFEAT_VERBS);
  defeatVerbIndex = result.nextIndex;
  return result.verb;
}

function startWave(): void {
  syncPlayerForCurrentWave({ healToMax: wave === 1 });
  if (foeQueue.length === 0) {
    foeQueue = buildInitialFoeQueue(foeOrder);
    deferredFoeIds = [];
  }
  pickNextFoeColor();
  foe = spawnFoeFromQueue();
  foeHypeLevel = 0;
  combatHints = maybeArmDanceHintForWave(combatHints, wave);
  pulseWaveHud();
  applyFoeColorTheme(foeColorTheme);
  setBattleLines(el.battleText, [{ text: `${foe.name} appears!`, kind: "foe" }]);
  revealBattleLog();
  render();
  playFoeEntrance();
  persist();
}

function updateRecordsOnGameOver(): void {
  const save = loadSave();
  const completedWave = Math.max(0, wave - 1);
  save.bestWave = Math.max(save.bestWave, completedWave);
  save.runsPlayed += 1;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      bestWave: save.bestWave,
      runsPlayed: save.runsPlayed,
      playerEmoji: player.emoji,
      heroName: player.name,
    })
  );

  const waveText = completedWave === 1 ? "1 wave" : `${completedWave} waves`;
  el.gameOverSummary.textContent = `You reached ${waveText}.`;
}

function updateRecordsOnVictory(): void {
  const save = loadSave();
  save.bestWave = Math.max(save.bestWave, getCampaignLength());
  save.runsPlayed += 1;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      bestWave: save.bestWave,
      runsPlayed: save.runsPlayed,
      playerEmoji: player.emoji,
      heroName: player.name,
    })
  );

  el.gameOverSummary.textContent = `All ${CAMPAIGN_WAVES} waves cleared. Critterwave legend.`;
}

function endGame(): void {
  stopVictoryCelebration(el.victoryEmojiLayer);
  applyCombatGateState(blockCombatForScreenEnd(combatGateState()));
  phase = "gameover";
  clearAllHype();
  logLine("You lose! Game over.", "lose");
  updateRecordsOnGameOver();
  persist();
  render();
}

function winCampaign(): void {
  applyCombatGateState(blockCombatForScreenEnd(combatGateState()));
  phase = "victory";
  clearAllHype();
  logLine(`Wave ${CAMPAIGN_WAVES} cleared! Total victory!`, "win");
  updateRecordsOnVictory();
  startVictoryCelebration(el.victoryEmojiLayer);
  persist();
  render();
}

function hasDebugWin(): boolean {
  return (
    isDebugHost(window.location.hostname) &&
    new URLSearchParams(window.location.search).get("debug") === "win"
  );
}

function triggerDebugWin(): void {
  hideSetup();

  if (!player.emoji) {
    const first = HEROES[0]!;
    applyHeroChoice(first.emoji, first.label);
    applyHeroColorTheme(resolveHeroColorTheme(loadSave()));
  }

  wave = getCampaignLength();
  clearLog();
  winCampaign();
}

function mountDebugHooks(): void {
  if (!isDebugHost(window.location.hostname)) {
    return;
  }
  window.critterwave = { win: triggerDebugWin };
  console.info(
    "[critterwave] Debug: critterwave.win() — or load with ?debug=win"
  );
}

function maybeRunDebugWin(): void {
  if (!hasDebugWin()) {
    return;
  }
  mountDebugHooks();
  triggerDebugWin();
}

async function winWave(defeatVerb: string): Promise<void> {
  if (!foe) return;

  const defeatedFoe = foe.name;
  if (wave >= getCampaignLength()) {
    winCampaign();
    return;
  }

  await transitionToNextWave(defeatedFoe, "defeat", "foe", undefined, defeatVerb);
}

function playHitExchange(
  attacker: "hero" | "foe",
  victim: "hero" | "foe",
  fatal = false
): void {
  const attackerPanel = attacker === "hero" ? el.playerPanel : el.foePanel;
  const victimPanel = victim === "hero" ? el.playerPanel : el.foePanel;
  const attackerStack = attackerPanel.querySelector<HTMLElement>(".emoji-stack");
  const victimStack = victimPanel.querySelector<HTMLElement>(".emoji-stack");
  const victimMark = victimPanel.querySelector<HTMLElement>(".hit-mark");
  if (!attackerStack || !victimStack || !victimMark) return;

  const ms = fatal ? 450 : 400;
  const lungeClass = attacker === "hero" ? "hero-lunge" : "foe-lunge";
  const hitClass =
    victim === "hero"
      ? fatal
        ? "hero-took-hit-fatal"
        : "hero-took-hit"
      : fatal
        ? "foe-took-hit-fatal"
        : "foe-took-hit";

  briefClass(attackerStack, lungeClass, ms);
  briefClass(victimStack, hitClass, ms);
  briefClass(victimMark, fatal ? "hit-mark-active-kill" : "hit-mark-active", ms);
}

function applyFoeCounterAttack(): number | null {
  if (!foe || foe.hp <= 0) return null;

  const hit = rollDamage(getEffectiveFoeAttack());
  player.hp = Math.max(0, player.hp - hit);
  if (hit > 0) {
    const damageHint = recordPlayerDamageForHints(combatHints);
    combatHints = damageHint.flags;
    if (damageHint.flashHp) {
      playFirstPlayerDamageHpFlash();
    }
  }
  applyPlayerHitHypeLoss();

  if (player.hp > 0) {
    turn += 1;
  }

  return hit;
}

function playFoeCounterHitVisuals(hit: number, fatal: boolean): void {
  // Hero's hit react may still be on the foe stack; clear so foe-lunge doesn't fight foe-took-hit.
  clearHitReact(el.foePanel);
  clearHitReact(el.playerPanel);
  showDamagePop("hero", `-${hit}`, "damage");
  playHitExchange("foe", "hero", fatal);
}

function scheduleFoeCounterHitVisuals(hit: number, generation: number): void {
  const fatal = player.hp <= 0;
  window.setTimeout(() => {
    if (isFollowUpTimerStale(generation, combatGateState(), phase)) {
      finishCombatAction(generation);
      return;
    }
    playFoeCounterHitVisuals(hit, fatal);
    if (fatal) {
      void handlePlayerDeath().finally(() => finishCombatAction(generation));
      return;
    }
    finishCombatAction(generation);
  }, FOE_FOLLOW_UP_DELAY_MS);
}

function scheduleFoeDanceFollowUp(
  generation: number,
  opts: { foeDances: boolean; foeGain: number; foeCapped: boolean }
): void {
  const delay = foeFollowUpDelayMs(opts.foeDances);
  window.setTimeout(() => {
    if (isFollowUpTimerStale(generation, combatGateState(), phase)) {
      finishCombatAction(generation);
      return;
    }
    if (opts.foeDances) {
      playFoeDance();
    }
    if (opts.foeGain > 0) {
      showDamagePop("foe", "HYPE", "hype");
    }
    finishCombatAction(generation);
  }, delay);
}

function onAttack(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = foe!;

  const firstAttack = !combatHints.dismissedAttackHint;
  combatHints = recordAttackForHints(combatHints);
  if (firstAttack) {
    playFirstAttackFoeHpFlash();
  }

  const hit = rollDamage(getEffectiveAttack());
  currentFoe.hp = Math.max(0, currentFoe.hp - hit);
  if (hit > 0) {
    applyFoeHitHypeLoss(hit);
  }
  const foeKilled = currentFoe.hp <= 0;
  showDamagePop("foe", `-${hit}`, "damage");
  playHitExchange("hero", "foe", foeKilled);

  if (foeKilled) {
    const defeatVerb = nextDefeatVerb();
    logLine(`You ${defeatVerb} ${currentFoe.name},`, "player");
    render();
    const isFinal = wave >= getCampaignLength();
    void playFoeDefeat(isFinal)
      .then(async () => {
        if (isFinal) {
          applyWaveVictoryHeal();
          await playXpBarFullBeat();
          winCampaign();
        } else {
          return winWave(defeatVerb);
        }
      })
      .finally(() => finishCombatAction(generation));
    return;
  }

  applyCombatGateState(beginAwaitingFoeResponse(combatGateState()));
  const counterHit = applyFoeCounterAttack();
  syncCombatHintClasses();
  if (counterHit === null) {
    finishCombatAction(generation);
    return;
  }

  logBattleLines(
    { text: `You hit ${currentFoe.name} for ${hit} damage.`, kind: "player" },
    { text: `${currentFoe.name} hits you for ${counterHit} damage.`, kind: "foe" }
  );
  render();
  persist();
  scheduleFoeCounterHitVisuals(counterHit, generation);
}

function applyHealPop(gained: number): void {
  if (gained <= 0) {
    return;
  }
  showDamagePop("hero", `+${gained}`, "heal");
  render();
  void playHeroHeal();
}

function applyWaveVictoryHealPop(hpBefore: number): void {
  applyHealPop(player.hp - hpBefore);
}

function applyFleeHeal(): void {
  const { rolled, gained } = rollAndApplyPlayerHeal();
  showPlayerHealRoll(rolled);
  if (gained > 0) {
    combatHints = dismissHealHint(combatHints);
    render();
    persist();
  }
}

function applyWaveVictoryHeal(): void {
  const before = player.hp;
  player.hp = healHpAfterWaveVictory(before, player.maxHp);
  applyWaveVictoryHealPop(before);
}

function onHeal(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = foe!;

  skipPlayerHypeTeachThisRender = true;

  const { rolled, gained, hpBefore } = rollAndApplyPlayerHeal();
  const firstMeaningfulHeal =
    !combatHints.dismissedHealHint && gained > 0;
  combatHints = recordHealForHints(combatHints, { armDance: gained > 0 });
  if (firstMeaningfulHeal) {
    playFirstHealHpFlash();
  }
  showPlayerHealRoll(rolled);

  const healGrantsHype = hpBefore < player.maxHp;
  const deferHealHypeGain = healGrantsHype && hypeLevel === 0;

  if (healGrantsHype && !deferHealHypeGain) {
    gainPlayerHype(1);
  }

  applyCombatGateState(beginAwaitingFoeResponse(combatGateState()));
  const counterHit = applyFoeCounterAttack();

  if (deferHealHypeGain && counterHit === null) {
    gainPlayerHype(1);
  }
  syncCombatHintClasses();
  if (counterHit === null) {
    render();
    persist();
    finishCombatAction(generation);
    return;
  }

  logBattleLines(
    { text: `You healed yourself for ${rolled} HP.`, kind: "player" },
    { text: `${currentFoe.name} hits you for ${counterHit} damage.`, kind: "foe" }
  );
  render();
  persist();
  scheduleFoeCounterHitVisuals(counterHit, generation);
}

function onDance(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = foe!;

  combatHints = recordDanceForHints(combatHints);

  const response = pickRandomDanceResponse();
  const attemptedPlayerGain = getPlayerHypeGain(response);
  const attemptedFoeGain = getFoeHypeGain(response);
  const joins = response.foeJoins === true;

  const actualPlayerGain = Math.min(attemptedPlayerGain, hypeHeadroom(hypeLevel));
  const actualFoeGain = Math.min(attemptedFoeGain, hypeHeadroom(foeHypeLevel));
  const playerCapped =
    attemptedPlayerGain > 0 && actualPlayerGain < attemptedPlayerGain;
  const foeCapped = attemptedFoeGain > 0 && actualFoeGain < attemptedFoeGain;

  if (actualPlayerGain > 0) {
    applyPlayerDanceBuff(actualPlayerGain);
  }
  if (actualFoeGain > 0) {
    applyFoeDanceBuff(actualFoeGain);
  }

  const opener = pickRandomDanceOpener();
  const reaction = formatFoeInText(response.message);
  const tail = formatDanceHypeTail(actualPlayerGain, actualFoeGain, currentFoe.name, {
    playerCapped,
    foeCapped,
  });

  playHeroDance();
  logDanceLines(opener, reaction, tail);

  const foeDances = joins || attemptedFoeGain > 0;
  if (tail) {
    if (actualPlayerGain > 0) {
      showDamagePop("hero", "HYPE", "hype");
    }
  }

  turn += 1;
  render();
  persist();
  scheduleFoeDanceFollowUp(generation, {
    foeDances,
    foeGain: actualFoeGain,
    foeCapped,
  });
}

function onRun(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = foe!;

  if (wave >= getCampaignLength()) {
    logLine("No fleeing the final foe!", "info");
    finishCombatAction(generation);
    return;
  }

  combatHints = deferDanceHintAfterRun(combatHints);
  combatHints = recordRunForHints(combatHints);
  syncCombatHintClasses();

  clearAllHype();
  applyFleeHeal();
  const fledFoe = currentFoe.name;
  const exitAnimPromise = playRunExit();
  void transitionToNextWave(fledFoe, "flee", "run", exitAnimPromise).finally(() =>
    finishCombatAction(generation)
  );
}

function applyHeroChoice(emoji: string, label: string): void {
  player.emoji = emoji;
  player.name = label;
  pendingHeroEmoji = emoji;
  pendingHeroLabel = label;
}

function firstHeroEmojiForPicker(mobile = isMobileHeroPickerViewport()): string {
  for (const hero of HEROES) {
    if (!isHeroEmojiHiddenInPicker(hero.emoji, mobile)) {
      return hero.emoji;
    }
  }
  return HEROES[0]!.emoji;
}

function resolvePickerHeroEmoji(emoji: string): string {
  const mobile = isMobileHeroPickerViewport();
  if (!isHeroEmojiHiddenInPicker(emoji, mobile)) {
    return emoji;
  }
  return firstHeroEmojiForPicker(mobile);
}

function buildHeroPicker(): void {
  el.heroPicker.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "emoji-picker-grid";
  const mobile = isMobileHeroPickerViewport();

  for (const hero of HEROES) {
    if (isHeroEmojiHiddenInPicker(hero.emoji, mobile)) {
      continue;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-pick";
    btn.dataset.emoji = hero.emoji;
    btn.dataset.label = hero.label;
    btn.setAttribute("aria-label", hero.label);
    const glyph = document.createElement("span");
    glyph.className = "emoji-pick-glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = hero.emoji;
    btn.appendChild(glyph);
    if (hero.emoji === pendingHeroEmoji) {
      btn.classList.add("selected");
    }
    btn.addEventListener("click", () => {
      for (const other of el.heroPicker.querySelectorAll(".emoji-pick")) {
        other.classList.remove("selected");
      }
      btn.classList.add("selected");
        pendingHeroEmoji = hero.emoji;
        pendingHeroLabel = hero.label;
        updateSetupStartButton();
        persistSetupDraft();
      });
      grid.appendChild(btn);
  }

  el.heroPicker.appendChild(grid);
}

function showSetup(): void {
  const save = loadSave();
  closeHeroColorPopup();
  pendingHeroEmoji = resolvePickerHeroEmoji(save.playerEmoji ?? player.emoji);
  pendingHeroLabel = getHeroLabelForEmoji(pendingHeroEmoji);
  setupHintForced = false;
  buildHeroPicker();
  el.heroNameInput.value = save.heroName ?? "";
  pendingHeroColorTheme = resolveHeroColorTheme(save);
  buildHeroColorSwatches();
  applyHeroColorTheme(pendingHeroColorTheme);
  updateSetupStartButton();
  el.setupOverlay.classList.remove("hidden");
  el.gameShell.classList.add("setup-active");
  persistSetupDraft();
}

function hideSetup(): void {
  closeHeroColorPopup();
  el.setupOverlay.classList.add("hidden");
  el.gameShell.classList.remove("setup-active");
}

function confirmHeroAndStart(): boolean {
  const blockers = getSetupBlockers();
  if (blockers.length > 0) {
    showSetupBlockedHint();
    return false;
  }
  const heroName = readHeroNameFromSetup();
  if (!heroName) {
    showSetupBlockedHint();
    return false;
  }
  applyHeroChoice(pendingHeroEmoji, heroName);
  applyHeroColorTheme(readHeroColorThemeFromSetup());
  hideSetup();
  persistStatsOnly();
  if (foe) {
    resetGame();
  }
  return true;
}

function resetGame(): void {
  turn = 1;
  wave = 1;
  defeatVerbIndex = 0;
  foeOrder = buildFoeOrder(player.emoji);
  foeQueue = buildInitialFoeQueue(foeOrder);
  deferredFoeIds = [];
  syncPlayerForCurrentWave({ healToMax: true });
  clearAllHype();
  lastFoeColorTheme = null;
  resetDancePicker();
  combatHints = createCombatHintsState();
  phase = "combat";
  applyCombatGateState(resetCombatGate(combatGateState()));
  clearCombatAnimations();
  stopVictoryCelebration(el.victoryEmojiLayer);
  el.gameOver.classList.add("hidden");
  clearLog();
  logLine("A new adventure begins.", "info");
  startWave();
}

async function startNewGame(): Promise<void> {
  const confirmed = await showConfirm({
    title: "Start a new run?",
    message:
      "Your high score and run count stay. This run can't be continued.",
    confirmLabel: "New Run",
  });
  if (!confirmed) {
    return;
  }
  persistStatsOnly();
  foe = null;
  phase = "combat";
  stopVictoryCelebration(el.victoryEmojiLayer);
  el.gameOver.classList.add("hidden");
  showSetup();
}

async function resetStats(): Promise<void> {
  const confirmed = await showConfirm({
    title: "Delete everything?",
    message:
      "Permanently delete your critter and all-time play history. This can't be undone.",
    confirmLabel: "Clear Data",
    danger: true,
  });
  if (!confirmed) {
    return;
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      bestWave: 0,
      runsPlayed: 0,
    })
  );
  renderRecords();
  foe = null;
  phase = "combat";
  stopVictoryCelebration(el.victoryEmojiLayer);
  el.gameOver.classList.add("hidden");
  showSetup();
}

function bindActions(): void {
  el.actions.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    if (!canUseCombatActions()) return;

    switch (action) {
      case "attack":
        onAttack();
        break;
      case "heal":
        onHeal();
        break;
      case "dance":
        onDance();
        break;
      case "run":
        onRun();
        break;
    }
  });

  el.restartBtn.addEventListener("click", () => {
    resetGame();
  });

  el.quitBtn.addEventListener("click", () => {
    void startNewGame();
  });

  el.resetStatsBtn.addEventListener("click", () => {
    void resetStats();
  });

  el.heroNameInput.addEventListener("input", () => {
    updateSetupStartButton();
    persistSetupDraft();
  });
  bindSetupColorPicker();

  el.setupStartBtn.addEventListener("click", () => {
    if (!confirmHeroAndStart()) {
      return;
    }
    if (!foe) {
      beginGame();
    } else {
      render();
      persist();
    }
  });
}

function beginGame(): void {
  const save = loadSave();
  if (save.playerEmoji) {
    applyHeroChoice(
      save.playerEmoji,
      resolveSavedHeroName(save, save.playerEmoji)
    );
  }

  const snapshot = loadSnapshot();
  if (snapshot && snapshot.phase === "combat" && snapshot.foe) {
    applySnapshot(snapshot);
    clearLog();
    logBattleLines(
      { text: "Welcome back — your run was restored.", kind: "info" },
      {
        text: `It's your turn against ${foe!.name}!`,
        kind: "player",
      }
    );
    render();
    persist();
    return;
  }

  if (snapshot?.phase === "gameover" || snapshot?.phase === "victory") {
    resetGame();
    return;
  }

  resetGame();
}

function finishBoot(): void {
  document.body.classList.remove("is-booting");
}

function init(): void {
  bindConfirmDialog();
  bindActions();
  renderRecords();

  const save = loadSave();
  if (save.setupActive) {
    showSetup();
    finishBoot();
    maybeRunDebugWin();
    return;
  }

  if (!save.playerEmoji) {
    showSetup();
    finishBoot();
    maybeRunDebugWin();
    return;
  }

  applyHeroChoice(
    save.playerEmoji,
    resolveSavedHeroName(save, save.playerEmoji)
  );
  applyHeroColorTheme(resolveHeroColorTheme(save));
  beginGame();
  finishBoot();
  maybeRunDebugWin();
}

init();
