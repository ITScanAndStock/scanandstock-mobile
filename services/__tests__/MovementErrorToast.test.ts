import { describe, expect, it } from "vitest";
import { isBatchChoiceRequired, movementErrorToast } from "../MovementErrorToast";

const refused = (status: number, data: unknown) => ({
  response: { status, data },
  badgeSent: false,
  tracingEnabled: false,
});

describe("movementErrorToast", () => {
  it("shows the API message of a 400 (catches: generic message kept)", () => {
    expect(movementErrorToast(refused(400, { errorMessage: "RUPTURE STOCK : Gants", code: 0 }))).toEqual([
      "RUPTURE STOCK : Gants",
    ]);
  });

  it("titles a kit refusal and lists its missing products on their own lines (catches: first line only, <br/> kept, header kept in the message)", () => {
    const kit = "RUPTURE STOCK : <br/>Fraise 856 (0)<br/>Compresses (2)";
    expect(movementErrorToast(refused(400, { errorMessage: kit, code: 0 }))).toEqual([
      "Fraise 856 (0)\nCompresses (2)",
      "Rupture de stock",
    ]);
  });

  it("keeps a first line that is more than the header in the message, without a title (catches: header recognised on any first line)", () => {
    expect(movementErrorToast(refused(400, { errorMessage: "Produit A<br/>détail", code: 0 }))).toEqual([
      "Produit A\ndétail",
    ]);
  });

  it("keeps the generic message for a 400 without errorMessage (catches: the BadRequestException message shown)", () => {
    expect(movementErrorToast(refused(400, { status: 400, message: "Required request body is missing" }))).toEqual([
      "Erreur lors du scan du produit",
    ]);
  });

  it("keeps the generic message for another status carrying errorMessage (catches: status not checked)", () => {
    expect(movementErrorToast(refused(500, { errorMessage: "NullPointerException" }))).toEqual([
      "Erreur lors du scan du produit",
    ]);
  });

  it("leaves a 409 to the caller (catches: toast shown over the expiry alert)", () => {
    expect(movementErrorToast(refused(409, {}))).toBeNull();
  });

  it("warns that the scan may have been saved when no answer comes back (catches: title dropped)", () => {
    expect(movementErrorToast({ badgeSent: false, tracingEnabled: false })).toEqual([
      "Le scan a peut-être été enregistré : vérifiez le stock avant de scanner à nouveau.",
      "Pas de réponse du serveur",
    ]);
  });

  it("asks to remove a refused badge when one was sent, even with tracing on (catches: tracing checked first)", () => {
    expect(movementErrorToast({ ...refused(417, {}), badgeSent: true, tracingEnabled: true })).toEqual([
      "Touchez la pastille de votre badge pour le retirer, puis scannez un badge actif.",
      "Badge refusé",
      6000,
    ]);
  });

  it("asks for a badge scan when none was sent and tracing is on (catches: local tracing ignored)", () => {
    expect(movementErrorToast({ ...refused(417, {}), tracingEnabled: true })).toEqual([
      "Scannez votre badge puis recommencez.",
      "Badge requis",
      6000,
    ]);
  });

  it("asks to sign in again when the account traces badges but the app does not (catches: tracing branch taken without tracing)", () => {
    expect(movementErrorToast(refused(417, {}))).toEqual([
      "Le traçage par badge est activé sur votre compte : déconnectez-vous puis reconnectez-vous.",
      "Badge requis",
      6000,
    ]);
  });
});

describe("isBatchChoiceRequired", () => {
  it("recognises a 400 whose body carries code 222 (catches: code compared to another value)", () => {
    expect(isBatchChoiceRequired({ status: 400, data: { errorMessage: "RUPTURE STOCK : Fraise", code: 222 } })).toBe(true);
  });

  it("rejects a 400 with code 0 or without a body (catches: predicate on the 400 status alone)", () => {
    expect(isBatchChoiceRequired({ status: 400, data: { errorMessage: "Refus", code: 0 } })).toBe(false);
    expect(isBatchChoiceRequired({ status: 400, data: "" })).toBe(false);
  });

  it("rejects code 222 on another status, and no response (catches: predicate on the code alone)", () => {
    expect(isBatchChoiceRequired({ status: 409, data: { code: 222 } })).toBe(false);
    expect(isBatchChoiceRequired(undefined)).toBe(false);
  });
});
