import { describe, expect, it } from "vitest";
import { formatMovementDate } from "../MovementDate";

describe("formatMovementDate", () => {
  it("shows today's movement at the phone's winter time (catches: new Date kept, invalid for a day above 12; text read as local time, 07:05)", () => {
    expect(formatMovementDate("25-10-2026 07:05:00", new Date(2026, 9, 25, 12, 0))).toBe("08:05");
  });

  it("shows today's movement at the phone's summer time (catches: fixed one-hour offset)", () => {
    expect(formatMovementDate("20-10-2026 07:05:00", new Date(2026, 9, 20, 12, 0))).toBe("09:05");
  });

  it("keeps the day before the month (catches: day and month swapped, 11/03)", () => {
    expect(formatMovementDate("03-11-2026 10:12:00", new Date(2026, 10, 5, 12, 0))).toBe("03/11");
  });

  it("takes the day at the phone's time, not the UTC text's (catches: day read from the UTC text)", () => {
    expect(formatMovementDate("31-10-2026 22:30:00", new Date(2026, 10, 1, 0, 10))).toBe("hier");
    expect(formatMovementDate("31-10-2026 23:30:00", new Date(2026, 10, 1, 8, 0))).toBe("00:30");
  });

  it("counts yesterday in calendar days (catches: yesterday as the last 24 hours)", () => {
    expect(formatMovementDate("30-10-2026 23:00:00", new Date(2026, 10, 1, 23, 59))).toBe("hier");
    expect(formatMovementDate("30-10-2026 22:59:00", new Date(2026, 10, 1, 0, 10))).toBe("30/10");
  });

  it("counts yesterday across the change to winter time (catches: yesterday as today's midnight minus 86 400 000 ms)", () => {
    expect(formatMovementDate("24-10-2026 22:30:00", new Date(2026, 9, 26, 0, 10))).toBe("hier");
  });

  it("counts yesterday across a new year (catches: yesterday of 1 January computed without changing year)", () => {
    expect(formatMovementDate("31-12-2025 08:00:00", new Date(2026, 0, 1, 12, 0))).toBe("hier");
  });

  it("adds the year outside the current year (catches: today compared without the year; year left out for another year)", () => {
    expect(formatMovementDate("05-11-2025 09:00:00", new Date(2026, 10, 5, 12, 0))).toBe("05/11/2025");
  });

  it.each([
    "2026-11-03 10:12:00",
    "31-02-2026 10:00:00",
    "03-13-2026 10:00:00",
    "03-11-2026 25:00:00",
    "03-11-2026 10:60:00",
    "03-11-2026 10:12:60",
    "01-01-0050 10:00:00",
    "x03-11-2026 10:12:00",
    "03-11-2026 10:12:00Z",
    "",
    undefined,
  ])("shows no date for %s (catches: lenient reading; pattern not anchored; Date rolling 31 February, month 13 or 25 h over; year 50 read as 1950; minute or second not bounded)", (text) => {
    expect(formatMovementDate(text, new Date(2026, 10, 5, 12, 0))).toBe("");
  });

  it("shows a day to come as day and month (catches: a day to come taken for today, or shown empty)", () => {
    expect(formatMovementDate("06-11-2026 09:00:00", new Date(2026, 10, 5, 12, 0))).toBe("06/11");
  });
});
