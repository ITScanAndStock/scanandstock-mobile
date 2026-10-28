import { describe, expect, it } from "vitest";
import { navigationEntries, parseShowLockedNav } from "../NavigationEntries";

const PHONE = { tablet: false, showLockedEntries: true };
const TABLET = { tablet: true, showLockedEntries: true };

describe("navigationEntries on a phone", () => {
  it("lists exactly Commandes then Scan (catches: an entry added, order reversed)", () => {
    const { entries } = navigationEntries(PHONE);

    expect(entries).toEqual([
      { key: "orders", label: "Commandes", icon: "box", route: "orders", state: "active" },
      { key: "scan", label: "Scan", icon: "viewfinder", route: "index", state: "active" },
    ]);
  });

  it("opens on Scan, the second entry (catches: opening on the first entry, Commandes)", () => {
    const { entries, openingEntry } = navigationEntries(PHONE);

    expect(entries[0].key).toBe("orders");
    expect(openingEntry).toEqual(entries[1]);
  });
});

describe("navigationEntries on a tablet", () => {
  it("lists the eight entries of the mockup in its order (catches: order changed)", () => {
    const { entries } = navigationEntries(TABLET);

    expect(entries.map((entry) => [entry.key, entry.label])).toEqual([
      ["home", "Accueil"],
      ["orders", "Commandes"],
      ["stock", "Stock"],
      ["cart", "Panier"],
      ["alerts", "Alertes"],
      ["providers", "Fournisseurs"],
      ["kits", "Kits"],
      ["stats", "Stats"],
    ]);
  });

  it("opens only Accueil and Commandes, on the routes of the tab group (catches: a locked entry made active)", () => {
    const { entries } = navigationEntries(TABLET);

    expect(entries.filter((entry) => entry.state === "active")).toEqual([
      { key: "home", label: "Accueil", icon: "viewfinder", route: "index", state: "active" },
      { key: "orders", label: "Commandes", icon: "box", route: "orders", state: "active" },
    ]);
    expect(entries.filter((entry) => entry.state === "locked").map((entry) => entry.key)).toEqual([
      "stock",
      "cart",
      "alerts",
      "providers",
      "kits",
      "stats",
    ]);
  });

  it("opens on Accueil (catches: opening on Commandes)", () => {
    const { entries, openingEntry } = navigationEntries(TABLET);

    expect(openingEntry).toEqual(entries[0]);
    expect(openingEntry.key).toBe("home");
  });

  it("keeps only Accueil and Commandes when locked entries are hidden (catches: setting ignored)", () => {
    const { entries, openingEntry } = navigationEntries({ tablet: true, showLockedEntries: false });

    expect(entries.map((entry) => entry.key)).toEqual(["home", "orders"]);
    expect(openingEntry.key).toBe("home");
  });
});

describe("parseShowLockedNav", () => {
  it("hides locked entries only for the value false (catches: any non-empty value read as false)", () => {
    expect(parseShowLockedNav("false")).toBe(false);
    expect(parseShowLockedNav("true")).toBe(true);
    expect(parseShowLockedNav("")).toBe(true);
    expect(parseShowLockedNav(undefined)).toBe(true);
  });
});
