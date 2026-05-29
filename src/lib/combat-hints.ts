import { effectiveAttack, HYPE_MAX } from "./game-logic.js";

/** Show heal hint at or below this fraction of max HP (60% feels “hurt” on mobile). */
export const LOW_HP_HINT_RATIO = 0.6;

/** Arm dance hint from this wave if the player still has not danced this run. */
export const DANCE_HINT_FALLBACK_WAVE = 11;

export type CombatHintsState = {
  /** Legacy: set when the player has danced this run. */
  celebratedFirstDance: boolean;
  /** Player HYPE bar celebration when HYPE first reaches 1 this run. */
  celebratedFirstPlayerHype: boolean;
  /** Foe HYPE bar celebration when foe HYPE first reaches 1 this run. */
  celebratedFirstFoeHype: boolean;
  /** Player HP bar celebration on first damage taken this run. */
  celebratedFirstPlayerDamage: boolean;
  /** HP bar celebration on first wave victory top-up (first mob kill). */
  celebratedFirstWaveVictoryHeal: boolean;
  /** Heal hint dismissed after any heal this run. */
  dismissedHealHint: boolean;
  /** Dance hint dismissed after any dance this run. */
  dismissedDanceHint: boolean;
  /** Attack hint dismissed after any attack this run. */
  dismissedAttackHint: boolean;
  /** Run hint dismissed after any run this run. */
  dismissedRunHint: boolean;
  /** Heal was used; show dance hint on the next foe. */
  pendingDanceHintAfterHeal: boolean;
  /** Run deferred dance — show after the next victory top-up instead. */
  pendingDanceHintAfterVictory: boolean;
  /** Dance hint active for the current foe (next mob after heal). */
  showDanceHintThisFoe: boolean;
};

export type CombatHintPhase = "combat" | "gameover" | "victory";

export type LegacyCombatHintsState = {
  hasUsedDance?: boolean;
  hasUsedHeal?: boolean;
  hasUsedAttack?: boolean;
  hasUsedRun?: boolean;
  celebratedFirstDance?: boolean;
  celebratedFirstHype?: boolean;
  celebratedFirstPlayerHype?: boolean;
  celebratedFirstFoeHype?: boolean;
  celebratedFirstPlayerDamage?: boolean;
  celebratedFirstWaveVictoryHeal?: boolean;
  dismissedHealHint?: boolean;
  dismissedDanceHint?: boolean;
  dismissedAttackHint?: boolean;
  dismissedRunHint?: boolean;
  pendingDanceHintAfterHeal?: boolean;
  pendingDanceHintAfterVictory?: boolean;
  showDanceHintThisFoe?: boolean;
};

export function createCombatHintsState(
  overrides: Partial<CombatHintsState> | LegacyCombatHintsState = {}
): CombatHintsState {
  const legacy = overrides as LegacyCombatHintsState;

  return {
    celebratedFirstDance: legacy.celebratedFirstDance ?? legacy.hasUsedDance ?? false,
    celebratedFirstPlayerHype:
      legacy.celebratedFirstPlayerHype ??
      legacy.celebratedFirstHype ??
      legacy.celebratedFirstDance ??
      legacy.hasUsedDance ??
      false,
    celebratedFirstFoeHype: legacy.celebratedFirstFoeHype ?? false,
    celebratedFirstPlayerDamage: legacy.celebratedFirstPlayerDamage ?? false,
    celebratedFirstWaveVictoryHeal: legacy.celebratedFirstWaveVictoryHeal ?? false,
    dismissedHealHint: legacy.dismissedHealHint ?? legacy.hasUsedHeal ?? false,
    dismissedDanceHint: legacy.dismissedDanceHint ?? legacy.hasUsedDance ?? false,
    dismissedAttackHint: legacy.dismissedAttackHint ?? legacy.hasUsedAttack ?? false,
    dismissedRunHint: legacy.dismissedRunHint ?? legacy.hasUsedRun ?? false,
    pendingDanceHintAfterHeal: legacy.pendingDanceHintAfterHeal ?? false,
    pendingDanceHintAfterVictory: legacy.pendingDanceHintAfterVictory ?? false,
    showDanceHintThisFoe: legacy.showDanceHintThisFoe ?? false,
  };
}

/** Persist hint progress for the current run. */
export function combatHintsForSnapshot(
  flags: CombatHintsState
): CombatHintsState {
  return { ...flags };
}

export function hpRatio(hp: number, maxHp: number): number {
  if (maxHp <= 0) {
    return 1;
  }
  return hp / maxHp;
}

/** Integer-safe “at or below threshold” for battle HP. */
export function isLowHpForHint(hp: number, maxHp: number): boolean {
  if (hp <= 0 || maxHp <= 0 || hp >= maxHp) {
    return false;
  }
  return hpRatio(hp, maxHp) <= LOW_HP_HINT_RATIO;
}

export function maxFoeHitForHint(baseAttack: number, foeHypeLevel: number): number {
  return effectiveAttack(baseAttack, foeHypeLevel);
}

export function shouldShowAttackHint(
  flags: CombatHintsState,
  phase: CombatHintPhase,
  hasFoe: boolean
): boolean {
  if (flags.dismissedAttackHint) {
    return false;
  }
  return phase === "combat" && hasFoe;
}

export function shouldShowHealHint(
  flags: CombatHintsState,
  hp: number,
  maxHp: number,
  phase: CombatHintPhase,
  hasFoe: boolean
): boolean {
  if (flags.dismissedHealHint) {
    return false;
  }
  if (phase !== "combat" || !hasFoe) {
    return false;
  }
  return isLowHpForHint(hp, maxHp);
}

export function shouldShowDanceHint(
  flags: CombatHintsState,
  hp: number,
  maxHp: number,
  phase: CombatHintPhase,
  hasFoe: boolean,
  hypeLevel: number,
  foeBaseAttack: number,
  foeHypeLevel: number,
  hypeMax = HYPE_MAX
): boolean {
  if (flags.dismissedDanceHint) {
    return false;
  }
  if (phase !== "combat" || !hasFoe) {
    return false;
  }
  if (!flags.showDanceHintThisFoe) {
    return false;
  }
  if (hypeLevel >= hypeMax) {
    return false;
  }
  if (shouldShowHealHint(flags, hp, maxHp, phase, hasFoe)) {
    return false;
  }
  if (shouldShowRunHint(flags, hp, foeBaseAttack, foeHypeLevel, phase, hasFoe)) {
    return false;
  }
  return true;
}

export function shouldShowRunHint(
  flags: CombatHintsState,
  hp: number,
  foeBaseAttack: number,
  foeHypeLevel: number,
  phase: CombatHintPhase,
  hasFoe: boolean
): boolean {
  if (flags.dismissedRunHint) {
    return false;
  }
  if (phase !== "combat" || !hasFoe || hp <= 0) {
    return false;
  }
  return hp <= maxFoeHitForHint(foeBaseAttack, foeHypeLevel);
}

export function recordAttackForHints(flags: CombatHintsState): CombatHintsState {
  if (flags.dismissedAttackHint) {
    return flags;
  }
  return { ...flags, dismissedAttackHint: true };
}

export function dismissHealHint(flags: CombatHintsState): CombatHintsState {
  if (flags.dismissedHealHint) {
    return flags;
  }
  return { ...flags, dismissedHealHint: true };
}

/** Wave top-up or other full recovery after a low-HP teach moment — do not re-blink heal later. */
export function dismissHealHintIfWasLow(
  flags: CombatHintsState,
  hpBefore: number,
  maxHp: number
): CombatHintsState {
  if (flags.dismissedHealHint || !isLowHpForHint(hpBefore, maxHp)) {
    return flags;
  }
  return dismissHealHint(flags);
}

export function recordHealForHints(
  flags: CombatHintsState,
  options: { armDance?: boolean } = {}
): CombatHintsState {
  if (flags.dismissedHealHint) {
    return flags;
  }
  const armDance = options.armDance ?? true;
  return {
    ...flags,
    dismissedHealHint: true,
    pendingDanceHintAfterHeal:
      armDance && !flags.dismissedDanceHint ? true : flags.pendingDanceHintAfterHeal,
  };
}

export function hypeMaxPresentation(
  previousLevel: number,
  currentLevel: number,
  hypeMax = HYPE_MAX
): { atMax: boolean; flashReachedMax: boolean } {
  const current = Math.max(0, Math.min(hypeMax, currentLevel));
  const previous = Math.max(0, Math.min(hypeMax, previousLevel));
  const atMax = current >= hypeMax;
  return {
    atMax,
    flashReachedMax: atMax && previous < hypeMax,
  };
}

export function tryCelebrateFirstWaveVictoryHeal(
  flags: CombatHintsState,
  completedWave: number,
  hpBefore: number,
  hpAfter: number
): { flags: CombatHintsState; flashHp: boolean } {
  if (flags.celebratedFirstWaveVictoryHeal || completedWave !== 1 || hpAfter <= hpBefore) {
    return { flags, flashHp: false };
  }
  return {
    flags: { ...flags, celebratedFirstWaveVictoryHeal: true },
    flashHp: true,
  };
}

/** Flash when displayed HYPE is at least 1 for the first time this run. */
export function tryCelebrateFirstPlayerHype(
  flags: CombatHintsState,
  hypeLevel: number
): { flags: CombatHintsState; flashFirstHype: boolean } {
  if (flags.celebratedFirstPlayerHype || hypeLevel < 1) {
    return { flags, flashFirstHype: false };
  }
  return {
    flags: { ...flags, celebratedFirstPlayerHype: true },
    flashFirstHype: true,
  };
}

export function tryCelebrateFirstFoeHype(
  flags: CombatHintsState,
  hypeLevel: number
): { flags: CombatHintsState; flashFirstHype: boolean } {
  if (flags.celebratedFirstFoeHype || hypeLevel < 1) {
    return { flags, flashFirstHype: false };
  }
  return {
    flags: { ...flags, celebratedFirstFoeHype: true },
    flashFirstHype: true,
  };
}

export function recordPlayerDamageForHints(
  flags: CombatHintsState
): { flags: CombatHintsState; flashHp: boolean } {
  if (flags.celebratedFirstPlayerDamage) {
    return { flags, flashHp: false };
  }
  return {
    flags: { ...flags, celebratedFirstPlayerDamage: true },
    flashHp: true,
  };
}

export function recordDanceForHints(flags: CombatHintsState): CombatHintsState {
  return {
    ...flags,
    celebratedFirstDance: true,
    dismissedDanceHint: true,
    showDanceHintThisFoe: false,
    pendingDanceHintAfterHeal: false,
    pendingDanceHintAfterVictory: false,
  };
}

export function recordRunForHints(flags: CombatHintsState): CombatHintsState {
  if (flags.dismissedRunHint) {
    return flags;
  }
  return { ...flags, dismissedRunHint: true };
}

/** Running skips dance on the immediate next foe — arm it for after the next kill heal. */
export function deferDanceHintAfterRun(flags: CombatHintsState): CombatHintsState {
  if (flags.dismissedDanceHint) {
    return flags;
  }
  if (!flags.pendingDanceHintAfterHeal && !flags.showDanceHintThisFoe) {
    return flags;
  }
  return {
    ...flags,
    pendingDanceHintAfterHeal: false,
    showDanceHintThisFoe: false,
    pendingDanceHintAfterVictory: true,
  };
}

/** After a victory top-up, activate deferred dance on the next foe. */
export function onVictoryForHints(flags: CombatHintsState): CombatHintsState {
  if (flags.dismissedDanceHint || !flags.pendingDanceHintAfterVictory) {
    return flags;
  }
  return {
    ...flags,
    pendingDanceHintAfterVictory: false,
    pendingDanceHintAfterHeal: true,
  };
}

/** Call when a new foe enters — activates deferred dance hint once; keeps it until danced. */
export function onNextFoeForHints(flags: CombatHintsState): CombatHintsState {
  if (flags.dismissedDanceHint) {
    return {
      ...flags,
      showDanceHintThisFoe: false,
      pendingDanceHintAfterHeal: false,
      pendingDanceHintAfterVictory: false,
    };
  }
  if (flags.pendingDanceHintAfterHeal) {
    return {
      ...flags,
      pendingDanceHintAfterHeal: false,
      showDanceHintThisFoe: true,
    };
  }
  return flags;
}

/** Wave 11+ fallback — blink dance until used if heal/run path never armed it. */
export function maybeArmDanceHintForWave(
  flags: CombatHintsState,
  wave: number
): CombatHintsState {
  if (flags.dismissedDanceHint || wave < DANCE_HINT_FALLBACK_WAVE) {
    return flags;
  }
  if (flags.showDanceHintThisFoe) {
    return flags;
  }
  return {
    ...flags,
    showDanceHintThisFoe: true,
    pendingDanceHintAfterHeal: false,
    pendingDanceHintAfterVictory: false,
  };
}
