import { FOES as FOES_RAW } from "./foes-data.js";
import { assertAlliterativeName } from "./alliteration.js";
import { assertHeroPickerOrderCovers, heroPickerOrderIndex } from "./hero-groups.js";
const FOE_COLOR_THEMES = ["amber", "rose", "sky", "coral", "fuchsia"];
const FOE_THEME_ACCENTS = {
    amber: "#facc15",
    rose: "#fb7185",
    sky: "#38bdf8",
    coral: "#fb923c",
    fuchsia: "#e879f9",
};
function normalizeFoeColorTheme(theme) {
    if (theme && FOE_COLOR_THEMES.includes(theme)) {
        return theme;
    }
    return "amber";
}
const HERO_COLOR_THEMES = [
    {
        id: "green",
        label: "Green",
        accent: "#4ade80",
        dark: "#166534",
        plateText: "#dcfce7",
        panelBg: "rgba(22, 101, 52, 0.22)",
        plateBg: "rgba(22, 101, 52, 0.92)",
        hpWrapBg: "rgba(22, 101, 52, 0.38)",
        divider: "rgba(74, 222, 128, 0.45)",
    },
    {
        id: "amber",
        label: "Gold",
        accent: "#facc15",
        dark: "#854d0e",
        plateText: "#fef9c3",
        panelBg: "rgba(133, 77, 14, 0.22)",
        plateBg: "rgba(133, 77, 14, 0.92)",
        hpWrapBg: "rgba(133, 77, 14, 0.38)",
        divider: "rgba(250, 204, 21, 0.45)",
    },
    {
        id: "rose",
        label: "Rose",
        accent: "#fb7185",
        dark: "#881337",
        plateText: "#ffe4e6",
        panelBg: "rgba(136, 19, 55, 0.22)",
        plateBg: "rgba(136, 19, 55, 0.92)",
        hpWrapBg: "rgba(136, 19, 55, 0.38)",
        divider: "rgba(251, 113, 133, 0.45)",
    },
    {
        id: "sky",
        label: "Sky",
        accent: "#38bdf8",
        dark: "#0c4a6e",
        plateText: "#e0f2fe",
        panelBg: "rgba(12, 74, 110, 0.22)",
        plateBg: "rgba(12, 74, 110, 0.92)",
        hpWrapBg: "rgba(12, 74, 110, 0.38)",
        divider: "rgba(56, 189, 248, 0.45)",
    },
    {
        id: "coral",
        label: "Coral",
        accent: "#fb923c",
        dark: "#9a3412",
        plateText: "#ffedd5",
        panelBg: "rgba(154, 52, 18, 0.22)",
        plateBg: "rgba(154, 52, 18, 0.92)",
        hpWrapBg: "rgba(154, 52, 18, 0.38)",
        divider: "rgba(251, 146, 60, 0.45)",
    },
    {
        id: "fuchsia",
        label: "Pink",
        accent: "#f472b6",
        dark: "#9d174d",
        plateText: "#fce7f3",
        panelBg: "rgba(157, 23, 77, 0.22)",
        plateBg: "rgba(157, 23, 77, 0.92)",
        hpWrapBg: "rgba(157, 23, 77, 0.38)",
        divider: "rgba(244, 114, 182, 0.45)",
    },
];
const DEFAULT_HERO_COLOR_THEME = "green";
const STORAGE_KEY = "critterwave-v1";
const LEGACY_STORAGE_KEYS = ["goblinwave-v4", "goblinwave-v1"];
const CAMPAIGN_WAVES = 100;
const DEFEAT_VERBS = [
    "defeated",
    "vanquished",
    "crushed",
    "destroyed",
    "bested",
    "obliterated",
    "smote",
    "flattened",
    "annihilated",
    "pulverized",
    "routed",
    "trounced",
    "clobbered",
    "walloped",
    "thrashed",
];
const HERO_NAME_MAX_LENGTH = 16;
const HYPE_ATTACK_PER_LEVEL = 1;
const COUNTER_ATTACK_DELAY_MS = 1000;
const FOE_POOF_MS = 450;
const FOE_ENTRANCE_MS = 550;
const DEATH_BEAT_MS = 1200;
const GOLD_FLASH_MS = 650;
const KILL_KNOCKBACK_SETTLE_MS = 180;
const HEAL_ANIM_MS = 420;
const DANCE_ANIM_MS = 550;
const DEFAULT_HERO_EMOJI = "🐱";
const DEFAULT_HERO_LABEL = "Cat";
function assertUniqueEmojis(entries) {
    const seen = new Set();
    for (const entry of entries) {
        if (seen.has(entry.emoji)) {
            throw new Error(`Duplicate emoji ${entry.emoji} (${entry.name ?? entry.label})`);
        }
        seen.add(entry.emoji);
    }
}
function heroLabelFromFoeName(name) {
    const words = name.trim().split(/\s+/);
    return words.slice(1).join(" ") || words[0];
}
function heroesFromFoes(foes) {
    return foes.map((foe) => ({
        id: foe.id,
        label: heroLabelFromFoeName(foe.name),
        emoji: foe.emoji,
    }));
}
const FOES = FOES_RAW.map((f) => ({ ...f }));
const HEROES = heroesFromFoes(FOES).sort((a, b) => heroPickerOrderIndex(a.emoji) - heroPickerOrderIndex(b.emoji));
for (const foe of FOES) {
    assertAlliterativeName(foe.name);
}
assertUniqueEmojis(FOES);
assertHeroPickerOrderCovers(FOES.map((f) => f.emoji));
function shuffleFoes(roster) {
    const order = roster.map((f) => ({ ...f }));
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}
function foesForHero(heroEmoji) {
    return FOES.filter((f) => f.emoji !== heroEmoji);
}
function buildFoeOrder(heroEmoji) {
    return shuffleFoes(foesForHero(heroEmoji));
}
function getCampaignLength() {
    return CAMPAIGN_WAVES;
}
function restoreFoeOrder(ids, heroEmoji) {
    const expected = foesForHero(heroEmoji);
    if (ids?.length === expected.length) {
        const byId = new Map(FOES.map((f) => [f.id, f]));
        const restored = ids
            .map((id) => byId.get(id))
            .filter((f) => !!f && f.emoji !== heroEmoji);
        if (restored.length === expected.length)
            return restored;
    }
    return buildFoeOrder(heroEmoji);
}
const danceResponses = [
    { message: "{foe} boos loudly.", playerHype: 0 },
    { message: "{foe} crosses their arms and watches silently.", playerHype: 0 },
    { message: "{foe} refuses to acknowledge your performance.", playerHype: 0 },
    { message: "{foe} looks disappointed in you personally.", playerHype: 0 },
    { message: "{foe} throws a tomato at you.", playerHype: 0 },
    { message: "{foe} rates your performance a 7/10.", playerHype: 0 },
    { message: "{foe} checks their watch pointedly.", playerHype: 0 },
    { message: "{foe} yawns mid-dance.", playerHype: 0 },
    { message: "{foe} holds up a little sign that says 2/10.", playerHype: 0 },
    { message: "{foe} pretends to take an important phone call.", playerHype: 0 },
    { message: "{foe} slowly backs away from the dance floor.", playerHype: 0 },
    { message: "{foe} eats a sandwich, unimpressed.", playerHype: 0 },
    { message: "{foe} claps once, then stops forever.", playerHype: 0 },
    { message: "{foe} puts on sunglasses and stares at the ceiling.", playerHype: 0 },
    { message: "{foe} whispers they've seen better at a funeral.", playerHype: 0 },
    { message: "{foe} claps politely." },
    { message: "{foe} looks confused but supportive." },
    { message: "{foe} tosses you a shiny pebble." },
    { message: "{foe} looks genuinely impressed." },
    { message: "{foe} laughs so hard they snort." },
    { message: "{foe} chants your name." },
    { message: "{foe} gives you a thumbs up." },
    { message: "{foe} looks terrified by your moves." },
    { message: "{foe} pretends to be a dance judge." },
    { message: "{foe} wipes away a tear." },
    { message: "{foe} screams for an encore." },
    { message: "{foe} pulls out a tiny fan and fans you." },
    { message: "{foe} wheezes ONE MORE TIME!" },
    { message: "{foe} weeps with joy." },
    { message: "{foe} whispers teach me with awe." },
    { message: "{foe} faints from sheer awesomeness." },
    { message: "{foe} honks a party horn once, respectfully." },
    { message: "{foe} throws glitter into the air." },
    { message: "{foe} starts dancing with you.", foeJoins: true },
    { message: "{foe} starts stomping rhythmically.", foeJoins: true },
    { message: "{foe} starts shadow dancing.", foeJoins: true },
    { message: "{foe} spins in a circle.", foeJoins: true },
    { message: "{foe} starts headbanging.", foeJoins: true },
    { message: "{foe} tries to copy your moves.", foeJoins: true },
    { message: "{foe} breakdances badly but with heart.", foeJoins: true },
    { message: "{foe} grabs your hand for an awkward two-step.", foeJoins: true },
    { message: "{foe} moonwalks three inches, triumphantly.", foeJoins: true },
    { message: "{foe} does the worm. Approximately.", foeJoins: true },
    { message: "{foe} vogues like their life depends on it.", foeJoins: true },
    { message: "{foe} flosses. The dance. Not dental.", foeJoins: true },
    { message: "{foe} starts a conga line of one.", foeJoins: true },
    { message: "{foe} disco-points at the ceiling.", foeJoins: true },
    { message: "{foe} does the robot with suspicious fluidity.", foeJoins: true },
];
const DANCE_OPENERS = [
    "You bust out your signature critter shuffle.",
    "You do a dramatic spin that almost works.",
    "You attempt the floss. Your hips disagree.",
    "You pop and lock. Mostly pop.",
    "You moonwalk two inches to the left.",
    "You jazz-hand with terrifying confidence.",
    "You breakdance like nobody's watching. They are.",
    "You vogue. Briefly. With commitment.",
    "You do the robot. Badly. Proudly.",
    "You twirl like you paid for it.",
    "You drop into a squat and wiggle.",
    "You air-guitar through an entire solo.",
    "You square-dance alone. Respectfully.",
    "You dab. History groans.",
    "You whip and nae nae at your own risk.",
    "You do a tiny bow nobody asked for.",
    "You cha-cha with unearned swagger.",
    "You attempt a cartwheel. Gravity wins.",
    "You disco-point at the ceiling. Twice.",
    "You floss. The dance. Not dental.",
];
const player = {
    name: "Hero",
    hp: 20,
    maxHp: 20,
    attack: 5,
    emoji: DEFAULT_HERO_EMOJI,
};
let foe = null;
let foeOrder = [];
let turn = 1;
let wave = 1;
let hypeLevel = 0;
let foeHypeLevel = 0;
let phase = "combat";
let actionsLocked = false;
let pendingHeroEmoji = DEFAULT_HERO_EMOJI;
let pendingHeroLabel = DEFAULT_HERO_LABEL;
let heroColorTheme = DEFAULT_HERO_COLOR_THEME;
let pendingHeroColorTheme = DEFAULT_HERO_COLOR_THEME;
let foeColorTheme = "amber";
let lastFoeColorTheme = null;
let defeatVerbIndex = 0;
const el = {
    arena: document.getElementById("arena"),
    battleStage: document.getElementById("battle-stage"),
    playerPanel: document.getElementById("player-panel"),
    foePanel: document.getElementById("foe-panel"),
    damageLayer: document.getElementById("damage-layer"),
    bestWave: document.getElementById("stat-best-wave"),
    runs: document.getElementById("stat-runs"),
    waveBanner: document.getElementById("wave-banner"),
    playerHpFill: document.getElementById("player-hp-fill"),
    playerHpText: document.getElementById("player-hp-text"),
    playerAttack: document.getElementById("player-attack"),
    playerBuff: document.getElementById("player-buff"),
    playerEmoji: document.getElementById("hero-emoji"),
    playerName: document.getElementById("hero-name"),
    foeName: document.getElementById("foe-name"),
    foeAttack: document.getElementById("foe-attack"),
    foeBuff: document.getElementById("foe-buff"),
    foeEmoji: document.getElementById("foe-emoji"),
    foeHpFill: document.getElementById("foe-hp-fill"),
    foeHpText: document.getElementById("foe-hp-text"),
    turnLabel: document.getElementById("turn-label"),
    battleText: document.getElementById("battle-text"),
    actions: document.getElementById("actions"),
    gameOver: document.getElementById("game-over"),
    gameOverTag: document.getElementById("game-over-tag"),
    gameOverSummary: document.getElementById("game-over-summary"),
    restartLabel: document.querySelector("#restart-btn .cmd-label"),
    restartBtn: document.getElementById("restart-btn"),
    quitBtn: document.getElementById("quit-btn"),
    restartRunBtn: document.getElementById("restart-run-btn"),
    resetStatsBtn: document.getElementById("reset-stats-btn"),
    confirmOverlay: document.getElementById("confirm-overlay"),
    confirmTitle: document.getElementById("confirm-title"),
    confirmMessage: document.getElementById("confirm-message"),
    confirmOk: document.getElementById("confirm-ok"),
    confirmCancel: document.getElementById("confirm-cancel"),
    setupOverlay: document.getElementById("character-setup"),
    heroPicker: document.getElementById("hero-picker"),
    heroNameInput: document.getElementById("hero-name-input"),
    heroColorSwatches: document.getElementById("hero-color-swatches"),
    heroColorToggle: document.getElementById("hero-color-toggle"),
    heroColorPopup: document.getElementById("hero-color-popup"),
    setupStartBtn: document.getElementById("setup-start-btn"),
    setupHint: document.getElementById("setup-hint"),
    gameShell: document.querySelector(".game-shell"),
};
let setupHintForced = false;
let setupColorPickerBound = false;
let confirmResolve = null;
function showConfirm(options) {
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
function closeConfirm(confirmed) {
    el.confirmOverlay.classList.add("hidden");
    el.confirmOverlay.classList.remove("confirm-danger");
    const resolve = confirmResolve;
    confirmResolve = null;
    resolve?.(confirmed);
}
function bindConfirmDialog() {
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
        if (el.confirmOverlay.classList.contains("hidden"))
            return;
        if (event.key === "Escape") {
            event.preventDefault();
            closeConfirm(false);
        }
    });
}
function getStorageRaw() {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current)
        return current;
    for (const key of LEGACY_STORAGE_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy)
            return legacy;
    }
    return null;
}
function loadSave() {
    try {
        const raw = getStorageRaw();
        if (!raw) {
            return { bestWave: 0, runsPlayed: 0 };
        }
        const parsed = JSON.parse(raw);
        return {
            bestWave: parsed.bestWave ?? 0,
            runsPlayed: parsed.runsPlayed ?? 0,
            playerEmoji: parsed.playerEmoji,
            heroName: parsed.heroName,
            heroLabel: parsed.heroLabel,
            heroColorTheme: parsed.heroColorTheme && isHeroColorTheme(parsed.heroColorTheme)
                ? parsed.heroColorTheme
                : undefined,
        };
    }
    catch {
        return { bestWave: 0, runsPlayed: 0 };
    }
}
function loadSnapshot() {
    try {
        const raw = getStorageRaw();
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        const snap = parsed.snapshot;
        if (!snap)
            return null;
        return normalizeSnapshot(snap);
    }
    catch {
        return null;
    }
}
function normalizeSnapshot(snap) {
    const legacyFoe = snap.foe ?? snap.goblin;
    const foeNormalized = legacyFoe
        ? {
            id: legacyFoe.id ?? "grumpy-goblin",
            name: legacyFoe.name ?? "Grumpy Goblin",
            emoji: legacyFoe.emoji ?? "👺",
            hp: legacyFoe.hp,
            maxHp: legacyFoe.maxHp,
            attack: legacyFoe.attack,
        }
        : null;
    return {
        player: {
            ...snap.player,
            emoji: snap.player.emoji ?? DEFAULT_HERO_EMOJI,
        },
        foe: foeNormalized,
        turn: snap.turn,
        wave: snap.wave,
        phase: snap.phase,
        hypeLevel: snap.hypeLevel ?? 0,
        foeHypeLevel: snap.foeHypeLevel ?? snap.goblinHypeLevel ?? 0,
        foeOrderIds: snap.foeOrderIds,
        foeColorTheme: snap.foeColorTheme,
        heroColorTheme: snap.heroColorTheme && isHeroColorTheme(snap.heroColorTheme)
            ? snap.heroColorTheme
            : undefined,
    };
}
function persistStatsOnly() {
    const save = loadSave();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bestWave: save.bestWave,
        runsPlayed: save.runsPlayed,
        playerEmoji: player.emoji,
        heroName: player.name,
        heroColorTheme,
    }));
}
function persist(snapshot) {
    const save = loadSave();
    const activeSnapshot = phase === "gameover" || phase === "victory" ? undefined : (snapshot ?? getSnapshot());
    const payload = activeSnapshot
        ? {
            bestWave: save.bestWave,
            runsPlayed: save.runsPlayed,
            playerEmoji: player.emoji,
            heroName: player.name,
            heroColorTheme,
            snapshot: activeSnapshot,
        }
        : {
            bestWave: save.bestWave,
            runsPlayed: save.runsPlayed,
            playerEmoji: player.emoji,
            heroName: player.name,
            heroColorTheme,
        };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
function foeColorConflictsWithHero(theme) {
    if (heroColorTheme === "green")
        return false;
    return heroColorTheme === theme;
}
function getAvailableFoeColorThemes(excludeLast) {
    let options = FOE_COLOR_THEMES.filter((theme) => !foeColorConflictsWithHero(theme));
    if (excludeLast && lastFoeColorTheme !== null) {
        const withoutLast = options.filter((theme) => theme !== lastFoeColorTheme);
        if (withoutLast.length > 0) {
            options = withoutLast;
        }
    }
    return options;
}
function pickNextFoeColor() {
    let options = getAvailableFoeColorThemes(true);
    if (options.length === 0) {
        options = getAvailableFoeColorThemes(false);
    }
    if (options.length === 0) {
        options = [...FOE_COLOR_THEMES];
    }
    const picked = options[Math.floor(Math.random() * options.length)] ?? "amber";
    lastFoeColorTheme = picked;
    foeColorTheme = picked;
    return picked;
}
function ensureFoeColorDistinctFromHero() {
    if (!foeColorConflictsWithHero(foeColorTheme))
        return;
    pickNextFoeColor();
}
function applyFoeColorTheme(theme) {
    const panel = el.foePanel.querySelector(".enemy-status");
    if (!panel)
        return;
    for (const name of FOE_COLOR_THEMES) {
        panel.classList.remove(`foe-theme-${name}`);
    }
    panel.classList.add(`foe-theme-${theme}`);
    el.gameShell.style.setProperty("--foe-accent", FOE_THEME_ACCENTS[theme]);
}
function getSnapshot() {
    return {
        player: { ...player },
        foe: foe ? { ...foe } : null,
        turn,
        wave,
        phase,
        hypeLevel,
        foeHypeLevel,
        foeOrderIds: foeOrder.map((f) => f.id),
        foeColorTheme,
        heroColorTheme,
    };
}
function applySnapshot(snapshot) {
    Object.assign(player, snapshot.player);
    foe = snapshot.foe ? { ...snapshot.foe } : null;
    turn = snapshot.turn;
    wave = snapshot.wave;
    phase = snapshot.phase;
    hypeLevel = snapshot.hypeLevel ?? 0;
    foeHypeLevel = snapshot.foeHypeLevel ?? 0;
    foeOrder = restoreFoeOrder(snapshot.foeOrderIds, snapshot.player.emoji);
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
}
function getHeroLabelForEmoji(emoji) {
    return HEROES.find((h) => h.emoji === emoji)?.label ?? DEFAULT_HERO_LABEL;
}
function normalizeHeroName(raw) {
    return raw.trim().replace(/\s+/g, " ").slice(0, HERO_NAME_MAX_LENGTH);
}
function resolveSavedHeroName(save, emoji) {
    return save.heroName ?? save.heroLabel ?? getHeroLabelForEmoji(emoji);
}
function readHeroNameFromSetup() {
    return normalizeHeroName(el.heroNameInput.value);
}
function isHeroColorTheme(value) {
    return HERO_COLOR_THEMES.some((theme) => theme.id === value);
}
function getHeroColorThemeDefinition(theme) {
    return HERO_COLOR_THEMES.find((entry) => entry.id === theme) ?? HERO_COLOR_THEMES[0];
}
function resolveHeroColorTheme(save) {
    if (save.heroColorTheme && isHeroColorTheme(save.heroColorTheme)) {
        return save.heroColorTheme;
    }
    return DEFAULT_HERO_COLOR_THEME;
}
function applyHeroColorTheme(theme) {
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
}
function updateHeroColorTogglePreview() {
    const colors = getHeroColorThemeDefinition(pendingHeroColorTheme);
    const swatch = el.heroColorToggle.querySelector(".setup-color-toggle-swatch");
    swatch?.style.setProperty("--swatch-color", colors.accent);
    el.heroColorToggle.setAttribute("aria-label", `Card color: ${colors.label}`);
}
function openHeroColorPopup() {
    el.heroColorPopup.classList.remove("hidden");
    el.heroColorToggle.setAttribute("aria-expanded", "true");
}
function closeHeroColorPopup() {
    el.heroColorPopup.classList.add("hidden");
    el.heroColorToggle.setAttribute("aria-expanded", "false");
}
function toggleHeroColorPopup() {
    if (el.heroColorPopup.classList.contains("hidden")) {
        openHeroColorPopup();
    }
    else {
        closeHeroColorPopup();
    }
}
function bindSetupColorPicker() {
    if (setupColorPickerBound)
        return;
    setupColorPickerBound = true;
    el.heroColorToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleHeroColorPopup();
    });
    document.addEventListener("click", (e) => {
        if (el.heroColorPopup.classList.contains("hidden"))
            return;
        const target = e.target;
        if (!el.heroColorPopup.contains(target) &&
            !el.heroColorToggle.contains(target)) {
            closeHeroColorPopup();
        }
    });
}
function readHeroColorThemeFromSetup() {
    return pendingHeroColorTheme;
}
function syncHeroColorSwatchSelection() {
    for (const btn of el.heroColorSwatches.querySelectorAll(".setup-color-swatch")) {
        btn.classList.toggle("selected", btn.dataset.theme === pendingHeroColorTheme);
        btn.setAttribute("aria-checked", btn.dataset.theme === pendingHeroColorTheme ? "true" : "false");
    }
}
function buildHeroColorSwatches() {
    if (!el.heroColorSwatches)
        return;
    el.heroColorSwatches.innerHTML = "";
    for (const theme of HERO_COLOR_THEMES) {
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
        });
        el.heroColorSwatches.appendChild(btn);
    }
    updateHeroColorTogglePreview();
}
function getSetupBlockers() {
    const blockers = [];
    if (!pendingHeroEmoji) {
        blockers.push("pick a critter");
    }
    if (!readHeroNameFromSetup()) {
        blockers.push("enter your name");
    }
    return blockers;
}
function formatSetupBlockerMessage(blockers) {
    if (blockers.length === 0)
        return "";
    if (blockers.length === 1) {
        return `To fight, ${blockers[0]}.`;
    }
    return `To fight, ${blockers[0]} and ${blockers[1]}.`;
}
function updateSetupStartButton() {
    const blockers = getSetupBlockers();
    const canStart = blockers.length === 0;
    const nameMissing = blockers.includes("enter your name");
    const hintBlockers = blockers.filter((blocker) => blocker !== "enter your name");
    el.setupStartBtn.disabled = false;
    el.setupStartBtn.classList.toggle("cmd-start-ready", canStart);
    el.heroNameInput.classList.toggle("setup-name-input--highlight", setupHintForced && nameMissing);
    el.heroNameInput.setAttribute("aria-invalid", setupHintForced && nameMissing ? "true" : "false");
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
function showSetupBlockedHint() {
    setupHintForced = true;
    updateSetupStartButton();
    if (!readHeroNameFromSetup()) {
        el.heroNameInput.focus();
    }
    else {
        el.heroPicker.focus();
    }
}
function getPlayerHypeBonus() {
    return hypeLevel * HYPE_ATTACK_PER_LEVEL;
}
function getFoeHypeBonus() {
    return foeHypeLevel * HYPE_ATTACK_PER_LEVEL;
}
function getEffectiveAttack() {
    return player.attack + getPlayerHypeBonus();
}
function getEffectiveFoeAttack() {
    if (!foe)
        return 0;
    return foe.attack + getFoeHypeBonus();
}
function getPlayerHypeGain(response) {
    return response.playerHype ?? 1;
}
function applyPlayerDanceBuff(amount = 1) {
    hypeLevel += amount;
}
function applyFoeDanceBuff() {
    foeHypeLevel += 1;
}
function formatHypeLabel(level) {
    return `HYPE ${level}`;
}
function formatDanceHypeGain(gain) {
    return `<span class="battle-hype-gain">+${gain} HYPE</span>`;
}
function clearAllHype() {
    hypeLevel = 0;
    foeHypeLevel = 0;
}
function applyPlayerHitHypeLoss() {
    hypeLevel = Math.max(0, hypeLevel - 1);
}
function foeDisplayName() {
    return foe?.name ?? "foe";
}
function formatFoeInText(template) {
    return template.replace(/\{foe\}/g, foeDisplayName());
}
function renderRecords() {
    const save = loadSave();
    el.bestWave.textContent = String(save.bestWave);
    el.runs.textContent = String(save.runsPlayed);
}
function setHpBar(fill, current, max) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    fill.style.width = `${pct}%`;
}
function briefClass(element, className, ms) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), ms);
}
function playStageClass(className, ms) {
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
function clearCombatAnimations() {
    el.playerPanel.classList.remove("hero-death", "hero-death-knockback", "hero-victory-wobble", "hero-heal", "hero-dance", "hero-run-out", "hero-run-in");
    el.foePanel.classList.remove("foe-poof", "foe-enter", "foe-dance", "foe-sprite-hidden");
    clearHitReact(el.playerPanel);
    clearHitReact(el.foePanel);
    el.battleStage.classList.remove("stage-death-vignette", "stage-flash-gold");
}
function clearHitReact(panel) {
    panel
        .querySelector(".emoji-stack")
        ?.classList.remove("hero-took-hit", "hero-took-hit-fatal", "foe-took-hit", "foe-took-hit-fatal", "hero-lunge", "foe-lunge");
    panel
        .querySelector(".hit-mark")
        ?.classList.remove("hit-mark-active", "hit-mark-active-kill");
}
function playHeroHeal() {
    briefClass(el.playerPanel, "hero-heal", HEAL_ANIM_MS);
}
function playHeroDance() {
    briefClass(el.playerPanel, "hero-dance", DANCE_ANIM_MS);
}
function playFoeDance() {
    briefClass(el.foePanel, "foe-dance", DANCE_ANIM_MS);
}
async function playHeroRunOut() {
    el.playerPanel.classList.remove("hero-run-in");
    void el.playerPanel.offsetWidth;
    el.playerPanel.classList.add("hero-run-out");
    await pause(FOE_POOF_MS);
}
function playHeroRunIn() {
    el.playerPanel.classList.remove("hero-run-out");
    void el.playerPanel.offsetWidth;
    briefClass(el.playerPanel, "hero-run-in", FOE_ENTRANCE_MS);
}
async function playRunExit() {
    await Promise.all([playHeroRunOut(), playFoePoof()]);
}
function playRunEntrance() {
    playHeroRunIn();
    playFoeEntrance();
}
function playFoeEntrance() {
    el.foePanel.classList.remove("foe-sprite-hidden");
    briefClass(el.foePanel, "foe-enter", FOE_ENTRANCE_MS);
}
function playFoePoof() {
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
async function playFoeDefeat(isFinal) {
    if (isFinal) {
        await Promise.all([playFoePoof(), playStageClass("stage-flash-gold", GOLD_FLASH_MS)]);
        briefClass(el.playerPanel, "hero-victory-wobble", 450);
        await pause(350);
        return;
    }
    await playFoePoof();
}
async function handlePlayerDeath() {
    await pause(420);
    el.playerPanel.classList.add("hero-death");
    await playStageClass("stage-death-vignette", DEATH_BEAT_MS);
    endGame();
}
function showDamagePop(side, text, kind) {
    const pop = document.createElement("span");
    pop.className = kind === "heal" ? "damage-pop heal-pop" : "damage-pop";
    pop.textContent = text;
    pop.style.left = side === "hero" ? "18%" : "62%";
    pop.style.top = side === "hero" ? "28%" : "22%";
    el.damageLayer.appendChild(pop);
    window.setTimeout(() => pop.remove(), 900);
}
function pulseWaveHud() {
    el.waveBanner.classList.remove("wave-pop");
    void el.waveBanner.offsetWidth;
    el.waveBanner.classList.add("wave-pop");
}
function renderHeroSprite() {
    el.playerEmoji.textContent = player.emoji;
    el.playerEmoji.setAttribute("aria-label", player.name);
    el.playerName.textContent = player.name.toUpperCase();
}
function render() {
    renderRecords();
    applyHeroColorTheme(heroColorTheme);
    renderHeroSprite();
    el.waveBanner.textContent = `${Math.min(wave, getCampaignLength())} / ${getCampaignLength()}`;
    el.turnLabel.textContent = String(turn);
    setHpBar(el.playerHpFill, player.hp, player.maxHp);
    el.playerHpText.textContent = `${player.hp}/${player.maxHp}`;
    el.playerAttack.textContent = String(getEffectiveAttack());
    el.playerBuff.textContent = formatHypeLabel(hypeLevel);
    const playerHpBar = el.playerPanel.querySelector(".hp-bar");
    playerHpBar?.classList.toggle("hp-low", player.hp / player.maxHp < 0.3);
    if (foe) {
        applyFoeColorTheme(foeColorTheme);
        el.foeName.textContent = foe.name.toUpperCase();
        el.foeAttack.textContent = String(getEffectiveFoeAttack());
        el.foeBuff.textContent = formatHypeLabel(foeHypeLevel);
        el.foeEmoji.textContent = foe.emoji;
        el.foeEmoji.setAttribute("aria-label", foe.name);
        setHpBar(el.foeHpFill, foe.hp, foe.maxHp);
        el.foeHpText.textContent = `${foe.hp}/${foe.maxHp}`;
        const foeHpBar = el.foePanel.querySelector(".hp-bar");
        foeHpBar?.classList.toggle("hp-low", foe.hp / foe.maxHp < 0.3);
    }
    const inEndScreen = phase === "gameover" || phase === "victory";
    el.gameOver.classList.toggle("hidden", !inEndScreen);
    el.gameOver.classList.toggle("game-victory", phase === "victory");
    el.gameOverTag.textContent = phase === "victory" ? "YOU WIN!" : "GAME OVER";
    el.restartLabel.textContent = phase === "victory" ? "Play again?" : "Try again?";
    el.actions.classList.toggle("hidden", inEndScreen);
    el.turnLabel.classList.toggle("hidden", inEndScreen);
    for (const btn of el.actions.querySelectorAll("button")) {
        btn.disabled = actionsLocked || inEndScreen;
    }
}
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function logLine(text, kind = "info") {
    el.battleText.textContent = text;
    el.battleText.className = `battle-text battle-${kind}`;
    revealBattleLog();
}
function logHtmlLine(html, kind = "info") {
    el.battleText.innerHTML = html;
    el.battleText.className = `battle-text battle-${kind}`;
    revealBattleLog();
}
function logBattleLines(primary, secondary) {
    el.battleText.className = "battle-text";
    el.battleText.innerHTML = [
        `<span class="battle-line battle-${primary.kind}">${escapeHtml(primary.text)}</span>`,
        `<span class="battle-line battle-${secondary.kind}">${escapeHtml(secondary.text)}</span>`,
    ].join("");
    revealBattleLog();
}
function revealBattleLog() {
    el.battleText.closest(".dialog-box")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function pause(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}
function logWaveTransitionComplete(previousName, transition, nextName, defeatVerb) {
    const actionLine = transition === "flee"
        ? `You run away from ${escapeHtml(previousName)},`
        : `You ${escapeHtml(defeatVerb ?? nextDefeatVerb())} ${escapeHtml(previousName)},`;
    const nextLine = transition === "flee"
        ? `but you run into ${escapeHtml(nextName)}!`
        : `but ${escapeHtml(nextName)} appears!`;
    el.battleText.className = "battle-text";
    el.battleText.innerHTML = [
        `<span class="battle-line battle-player">${actionLine}</span>`,
        `<span class="battle-line battle-foe">${nextLine}</span>`,
    ].join("");
    revealBattleLog();
}
async function transitionToNextWave(previousFoeName, transition, entrance = "foe") {
    const defeatVerb = transition === "defeat" ? nextDefeatVerb() : undefined;
    const actionText = transition === "flee"
        ? `You run away from ${previousFoeName},`
        : `You ${defeatVerb} ${previousFoeName},`;
    logLine(actionText, "player");
    await pause(COUNTER_ATTACK_DELAY_MS);
    wave += 1;
    turn = 1;
    pickNextFoeColor();
    foe = makeFoeForWave(wave);
    foeHypeLevel = 0;
    pulseWaveHud();
    applyFoeColorTheme(foeColorTheme);
    logWaveTransitionComplete(previousFoeName, transition, foe.name, defeatVerb);
    render();
    if (entrance === "run") {
        playRunEntrance();
    }
    else {
        playFoeEntrance();
    }
    persist();
}
function clearLog() {
    logLine("What will you do?", "info");
}
function pickFoeTemplate(w) {
    const idx = (w - 1) % foeOrder.length;
    return foeOrder[idx];
}
function makeFoeForWave(w) {
    const template = pickFoeTemplate(w);
    const hp = template.baseHp + Math.max(0, w - 1) * 2;
    const attack = template.baseAtk + Math.floor((w - 1) / 3);
    return {
        id: template.id,
        name: template.name,
        emoji: template.emoji,
        hp,
        maxHp: hp,
        attack,
    };
}
function randomDamage(max) {
    return Math.floor(Math.random() * max) + 1;
}
function randomDanceResponse() {
    return danceResponses[Math.floor(Math.random() * danceResponses.length)];
}
function randomDanceOpener() {
    return DANCE_OPENERS[Math.floor(Math.random() * DANCE_OPENERS.length)];
}
function nextDefeatVerb() {
    const verb = DEFEAT_VERBS[defeatVerbIndex % DEFEAT_VERBS.length];
    defeatVerbIndex += 1;
    return verb;
}
function startWave() {
    pickNextFoeColor();
    foe = makeFoeForWave(wave);
    foeHypeLevel = 0;
    pulseWaveHud();
    applyFoeColorTheme(foeColorTheme);
    logHtmlLine(`<span class="battle-line battle-foe">${escapeHtml(foe.name)} appears!</span>`, "info");
    render();
    playFoeEntrance();
    persist();
}
function updateRecordsOnGameOver() {
    const save = loadSave();
    const completedWave = Math.max(0, wave - 1);
    save.bestWave = Math.max(save.bestWave, completedWave);
    save.runsPlayed += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bestWave: save.bestWave,
        runsPlayed: save.runsPlayed,
        playerEmoji: player.emoji,
        heroName: player.name,
    }));
    const waveText = completedWave === 1 ? "1 wave" : `${completedWave} waves`;
    el.gameOverSummary.textContent = `You reached ${waveText}.`;
}
function updateRecordsOnVictory() {
    const save = loadSave();
    save.bestWave = Math.max(save.bestWave, getCampaignLength());
    save.runsPlayed += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bestWave: save.bestWave,
        runsPlayed: save.runsPlayed,
        playerEmoji: player.emoji,
        heroName: player.name,
    }));
    el.gameOverSummary.textContent = `You survived all ${CAMPAIGN_WAVES} waves!`;
}
function endGame() {
    phase = "gameover";
    clearAllHype();
    logLine("You lose! Game over.", "lose");
    updateRecordsOnGameOver();
    persist();
    render();
}
function winCampaign() {
    phase = "victory";
    clearAllHype();
    logLine(`Wave ${CAMPAIGN_WAVES} cleared! Total victory!`, "win");
    updateRecordsOnVictory();
    persist();
    render();
}
async function winWave() {
    if (!foe)
        return;
    const defeatedFoe = foe.name;
    if (wave >= getCampaignLength()) {
        winCampaign();
        return;
    }
    await transitionToNextWave(defeatedFoe, "defeat", "foe");
}
function playHitExchange(attacker, victim, fatal = false) {
    const attackerPanel = attacker === "hero" ? el.playerPanel : el.foePanel;
    const victimPanel = victim === "hero" ? el.playerPanel : el.foePanel;
    const attackerStack = attackerPanel.querySelector(".emoji-stack");
    const victimStack = victimPanel.querySelector(".emoji-stack");
    const victimMark = victimPanel.querySelector(".hit-mark");
    if (!attackerStack || !victimStack || !victimMark)
        return;
    const ms = fatal ? 450 : 400;
    const lungeClass = attacker === "hero" ? "hero-lunge" : "foe-lunge";
    const hitClass = victim === "hero"
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
function resolveFoeCounterAttack() {
    if (!foe || foe.hp <= 0)
        return null;
    const hit = randomDamage(getEffectiveFoeAttack());
    player.hp = Math.max(0, player.hp - hit);
    applyPlayerHitHypeLoss();
    const died = player.hp <= 0;
    showDamagePop("hero", `-${hit}`, "damage");
    playHitExchange("foe", "hero", died);
    if (player.hp <= 0) {
        return hit;
    }
    turn += 1;
    return hit;
}
async function withActionLock(fn) {
    if (actionsLocked || phase === "gameover" || phase === "victory")
        return;
    actionsLocked = true;
    render();
    try {
        await fn();
    }
    finally {
        actionsLocked = false;
        render();
    }
}
async function onAttack() {
    if (!foe)
        return;
    const hit = randomDamage(getEffectiveAttack());
    foe.hp = Math.max(0, foe.hp - hit);
    const foeKilled = foe.hp <= 0;
    showDamagePop("foe", `-${hit}`, "damage");
    playHitExchange("hero", "foe", foeKilled);
    logLine(`You hit ${foe.name} for ${hit} damage.`, "player");
    render();
    if (foeKilled) {
        await pause(KILL_KNOCKBACK_SETTLE_MS);
        const isFinal = wave >= getCampaignLength();
        await playFoeDefeat(isFinal);
        if (isFinal) {
            winCampaign();
        }
        else {
            await winWave();
        }
        return;
    }
    await pause(COUNTER_ATTACK_DELAY_MS);
    const counterHit = resolveFoeCounterAttack();
    if (counterHit === null)
        return;
    logBattleLines({ text: `You hit ${foe.name} for ${hit} damage.`, kind: "player" }, { text: `${foe.name} hits you for ${counterHit} damage.`, kind: "foe" });
    render();
    persist();
    if (player.hp <= 0) {
        await handlePlayerDeath();
    }
}
async function onHeal() {
    const heal = 3;
    player.hp = Math.min(player.maxHp, player.hp + heal);
    showDamagePop("hero", `+${heal}`, "heal");
    playHeroHeal();
    logLine(`You healed yourself for ${heal} HP.`, "player");
    render();
    await pause(COUNTER_ATTACK_DELAY_MS);
    const counterHit = resolveFoeCounterAttack();
    if (counterHit === null)
        return;
    logBattleLines({ text: `You healed yourself for ${heal} HP.`, kind: "player" }, { text: `${foe.name} hits you for ${counterHit} damage.`, kind: "foe" });
    render();
    persist();
    if (player.hp <= 0) {
        await handlePlayerDeath();
    }
}
function formatDanceHypeTail(playerGain, foeJoins) {
    if (playerGain === 0) {
        return "";
    }
    if (foeJoins) {
        return `You both get ${formatDanceHypeGain(1)}!`;
    }
    return `You get ${formatDanceHypeGain(1)}!`;
}
function logDanceLines(opener, reactionHtml, tail) {
    const lines = [
        `<span class="battle-line battle-player">${opener}</span>`,
        `<span class="battle-line battle-foe">${reactionHtml}</span>`,
    ];
    if (tail) {
        lines.push(`<span class="battle-line battle-hype-line">${tail}</span>`);
    }
    el.battleText.className = "battle-text";
    el.battleText.innerHTML = lines.join("");
    revealBattleLog();
}
async function onDance() {
    const response = randomDanceResponse();
    const playerGain = getPlayerHypeGain(response);
    const joins = response.foeJoins === true;
    if (playerGain > 0) {
        applyPlayerDanceBuff(playerGain);
    }
    if (joins) {
        applyFoeDanceBuff();
    }
    const opener = escapeHtml(randomDanceOpener());
    logHtmlLine(`<span class="battle-line battle-player">${opener}</span>`, "player");
    playHeroDance();
    await pause(COUNTER_ATTACK_DELAY_MS);
    const reaction = escapeHtml(formatFoeInText(response.message));
    const tail = formatDanceHypeTail(playerGain, joins);
    logDanceLines(opener, reaction, "");
    if (joins) {
        playFoeDance();
    }
    if (tail) {
        await pause(COUNTER_ATTACK_DELAY_MS);
        logDanceLines(opener, reaction, tail);
    }
    turn += 1;
    render();
    persist();
}
async function onRun() {
    if (!foe)
        return;
    if (wave >= getCampaignLength()) {
        logLine("No fleeing the final foe!", "info");
        return;
    }
    await playRunExit();
    clearAllHype();
    const fledFoe = foe.name;
    await transitionToNextWave(fledFoe, "flee", "run");
}
function applyHeroChoice(emoji, label) {
    player.emoji = emoji;
    player.name = label;
    pendingHeroEmoji = emoji;
    pendingHeroLabel = label;
}
function buildHeroPicker() {
    el.heroPicker.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "emoji-picker-grid";
    for (const hero of HEROES) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "emoji-pick";
        btn.dataset.emoji = hero.emoji;
        btn.dataset.label = hero.label;
        btn.setAttribute("aria-label", hero.label);
        btn.innerHTML = `<span class="emoji-pick-glyph" aria-hidden="true">${hero.emoji}</span>`;
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
        });
        grid.appendChild(btn);
    }
    el.heroPicker.appendChild(grid);
}
function showSetup() {
    const save = loadSave();
    closeHeroColorPopup();
    pendingHeroEmoji = save.playerEmoji ?? player.emoji;
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
}
function hideSetup() {
    closeHeroColorPopup();
    el.setupOverlay.classList.add("hidden");
    el.gameShell.classList.remove("setup-active");
}
function confirmHeroAndStart() {
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
function resetGame() {
    player.hp = player.maxHp;
    turn = 1;
    wave = 1;
    defeatVerbIndex = 0;
    foeOrder = buildFoeOrder(player.emoji);
    clearAllHype();
    lastFoeColorTheme = null;
    phase = "combat";
    clearCombatAnimations();
    el.gameOver.classList.add("hidden");
    clearLog();
    logLine("A new adventure begins.", "info");
    startWave();
}
async function quitGame() {
    const confirmed = await showConfirm({
        title: "Quit to hero select?",
        message: "Your best wave and run count are kept, but this run will be abandoned and can't be resumed.",
        confirmLabel: "Quit",
    });
    if (!confirmed) {
        return;
    }
    persistStatsOnly();
    foe = null;
    phase = "combat";
    el.gameOver.classList.add("hidden");
    showSetup();
}
async function restartRun() {
    const confirmed = await showConfirm({
        title: "Restart this run?",
        message: "You keep your character and all-time stats, but this run starts over at wave 1. This can't be undone.",
        confirmLabel: "Restart",
    });
    if (!confirmed) {
        return;
    }
    resetGame();
}
async function resetStats() {
    const confirmed = await showConfirm({
        title: "Delete everything?",
        message: "Permanently delete your character and all-time play history. This can't be undone.",
        confirmLabel: "Reset",
        danger: true,
    });
    if (!confirmed) {
        return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bestWave: 0,
        runsPlayed: 0,
    }));
    renderRecords();
    foe = null;
    phase = "combat";
    el.gameOver.classList.add("hidden");
    showSetup();
}
function bindActions() {
    el.actions.addEventListener("click", (event) => {
        const target = event.target.closest("[data-action]");
        if (!target)
            return;
        const action = target.dataset.action;
        void withActionLock(async () => {
            switch (action) {
                case "attack":
                    await onAttack();
                    break;
                case "heal":
                    await onHeal();
                    break;
                case "dance":
                    await onDance();
                    break;
                case "run":
                    await onRun();
                    break;
            }
        });
    });
    el.restartBtn.addEventListener("click", () => {
        resetGame();
    });
    el.quitBtn.addEventListener("click", () => {
        void quitGame();
    });
    el.restartRunBtn.addEventListener("click", () => {
        void restartRun();
    });
    el.resetStatsBtn.addEventListener("click", () => {
        void resetStats();
    });
    el.heroNameInput.addEventListener("input", updateSetupStartButton);
    bindSetupColorPicker();
    el.setupStartBtn.addEventListener("click", () => {
        if (!confirmHeroAndStart()) {
            return;
        }
        if (!foe) {
            beginGame();
        }
        else {
            render();
            persist();
        }
    });
}
function beginGame() {
    const save = loadSave();
    if (save.playerEmoji) {
        applyHeroChoice(save.playerEmoji, resolveSavedHeroName(save, save.playerEmoji));
    }
    const snapshot = loadSnapshot();
    if (snapshot && snapshot.phase === "combat" && snapshot.foe) {
        applySnapshot(snapshot);
        clearLog();
        logLine("Welcome back — your run was restored.", "info");
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
function init() {
    bindConfirmDialog();
    bindActions();
    renderRecords();
    const save = loadSave();
    if (!save.playerEmoji) {
        showSetup();
        return;
    }
    applyHeroChoice(save.playerEmoji, getHeroLabelForEmoji(save.playerEmoji));
    applyHeroColorTheme(resolveHeroColorTheme(save));
    beginGame();
}
init();
