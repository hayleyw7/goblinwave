import { FOES as FOES_RAW } from "./foes-data.js";
import { assertAlliterativeName } from "./alliteration.js";
const FOE_COLOR_THEMES = ["amber", "rose", "violet", "sky", "coral", "fuchsia"];
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
const HEROES = heroesFromFoes(FOES).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
for (const foe of FOES) {
    assertAlliterativeName(foe.name);
}
assertUniqueEmojis(FOES);
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
    setupStartBtn: document.getElementById("setup-start-btn"),
    gameShell: document.querySelector(".game-shell"),
};
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
    };
}
function persistStatsOnly() {
    const save = loadSave();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bestWave: save.bestWave,
        runsPlayed: save.runsPlayed,
        playerEmoji: player.emoji,
        heroName: player.name,
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
            snapshot: activeSnapshot,
        }
        : {
            bestWave: save.bestWave,
            runsPlayed: save.runsPlayed,
            playerEmoji: player.emoji,
            heroName: player.name,
        };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
function pickNextFoeColor() {
    const options = lastFoeColorTheme === null
        ? [...FOE_COLOR_THEMES]
        : FOE_COLOR_THEMES.filter((theme) => theme !== lastFoeColorTheme);
    const picked = options[Math.floor(Math.random() * options.length)] ?? "amber";
    lastFoeColorTheme = picked;
    foeColorTheme = picked;
    return picked;
}
function applyFoeColorTheme(theme) {
    const panel = el.foePanel.querySelector(".enemy-status");
    if (!panel)
        return;
    for (const name of FOE_COLOR_THEMES) {
        panel.classList.remove(`foe-theme-${name}`);
    }
    panel.classList.add(`foe-theme-${theme}`);
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
    foeColorTheme = snapshot.foeColorTheme ?? "amber";
    lastFoeColorTheme = foeColorTheme;
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
function updateSetupStartButton() {
    el.setupStartBtn.disabled = readHeroNameFromSetup().length === 0;
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
    return `HYPE x${level}`;
}
function clearAllHype() {
    hypeLevel = 0;
    foeHypeLevel = 0;
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
    el.playerPanel.classList.remove("hero-death", "hero-death-knockback", "hero-knockback", "hero-victory-wobble");
    el.foePanel.classList.remove("foe-poof", "foe-enter", "foe-knockback");
    el.battleStage.classList.remove("stage-death-vignette", "stage-flash-gold");
}
function playFoeEntrance() {
    briefClass(el.foePanel, "foe-enter", FOE_ENTRANCE_MS);
}
function playFoePoof() {
    briefClass(el.foePanel, "foe-poof", FOE_POOF_MS);
    return pause(FOE_POOF_MS);
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
    renderHeroSprite();
    el.waveBanner.textContent = `${Math.min(wave, getCampaignLength())} / ${getCampaignLength()}`;
    el.turnLabel.textContent = String(turn);
    setHpBar(el.playerHpFill, player.hp, player.maxHp);
    el.playerHpText.textContent = `${player.hp}/${player.maxHp}`;
    el.playerAttack.textContent = String(getEffectiveAttack());
    el.playerBuff.textContent = formatHypeLabel(hypeLevel);
    el.playerBuff.classList.toggle("hidden", hypeLevel === 0);
    const playerHpBar = el.playerPanel.querySelector(".hp-bar");
    playerHpBar?.classList.toggle("hp-low", player.hp / player.maxHp < 0.3);
    if (foe) {
        applyFoeColorTheme(foeColorTheme);
        el.foeName.textContent = foe.name.toUpperCase();
        el.foeAttack.textContent = String(getEffectiveFoeAttack());
        el.foeBuff.textContent = formatHypeLabel(foeHypeLevel);
        el.foeBuff.classList.toggle("hidden", foeHypeLevel === 0);
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
function logWaveTransition(previousName, transition, nextName) {
    const actionClass = transition === "flee" ? "battle-player" : "battle-win";
    const actionLine = transition === "flee"
        ? `You run away from ${escapeHtml(previousName)},`
        : `You ${escapeHtml(nextDefeatVerb())} ${escapeHtml(previousName)},`;
    el.battleText.className = "battle-text";
    el.battleText.innerHTML = [
        `<span class="battle-line ${actionClass}">${actionLine}</span>`,
        `<span class="battle-line battle-pause">but then...</span>`,
        `<span class="battle-line battle-foe">${escapeHtml(nextName)} appears!</span>`,
    ].join("");
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
function nextDefeatVerb() {
    const verb = DEFEAT_VERBS[defeatVerbIndex % DEFEAT_VERBS.length];
    defeatVerbIndex += 1;
    return verb;
}
function startWave(options) {
    pickNextFoeColor();
    foe = makeFoeForWave(wave);
    foeHypeLevel = 0;
    pulseWaveHud();
    if (options?.previousFoeName && options.transition) {
        logWaveTransition(options.previousFoeName, options.transition, foe.name);
    }
    else {
        logLine(`${foe.name} appears!`, "foe");
    }
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
function winWave() {
    if (!foe)
        return;
    const defeatedFoe = foe.name;
    if (wave >= getCampaignLength()) {
        winCampaign();
        return;
    }
    wave += 1;
    turn = 1;
    startWave({ previousFoeName: defeatedFoe, transition: "defeat" });
}
function playHitKnockback(victim, fatal = false) {
    const panel = victim === "hero" ? el.playerPanel : el.foePanel;
    let knockClass;
    if (victim === "hero") {
        knockClass = fatal ? "hero-death-knockback" : "hero-knockback";
    }
    else {
        knockClass = fatal ? "foe-knockback-kill" : "foe-knockback";
    }
    briefClass(panel, knockClass, fatal ? 450 : 400);
}
function resolveFoeCounterAttack() {
    if (!foe || foe.hp <= 0)
        return null;
    const hit = randomDamage(getEffectiveFoeAttack());
    player.hp = Math.max(0, player.hp - hit);
    const died = player.hp <= 0;
    showDamagePop("hero", `-${hit}`, "damage");
    playHitKnockback("hero", died);
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
    playHitKnockback("foe", foeKilled);
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
            winWave();
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
    logLine(`You healed yourself for ${heal} HP.`, "player");
    render();
    await pause(COUNTER_ATTACK_DELAY_MS);
    const counterHit = resolveFoeCounterAttack();
    if (counterHit === null)
        return;
    logLine(`${foe.name} hits you for ${counterHit} damage.`, "foe");
    render();
    persist();
    if (player.hp <= 0) {
        await handlePlayerDeath();
    }
}
function formatDanceHypeMessage(response, playerGain, foeJoins) {
    const line = formatFoeInText(response.message);
    if (playerGain === 0) {
        return `${line} You get +0 hype!`;
    }
    if (foeJoins) {
        return `${line} You get +1 hype, but ${foeDisplayName()} gets +1 hype too!`;
    }
    return `${line} You get +1 hype!`;
}
function onDance() {
    const response = randomDanceResponse();
    const playerGain = getPlayerHypeGain(response);
    const joins = response.foeJoins === true;
    if (playerGain > 0) {
        applyPlayerDanceBuff(playerGain);
    }
    if (joins) {
        applyFoeDanceBuff();
    }
    logLine(formatDanceHypeMessage(response, playerGain, joins), "foe");
    turn += 1;
    render();
    persist();
}
function onRun() {
    if (!foe)
        return;
    if (wave >= getCampaignLength()) {
        logLine("No fleeing the final foe!", "info");
        return;
    }
    clearAllHype();
    const fledFoe = foe.name;
    wave += 1;
    turn = 1;
    startWave({ previousFoeName: fledFoe, transition: "flee" });
}
function applyHeroChoice(emoji, label) {
    player.emoji = emoji;
    player.name = label;
    pendingHeroEmoji = emoji;
    pendingHeroLabel = label;
}
function buildHeroPicker() {
    el.heroPicker.innerHTML = "";
    for (const hero of HEROES) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "emoji-pick";
        btn.dataset.emoji = hero.emoji;
        btn.dataset.label = hero.label;
        btn.setAttribute("aria-label", hero.label);
        btn.innerHTML = `<span class="emoji-pick-glyph" aria-hidden="true">${hero.emoji}</span><span class="emoji-pick-label">${hero.label}</span>`;
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
        });
        el.heroPicker.appendChild(btn);
    }
}
function showSetup() {
    const save = loadSave();
    pendingHeroEmoji = save.playerEmoji ?? player.emoji;
    pendingHeroLabel = getHeroLabelForEmoji(pendingHeroEmoji);
    buildHeroPicker();
    el.heroNameInput.value = save.heroName ?? "";
    updateSetupStartButton();
    el.setupOverlay.classList.remove("hidden");
    el.gameShell.classList.add("setup-active");
}
function hideSetup() {
    el.setupOverlay.classList.add("hidden");
    el.gameShell.classList.remove("setup-active");
}
function confirmHeroAndStart() {
    const heroName = readHeroNameFromSetup();
    if (!heroName) {
        el.heroNameInput.focus();
        updateSetupStartButton();
        return false;
    }
    applyHeroChoice(pendingHeroEmoji, heroName);
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
                    onDance();
                    break;
                case "run":
                    onRun();
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
    beginGame();
}
init();
