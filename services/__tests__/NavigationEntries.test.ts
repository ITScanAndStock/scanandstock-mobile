import { describe, expect, it } from "vitest";
import { navigationEntries } from "../NavigationEntries";

describe("navigationEntries", () => {
  it("lists exactly Commandes then Scan (catches: an entry added, order reversed)", () => {
    const { entries } = navigationEntries();

    expect(entries).toEqual([
      { key: "orders", label: "Commandes", icon: "box", route: "orders", state: "active" },
      { key: "scan", label: "Scan", icon: "viewfinder", route: "index", state: "active" },
    ]);
  });

  it("opens on Scan, the second entry (catches: opening on the first entry, Commandes)", () => {
    const { entries, openingEntry } = navigationEntries();

    expect(entries[0].key).toBe("orders");
    expect(openingEntry).toEqual(entries[1]);
  });
});
