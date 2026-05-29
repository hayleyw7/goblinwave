import { describe, expect, it } from "vitest";
import {
  assertAlliterativeName,
  initialSoundCluster,
  isAlliterativeName,
} from "../src/lib/alliteration.js";

describe("initialSoundCluster", () => {
  it("matches multi-letter clusters before single letters", () => {
    expect(initialSoundCluster("shrimp")).toBe("shr");
    expect(initialSoundCluster("skrill")).toBe("sk");
    expect(initialSoundCluster("chaos")).toBe("ch");
    expect(initialSoundCluster("three")).toBe("th");
  });

  it("falls back to first letter for simple words", () => {
    expect(initialSoundCluster("rabbit")).toBe("r");
    expect(initialSoundCluster("")).toBe("");
  });
});

describe("isAlliterativeName", () => {
  it("accepts matching opening sounds", () => {
    expect(isAlliterativeName("Skrill Skrimp")).toBe(true);
    expect(isAlliterativeName("Rabid Rabbit")).toBe(true);
    expect(isAlliterativeName("Rotten Roach")).toBe(true);
    expect(isAlliterativeName("Tiny T-Rex")).toBe(true);
    expect(isAlliterativeName("Happy Cat")).toBe(false);
  });

  it("rejects mismatched names", () => {
    expect(isAlliterativeName("Happy Shrimp")).toBe(false);
    expect(isAlliterativeName("One Word")).toBe(false);
    expect(isAlliterativeName("Same Letter Cat")).toBe(false);
  });

  it("rejects wrong word counts", () => {
    expect(isAlliterativeName("Only")).toBe(false);
    expect(isAlliterativeName("Too Many Words Here")).toBe(false);
  });
});

describe("assertAlliterativeName", () => {
  it("throws for invalid names with helpful errors", () => {
    expect(() => assertAlliterativeName("Bad Name")).toThrow(/alliterative/i);
    expect(() => assertAlliterativeName("Solo")).toThrow(/two words/i);
    expect(() => assertAlliterativeName("Wrong T-Rex")).toThrow(/T-Rex/i);
  });

  it("accepts valid names without throwing", () => {
    expect(() => assertAlliterativeName("Mighty Mouse")).not.toThrow();
  });
});
