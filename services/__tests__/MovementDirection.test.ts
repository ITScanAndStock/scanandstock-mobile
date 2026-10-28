import { describe, expect, it } from "vitest";
import { movementDirection } from "../MovementDirection";

describe("movementDirection", () => {
  it("reads decrease with a positive quantity as an exit, −1 (catches: sign read before type)", () => {
    expect(movementDirection({ type: "decrease", quantity: 1 })).toEqual({ increase: false, label: "−1" });
  });

  it("reads increase with a negative quantity as an entry, +1 (catches: increase dropped from the entry types, or the label not absolute)", () => {
    expect(movementDirection({ type: "increase", quantity: -1 })).toEqual({ increase: true, label: "+1" });
  });

  it.each(["in", "entrée"])("reads %s with a negative quantity as an entry (catches: value dropped from the entry types)", (type) => {
    expect(movementDirection({ type, quantity: -2 })).toEqual({ increase: true, label: "+2" });
  });

  it.each(["out", "sortie"])("reads %s with a positive quantity as an exit (catches: value dropped from the exit types)", (type) => {
    expect(movementDirection({ type, quantity: 2 })).toEqual({ increase: false, label: "−2" });
  });

  it("reads an unknown type on the sign: -2 gives −2, 3 gives +3 (catches: unknown type read as a fixed direction)", () => {
    expect(movementDirection({ type: "transfer", quantity: -2 })).toEqual({ increase: false, label: "−2" });
    expect(movementDirection({ type: "", quantity: 3 })).toEqual({ increase: true, label: "+3" });
  });

  it("reads an unknown type with quantity 0 as an entry (catches: > 0 instead of >= 0)", () => {
    expect(movementDirection({ type: "", quantity: 0 })).toEqual({ increase: true, label: "+0" });
  });
});
