import { describe, expect, it } from "vitest";
import { plural } from "../Plural";

describe("plural", () => {
  it("keeps the singular for 1 and adds an s from 2 (catches: plural from 1)", () => {
    expect(plural(1, "produit")).toBe("1 produit");
    expect(plural(2, "produit")).toBe("2 produits");
  });

  it("takes an irregular plural when given (catches: given plural ignored)", () => {
    expect(plural(3, "produit scanné", "produits scannés")).toBe("3 produits scannés");
  });
});
