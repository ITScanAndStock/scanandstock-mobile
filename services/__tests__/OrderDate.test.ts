import { describe, expect, it } from "vitest";
import { formatOrderDate } from "../OrderDate";

describe("formatOrderDate", () => {
  it("keeps the calendar day written by the API, late in the evening (catches: new Date on the raw text, which gives the 19th under a positive time zone)", () => {
    expect(formatOrderDate("2026-10-18 23:30:00+00:00")).toBe("18/10/2026");
  });

  it("shows no date for a text in another format (catches: the match read without checking it)", () => {
    expect(formatOrderDate("18/10/2026")).toBe("");
  });
});
