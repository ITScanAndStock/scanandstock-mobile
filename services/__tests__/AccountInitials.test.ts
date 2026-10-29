import { describe, expect, it } from "vitest";
import { accountInitials } from "../AccountInitials";

describe("accountInitials", () => {
  it("takes the first and the last word (catches: second word instead of the last)", () => {
    expect(accountInitials("Cabinet du Parc")).toBe("CP");
  });

  it("upper-cases the letters (catches: upper case forgotten)", () => {
    expect(accountInitials("cabinet du parc")).toBe("CP");
  });

  it("trims and splits on runs of spaces (catches: split on a single space without trimming)", () => {
    expect(accountInitials("  Cabinet  du  Parc  ")).toBe("CP");
  });

  it("gives one letter for one word (catches: letter doubled)", () => {
    expect(accountInitials("Dentaire")).toBe("D");
  });

  it("gives an empty string without a name (catches: empty-name guard removed)", () => {
    expect(accountInitials("")).toBe("");
    expect(accountInitials("   ")).toBe("");
    expect(accountInitials(undefined)).toBe("");
  });
});
