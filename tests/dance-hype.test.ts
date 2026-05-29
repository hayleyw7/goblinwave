import { beforeEach, describe, expect, it } from "vitest";
import {
  DANCE_OPENERS,
  DANCE_RESPONSES,
  formatDanceHypeTail,
  getFoeHypeGain,
  getPlayerHypeGain,
  pickRandomDanceOpener,
  pickRandomDanceResponse,
  resetDancePicker,
} from "../src/content/dance-responses.js";

const NO_HYPE = DANCE_RESPONSES.filter(
  (r) => getPlayerHypeGain(r) === 0 && getFoeHypeGain(r) === 0
);
const PLAYER_HYPE = DANCE_RESPONSES.filter(
  (r) => getPlayerHypeGain(r) === 1 && getFoeHypeGain(r) === 0
);
const FOE_HYPE = DANCE_RESPONSES.filter(
  (r) => getPlayerHypeGain(r) === 0 && getFoeHypeGain(r) === 1 && !r.foeJoins
);
const JOIN_HYPE = DANCE_RESPONSES.filter((r) => r.foeJoins === true);

describe("getPlayerHypeGain", () => {
  it("returns explicit zero hype", () => {
    expect(getPlayerHypeGain({ message: "{foe} boos.", playerHype: 0 })).toBe(0);
  });

  it("returns zero when omitted and foe does not join", () => {
    expect(getPlayerHypeGain({ message: "{foe} claps." })).toBe(0);
  });

  it("returns one when foe joins and player hype omitted", () => {
    expect(getPlayerHypeGain({ message: "{foe} dances.", foeJoins: true })).toBe(1);
  });

  it("treats zero as zero not default", () => {
    expect(getPlayerHypeGain({ message: "{foe} yawns.", playerHype: 0 })).toBe(0);
  });
});

describe("getFoeHypeGain", () => {
  it("returns explicit foe-only hype", () => {
    expect(
      getFoeHypeGain({ message: "{foe} vibes.", playerHype: 0, foeHype: 1 })
    ).toBe(1);
  });

  it("returns one when foe joins", () => {
    expect(getFoeHypeGain({ message: "{foe} dances.", foeJoins: true })).toBe(1);
  });

  it("returns zero for sideline player hype", () => {
    expect(getFoeHypeGain({ message: "{foe} claps.", playerHype: 1 })).toBe(0);
  });
});

describe("formatDanceHypeTail", () => {
  it("is empty when nobody gains hype", () => {
    expect(formatDanceHypeTail(0, 0)).toBe("");
  });

  it("describes solo player hype with markup", () => {
    expect(formatDanceHypeTail(1, 0)).toContain("You get");
    expect(formatDanceHypeTail(1, 0)).toContain("+1 HYPE");
    expect(formatDanceHypeTail(1, 0)).toContain("battle-hype-gain");
  });

  it("describes foe-only hype with foe name", () => {
    expect(formatDanceHypeTail(0, 1, "Rabid Rabbit")).toContain("Rabid Rabbit gets");
    expect(formatDanceHypeTail(0, 1, "Rabid Rabbit")).toContain("+1 HYPE");
  });

  it("describes shared hype when both gain", () => {
    expect(formatDanceHypeTail(1, 1)).toContain("You both get");
    expect(formatDanceHypeTail(1, 1)).not.toContain("You get +1");
  });
});

describe("dance content invariants", () => {
  it("tags every reaction with {foe}", () => {
    for (const response of DANCE_RESPONSES) {
      expect(response.message).toContain("{foe}");
    }
  });

  it("has four hype buckets with balanced counts", () => {
    expect(NO_HYPE.length).toBe(17);
    expect(PLAYER_HYPE.length).toBe(14);
    expect(FOE_HYPE.length).toBe(8);
    expect(JOIN_HYPE.length).toBe(14);
    expect(
      NO_HYPE.length + PLAYER_HYPE.length + FOE_HYPE.length + JOIN_HYPE.length
    ).toBe(DANCE_RESPONSES.length);
  });

  it("aligns hype buckets with flags", () => {
    for (const response of DANCE_RESPONSES) {
      const playerGain = getPlayerHypeGain(response);
      const foeGain = getFoeHypeGain(response);
      const joins = response.foeJoins === true;

      if (playerGain === 0 && foeGain === 0) {
        expect(formatDanceHypeTail(playerGain, foeGain)).toBe("");
        expect(joins).toBe(false);
        continue;
      }

      if (joins) {
        expect(playerGain).toBe(1);
        expect(foeGain).toBe(1);
        expect(formatDanceHypeTail(playerGain, foeGain)).toContain("both");
        continue;
      }

      if (foeGain > 0 && playerGain === 0) {
        expect(response.foeHype).toBe(1);
        expect(formatDanceHypeTail(0, 1, "Test Foe")).toContain("Test Foe gets");
        continue;
      }

      expect(playerGain).toBe(1);
      expect(foeGain).toBe(0);
      expect(formatDanceHypeTail(playerGain, foeGain)).toContain("You get");
    }
  });

  it("keeps unique openers and responses", () => {
    expect(new Set(DANCE_OPENERS).size).toBe(DANCE_OPENERS.length);
    expect(new Set(DANCE_RESPONSES.map((r) => r.message)).size).toBe(
      DANCE_RESPONSES.length
    );
  });

  it("does not include removed dab opener", () => {
    expect(DANCE_OPENERS.some((line) => /dab/i.test(line))).toBe(false);
  });
});

describe("random pickers", () => {
  beforeEach(() => {
    resetDancePicker();
  });

  it("respects injected random on first pick", () => {
    expect(pickRandomDanceResponse(() => 0)).toBe(DANCE_RESPONSES[0]);
    resetDancePicker();
    expect(pickRandomDanceOpener(() => 0)).toBe(DANCE_OPENERS[0]);
  });

  it("does not repeat the same opener or response twice in a row", () => {
    const alwaysFirst = () => 0;
    const firstResponse = pickRandomDanceResponse(alwaysFirst);
    const secondResponse = pickRandomDanceResponse(alwaysFirst);
    expect(secondResponse).not.toBe(firstResponse);

    resetDancePicker();
    const firstOpener = pickRandomDanceOpener(alwaysFirst);
    const secondOpener = pickRandomDanceOpener(alwaysFirst);
    expect(secondOpener).not.toBe(firstOpener);
  });

  it("avoids immediate repeats over many random picks", () => {
    for (let i = 0; i < 40; i++) {
      const a = pickRandomDanceResponse();
      const b = pickRandomDanceResponse();
      expect(b).not.toBe(a);
    }

    resetDancePicker();
    for (let i = 0; i < 40; i++) {
      const a = pickRandomDanceOpener();
      const b = pickRandomDanceOpener();
      expect(b).not.toBe(a);
    }
  });

  it("resets history after resetDancePicker", () => {
    pickRandomDanceResponse(() => 0);
    resetDancePicker();
    expect(pickRandomDanceResponse(() => 0)).toBe(DANCE_RESPONSES[0]);
  });
});
