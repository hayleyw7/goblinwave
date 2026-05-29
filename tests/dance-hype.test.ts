import { beforeEach, describe, expect, it } from "vitest";
import {
  DANCE_OPENERS,
  DANCE_RESPONSES,
  formatDanceHypeTail,
  getPlayerHypeGain,
  pickRandomDanceOpener,
  pickRandomDanceResponse,
  resetDancePicker,
} from "../src/content/dance-responses.js";

const NO_HYPE = DANCE_RESPONSES.filter((r) => r.playerHype === 0);
const SIDELINE_HYPE = DANCE_RESPONSES.filter(
  (r) => r.playerHype === 1 && !r.foeJoins
);
const JOIN_HYPE = DANCE_RESPONSES.filter((r) => r.foeJoins === true);

describe("getPlayerHypeGain", () => {
  it("returns explicit zero hype", () => {
    expect(getPlayerHypeGain({ message: "{foe} boos.", playerHype: 0 })).toBe(0);
  });

  it("defaults to one when omitted", () => {
    expect(getPlayerHypeGain({ message: "{foe} claps." })).toBe(1);
  });

  it("treats zero as zero not default", () => {
    expect(getPlayerHypeGain({ message: "{foe} yawns.", playerHype: 0 })).toBe(0);
  });
});

describe("formatDanceHypeTail", () => {
  it("is empty when player gains nothing", () => {
    expect(formatDanceHypeTail(0, false)).toBe("");
    expect(formatDanceHypeTail(0, true)).toBe("");
  });

  it("describes solo hype with markup", () => {
    expect(formatDanceHypeTail(1, false)).toContain("You get");
    expect(formatDanceHypeTail(1, false)).toContain("+1 HYPE");
    expect(formatDanceHypeTail(1, false)).toContain("battle-hype-gain");
  });

  it("describes shared hype when foe joins", () => {
    expect(formatDanceHypeTail(1, true)).toContain("You both get");
    expect(formatDanceHypeTail(1, true)).not.toContain("You get +1");
  });
});

describe("dance content invariants", () => {
  it("tags every reaction with {foe}", () => {
    for (const response of DANCE_RESPONSES) {
      expect(response.message).toContain("{foe}");
    }
  });

  it("has three hype buckets with content", () => {
    expect(NO_HYPE.length).toBeGreaterThan(10);
    expect(SIDELINE_HYPE.length).toBeGreaterThan(10);
    expect(JOIN_HYPE.length).toBeGreaterThan(10);
  });

  it("aligns hype buckets with join flag", () => {
    for (const response of DANCE_RESPONSES) {
      const gain = getPlayerHypeGain(response);
      const joins = response.foeJoins === true;

      if (response.playerHype === 0) {
        expect(gain).toBe(0);
        expect(formatDanceHypeTail(gain, joins)).toBe("");
        expect(joins).toBe(false);
        continue;
      }

      expect(gain).toBe(1);
      expect(response.foeJoins === true).toBe(joins);
      if (joins) {
        expect(formatDanceHypeTail(gain, true)).toContain("both");
      } else {
        expect(formatDanceHypeTail(gain, false)).toContain("You get");
      }
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
