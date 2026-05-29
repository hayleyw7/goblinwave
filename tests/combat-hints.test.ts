import { describe, expect, it } from "vitest";
import { hypeAfterHealAndCounter } from "../src/lib/game-logic.js";
import {
  combatHintsForSnapshot,
  createCombatHintsState,
  isLowHpForHint,
  LOW_HP_HINT_RATIO,
  deferDanceHintAfterRun,
  dismissHealHint,
  dismissHealHintIfWasLow,
  DANCE_HINT_FALLBACK_WAVE,
  maybeArmDanceHintForWave,
  onNextFoeForHints,
  onVictoryForHints,
  recordAttackForHints,
  recordDanceForHints,
  recordHealForHints,
  recordPlayerDamageForHints,
  hypeMaxPresentation,
  tryCelebrateFirstFoeHype,
  tryCelebrateFirstPlayerHype,
  tryCelebrateFirstWaveVictoryHeal,
  recordRunForHints,
  shouldShowAttackHint,
  shouldShowDanceHint,
  shouldShowHealHint,
  shouldShowRunHint,
  type CombatHintsState,
} from "../src/lib/combat-hints.js";

const fresh = () => createCombatHintsState();
const combat = "combat" as const;

function hintSnapshot(
  flags: CombatHintsState,
  opts: {
    hp?: number;
    maxHp?: number;
    hype?: number;
    foeAtk?: number;
    foeHype?: number;
    hasFoe?: boolean;
  } = {}
) {
  const hp = opts.hp ?? 20;
  const maxHp = opts.maxHp ?? 20;
  const hasFoe = opts.hasFoe ?? true;
  const hype = opts.hype ?? 0;
  const foeAtk = opts.foeAtk ?? 3;
  const foeHype = opts.foeHype ?? 0;
  return {
    attack: shouldShowAttackHint(flags, combat, hasFoe),
    heal: shouldShowHealHint(flags, hp, maxHp, combat, hasFoe),
    dance: shouldShowDanceHint(flags, hp, maxHp, combat, hasFoe, hype, foeAtk, foeHype),
    run: shouldShowRunHint(flags, hp, foeAtk, foeHype, combat, hasFoe),
  };
}

describe("combat hints — thresholds", () => {
  it("uses 60% low-hp threshold with integer-safe edges", () => {
    expect(LOW_HP_HINT_RATIO).toBe(0.6);
    expect(isLowHpForHint(12, 20)).toBe(true);
    expect(isLowHpForHint(13, 20)).toBe(false);
    expect(isLowHpForHint(0, 20)).toBe(false);
    expect(isLowHpForHint(20, 20)).toBe(false);
    expect(isLowHpForHint(10, 0)).toBe(false);
  });
});

describe("combat hints — per-run dismissals", () => {
  it("attack hint shows until first attack, then never again", () => {
    expect(shouldShowAttackHint(fresh(), combat, true)).toBe(true);
    expect(shouldShowAttackHint(fresh(), combat, false)).toBe(false);

    const once = recordAttackForHints(fresh());
    expect(shouldShowAttackHint(once, combat, true)).toBe(false);
    expect(recordAttackForHints(once)).toBe(once);
  });

  it("heal hint dismisses on any heal button press", () => {
    const wasted = recordHealForHints(fresh(), { armDance: false });
    expect(shouldShowHealHint(wasted, 8, 20, combat, true)).toBe(false);
    expect(shouldShowHealHint(wasted, 20, 20, combat, true)).toBe(false);
    expect(wasted.pendingDanceHintAfterHeal).toBe(false);
    expect(recordHealForHints(wasted)).toBe(wasted);
  });

  it("arms dance only after a heal that restores hp", () => {
    const after = recordHealForHints(fresh(), { armDance: true });
    expect(after.pendingDanceHintAfterHeal).toBe(true);
    expect(recordHealForHints(after)).toBe(after);
  });

  it("dismissHealHint only clears heal glow without arming dance", () => {
    const after = dismissHealHint(fresh());
    expect(shouldShowHealHint(after, 8, 20, combat, true)).toBe(false);
    expect(after.pendingDanceHintAfterHeal).toBe(false);
  });

  it("dismissHealHintIfWasLow clears heal glow after low-hp wave recovery", () => {
    const low = dismissHealHintIfWasLow(fresh(), 10, 20);
    expect(shouldShowHealHint(low, 8, 20, combat, true)).toBe(false);
    expect(dismissHealHintIfWasLow(low, 10, 20)).toBe(low);

    const full = dismissHealHintIfWasLow(fresh(), 18, 20);
    expect(shouldShowHealHint(full, 8, 20, combat, true)).toBe(true);
  });

  it("dance hint dismisses on any dance and clears active foe flag", () => {
    const primed = onNextFoeForHints(recordHealForHints(fresh()));
    const after = recordDanceForHints(primed);
    expect(shouldShowDanceHint(after, 20, 20, combat, true, 0, 3, 0)).toBe(false);
    expect(after.showDanceHintThisFoe).toBe(false);
  });

  it("run hint dismisses permanently after first run", () => {
    const after = recordRunForHints(fresh());
    expect(shouldShowRunHint(after, 1, 9, 0, combat, true)).toBe(false);
    expect(recordRunForHints(after)).toBe(after);
  });
});

describe("combat hints — heal before dance ordering", () => {
  it("never shows heal and dance together", () => {
    expect(hintSnapshot(fresh(), { hp: 10 }).heal).toBe(true);
    expect(hintSnapshot(fresh(), { hp: 10 }).dance).toBe(false);

    const primed = onNextFoeForHints(recordHealForHints(fresh()));
    expect(hintSnapshot(primed, { hp: 10 }).heal).toBe(false);
    expect(hintSnapshot(primed, { hp: 10 }).dance).toBe(true);
  });

  it("shows dance on next foe after a heal that restored hp", () => {
    const afterHeal = recordHealForHints(fresh(), { armDance: true });
    expect(shouldShowDanceHint(afterHeal, 20, 20, combat, true, 0, 3, 0)).toBe(false);

    const nextFoe = onNextFoeForHints(afterHeal);
    expect(shouldShowDanceHint(nextFoe, 20, 20, combat, true, 0, 3, 0)).toBe(true);
    expect(nextFoe.pendingDanceHintAfterHeal).toBe(false);
    expect(nextFoe.showDanceHintThisFoe).toBe(true);
  });

  it("does not arm dance after a wasted heal at full hp", () => {
    const afterHeal = recordHealForHints(fresh(), { armDance: false });
    const nextFoe = onNextFoeForHints(afterHeal);
    expect(nextFoe.showDanceHintThisFoe).toBe(false);
    expect(shouldShowDanceHint(nextFoe, 20, 20, combat, true, 0, 3, 0)).toBe(false);
  });

  it("does not arm dance hint without healing first", () => {
    const next = onNextFoeForHints(fresh());
    expect(next.showDanceHintThisFoe).toBe(false);
    expect(shouldShowDanceHint(next, 20, 20, combat, true, 0, 3, 0)).toBe(false);
  });

  it("does not re-arm dance after it was already dismissed", () => {
    const danced = recordDanceForHints(onNextFoeForHints(recordHealForHints(fresh())));
    const again = onNextFoeForHints(recordHealForHints(danced));
    expect(again.showDanceHintThisFoe).toBe(false);
  });

  it("keeps dance hint across mobs until danced", () => {
    const primed = onNextFoeForHints(recordHealForHints(fresh()));
    expect(shouldShowDanceHint(primed, 20, 20, combat, true, 0, 3, 0)).toBe(true);

    const nextMob = onNextFoeForHints(primed);
    expect(nextMob.showDanceHintThisFoe).toBe(true);
    expect(shouldShowDanceHint(nextMob, 20, 20, combat, true, 0, 3, 0)).toBe(true);
  });

  it("yields to run hint while lethal and returns when safe", () => {
    const primed = onNextFoeForHints(recordHealForHints(fresh()));
    expect(shouldShowDanceHint(primed, 3, 20, combat, true, 0, 5, 0)).toBe(false);
    expect(shouldShowRunHint(primed, 3, 5, 0, combat, true)).toBe(true);

    expect(shouldShowDanceHint(primed, 12, 20, combat, true, 0, 5, 0)).toBe(true);
    expect(shouldShowRunHint(primed, 12, 5, 0, combat, true)).toBe(false);
  });

  it("clears dance foe flag only after dance is used", () => {
    const armed = { ...fresh(), showDanceHintThisFoe: true };
    const next = onNextFoeForHints(armed);
    expect(next.showDanceHintThisFoe).toBe(true);

    const danced = recordDanceForHints(next);
    const after = onNextFoeForHints(danced);
    expect(after.showDanceHintThisFoe).toBe(false);
  });

  it("run defers dance to the foe after the next victory top-up", () => {
    const primed = onNextFoeForHints(recordHealForHints(fresh()));
    expect(shouldShowDanceHint(primed, 20, 20, combat, true, 0, 3, 0)).toBe(true);

    const fled = deferDanceHintAfterRun(primed);
    expect(fled.showDanceHintThisFoe).toBe(false);
    expect(fled.pendingDanceHintAfterVictory).toBe(true);

    const afterRunFoe = onNextFoeForHints(fled);
    expect(shouldShowDanceHint(afterRunFoe, 20, 20, combat, true, 0, 3, 0)).toBe(false);

    const afterKill = onVictoryForHints(afterRunFoe);
    const nextAfterVictory = onNextFoeForHints(afterKill);
    expect(shouldShowDanceHint(nextAfterVictory, 20, 20, combat, true, 0, 3, 0)).toBe(true);
  });

  it("run does not defer dance when none was queued", () => {
    const after = deferDanceHintAfterRun(fresh());
    expect(after.pendingDanceHintAfterVictory).toBe(false);
  });
});

describe("combat hints — dance wave 11 fallback", () => {
  it("does not arm before wave 11", () => {
    expect(maybeArmDanceHintForWave(fresh(), 10).showDanceHintThisFoe).toBe(false);
  });

  it("arms dance at wave 11 when never shown", () => {
    const armed = maybeArmDanceHintForWave(fresh(), DANCE_HINT_FALLBACK_WAVE);
    expect(armed.showDanceHintThisFoe).toBe(true);
    expect(
      shouldShowDanceHint(armed, 20, 20, combat, true, 0, 3, 0)
    ).toBe(true);
  });

  it("does not arm after dance was used", () => {
    const danced = recordDanceForHints(fresh());
    expect(maybeArmDanceHintForWave(danced, 11).showDanceHintThisFoe).toBe(false);
  });

  it("does not override an active dance hint", () => {
    const primed = onNextFoeForHints(recordHealForHints(fresh()));
    const again = maybeArmDanceHintForWave(primed, 11);
    expect(again).toBe(primed);
  });

  it("clears run-deferred state when wave 11 fallback fires", () => {
    const deferred = deferDanceHintAfterRun(
      onNextFoeForHints(recordHealForHints(fresh()))
    );
    expect(deferred.pendingDanceHintAfterVictory).toBe(true);

    const armed = maybeArmDanceHintForWave(deferred, DANCE_HINT_FALLBACK_WAVE);
    expect(armed.showDanceHintThisFoe).toBe(true);
    expect(armed.pendingDanceHintAfterVictory).toBe(false);
    expect(armed.pendingDanceHintAfterHeal).toBe(false);
  });

  it("run defer then victory arms dance on the next foe", () => {
    let flags = onNextFoeForHints(recordHealForHints(fresh()));
    flags = deferDanceHintAfterRun(flags);
    expect(shouldShowDanceHint(flags, 20, 20, combat, true, 0, 3, 0)).toBe(false);

    flags = onVictoryForHints(flags);
    flags = onNextFoeForHints(flags);
    expect(shouldShowDanceHint(flags, 20, 20, combat, true, 0, 3, 0)).toBe(true);
  });
});

describe("combat hints — run hint lethality", () => {
  it("shows when hp is at or below max foe hit including hype", () => {
    expect(shouldShowRunHint(fresh(), 3, 3, 0, combat, true)).toBe(true);
    expect(shouldShowRunHint(fresh(), 4, 3, 0, combat, true)).toBe(false);
    expect(shouldShowRunHint(fresh(), 2, 2, 1, combat, true)).toBe(true);
  });

  it("can return after healing if still lethal and run unused", () => {
    let flags = fresh();
    expect(shouldShowRunHint(flags, 3, 5, 0, combat, true)).toBe(true);
    flags = recordHealForHints(flags);
    expect(shouldShowRunHint(flags, 8, 5, 0, combat, true)).toBe(false);
    expect(shouldShowRunHint(flags, 4, 5, 0, combat, true)).toBe(true);
  });

  it("hides at 0 hp and outside combat", () => {
    expect(shouldShowRunHint(fresh(), 0, 9, 0, combat, true)).toBe(false);
    expect(shouldShowRunHint(fresh(), 3, 3, 0, "gameover", true)).toBe(false);
  });
});

describe("combat hints — teach flashes", () => {
  it("player damage flash fires once per run", () => {
    expect(recordPlayerDamageForHints(fresh()).flashHp).toBe(true);
    const after = recordPlayerDamageForHints(fresh()).flags;
    expect(recordPlayerDamageForHints(after).flashHp).toBe(false);
  });

  it("player hype flash only when displayed hype is at least 1", () => {
    expect(tryCelebrateFirstPlayerHype(fresh(), 0).flashFirstHype).toBe(false);
    expect(tryCelebrateFirstPlayerHype(fresh(), 1).flashFirstHype).toBe(true);
    const after = tryCelebrateFirstPlayerHype(fresh(), 1).flags;
    expect(tryCelebrateFirstPlayerHype(after, 1).flashFirstHype).toBe(false);
    expect(tryCelebrateFirstPlayerHype(after, 2).flashFirstHype).toBe(false);
  });

  it("foe hype flash only when displayed hype is at least 1", () => {
    expect(tryCelebrateFirstFoeHype(fresh(), 0).flashFirstHype).toBe(false);
    expect(tryCelebrateFirstFoeHype(fresh(), 1).flashFirstHype).toBe(true);
    const after = tryCelebrateFirstFoeHype(fresh(), 1).flags;
    expect(tryCelebrateFirstFoeHype(after, 0).flashFirstHype).toBe(false);
  });

  it("player and foe hype flashes are independent", () => {
    const foeFirst = tryCelebrateFirstFoeHype(fresh(), 1);
    expect(foeFirst.flashFirstHype).toBe(true);

    const playerSecond = tryCelebrateFirstPlayerHype(foeFirst.flags, 1);
    expect(playerSecond.flashFirstHype).toBe(true);
  });

  it("heal turn that loses hype to a counter does not flash at 0", () => {
    let flags = fresh();
    // +1 HYPE from heal, then -1 from getting hit — render sees 0.
    flags = tryCelebrateFirstPlayerHype(flags, 0).flags;
    expect(tryCelebrateFirstPlayerHype(flags, 0).flashFirstHype).toBe(false);
    expect(flags.celebratedFirstPlayerHype).toBe(false);
  });

  it("heal turn with counter at 0 hype never reaches 1 in displayed state", () => {
    expect(hypeAfterHealAndCounter(0, true, true)).toBe(0);
    expect(
      tryCelebrateFirstPlayerHype(fresh(), hypeAfterHealAndCounter(0, true, true)).flashFirstHype
    ).toBe(false);
  });

  it("heal turn that keeps hype flashes once on render", () => {
    const healed = tryCelebrateFirstPlayerHype(fresh(), 1);
    expect(healed.flashFirstHype).toBe(true);
    expect(tryCelebrateFirstPlayerHype(healed.flags, 1).flashFirstHype).toBe(false);
  });

  it("max hype blinks on each reach and stays highlighted while capped", () => {
    expect(hypeMaxPresentation(4, 5)).toEqual({ atMax: true, flashReachedMax: true });
    expect(hypeMaxPresentation(5, 5)).toEqual({ atMax: true, flashReachedMax: false });
    expect(hypeMaxPresentation(5, 4)).toEqual({ atMax: false, flashReachedMax: false });
    expect(hypeMaxPresentation(3, 5)).toEqual({ atMax: true, flashReachedMax: true });
    expect(hypeMaxPresentation(5, 5)).toEqual({ atMax: true, flashReachedMax: false });
  });

  it("first wave victory heal flash fires once on first mob kill top-up", () => {
    expect(tryCelebrateFirstWaveVictoryHeal(fresh(), 1, 8, 20).flashHp).toBe(true);
    const after = tryCelebrateFirstWaveVictoryHeal(fresh(), 1, 8, 20).flags;
    expect(tryCelebrateFirstWaveVictoryHeal(after, 1, 8, 20).flashHp).toBe(false);
    expect(tryCelebrateFirstWaveVictoryHeal(fresh(), 2, 8, 20).flashHp).toBe(false);
    expect(tryCelebrateFirstWaveVictoryHeal(fresh(), 1, 20, 20).flashHp).toBe(false);
  });
});

describe("combat hints — full first-run tutorial flow", () => {
  it("walks attack → damage → heal → next foe dance → run lethal", () => {
    let flags = fresh();

    expect(hintSnapshot(flags)).toEqual({
      attack: true,
      heal: false,
      dance: false,
      run: false,
    });

    flags = recordAttackForHints(flags);
    flags = recordPlayerDamageForHints(flags).flags;
    expect(hintSnapshot(flags, { hp: 10 })).toEqual({
      attack: false,
      heal: true,
      dance: false,
      run: false,
    });

    flags = recordHealForHints(flags);
    expect(hintSnapshot(flags, { hp: 18 })).toEqual({
      attack: false,
      heal: false,
      dance: false,
      run: false,
    });

    flags = onNextFoeForHints(flags);
    expect(hintSnapshot(flags, { hp: 20 })).toEqual({
      attack: false,
      heal: false,
      dance: true,
      run: false,
    });

    flags = recordDanceForHints(flags);
    expect(hintSnapshot(flags, { hp: 3, foeAtk: 5 })).toEqual({
      attack: false,
      heal: false,
      dance: false,
      run: true,
    });

    flags = recordRunForHints(flags);
    expect(hintSnapshot(flags, { hp: 1, foeAtk: 9 })).toEqual({
      attack: false,
      heal: false,
      dance: false,
      run: false,
    });
  });
});

describe("combat hints — persistence and migration", () => {
  it("persists full hint state in snapshots", () => {
    const flags = onNextFoeForHints(recordHealForHints(fresh()));
    const snap = combatHintsForSnapshot(flags);
    const restored = createCombatHintsState(snap);
    expect(restored).toEqual(flags);
  });

  it("migrates legacy has-used flags from old saves", () => {
    const migrated = createCombatHintsState({ hasUsedDance: true, hasUsedHeal: true });
    expect(migrated.dismissedDanceHint).toBe(true);
    expect(migrated.dismissedHealHint).toBe(true);
    expect(migrated.celebratedFirstPlayerHype).toBe(true);
    expect(migrated.celebratedFirstFoeHype).toBe(false);
    expect(hintSnapshot(migrated, { hp: 10 }).heal).toBe(false);
    expect(hintSnapshot(migrated, { hp: 10 }).dance).toBe(false);
  });

  it("hides dance at max hype even when foe flag is set", () => {
    const primed = onNextFoeForHints(recordHealForHints(fresh()));
    expect(shouldShowDanceHint(primed, 20, 20, combat, true, 5, 3, 0)).toBe(false);
  });
});
