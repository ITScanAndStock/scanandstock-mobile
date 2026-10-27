type MovementError = {
  response?: { status: number; data: unknown };
  badgeSent: boolean;
  tracingEnabled: boolean;
};

type ErrorToastArgs = [message: string, title?: string, durationMs?: number];

const GENERIC_MESSAGE = "Erreur lors du scan du produit";
const KIT_OUT_OF_STOCK_HEADER = "RUPTURE STOCK :";
const BADGE_TOAST_MS = 6000;

function apiMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("errorMessage" in data)) {
    return null;
  }
  return typeof data.errorMessage === "string" ? data.errorMessage : null;
}

function apiMessageToast(message: string): ErrorToastArgs {
  const lines = message.split("<br/>");
  if (lines[0].trim() === KIT_OUT_OF_STOCK_HEADER) {
    return [lines.slice(1).join("\n"), "Rupture de stock"];
  }
  return [lines.join("\n")];
}

function badgeRefusalToast(badgeSent: boolean, tracingEnabled: boolean): ErrorToastArgs {
  if (badgeSent) {
    return [
      "Touchez la pastille de votre badge pour le retirer, puis scannez un badge actif.",
      "Badge refusé",
      BADGE_TOAST_MS,
    ];
  }
  if (tracingEnabled) {
    return ["Scannez votre badge puis recommencez.", "Badge requis", BADGE_TOAST_MS];
  }
  return [
    "Le traçage par badge est activé sur votre compte : déconnectez-vous puis reconnectez-vous.",
    "Badge requis",
    BADGE_TOAST_MS,
  ];
}

export function movementErrorToast({ response, badgeSent, tracingEnabled }: MovementError): ErrorToastArgs | null {
  if (!response) {
    // The stock may have moved server-side, so the scan is never replayed.
    return [
      "Le scan a peut-être été enregistré : vérifiez le stock avant de scanner à nouveau.",
      "Pas de réponse du serveur",
    ];
  }
  if (response.status === 409) {
    return null;
  }
  if (response.status === 417) {
    return badgeRefusalToast(badgeSent, tracingEnabled);
  }
  if (response.status === 400) {
    const message = apiMessage(response.data);
    if (message) {
      return apiMessageToast(message);
    }
  }
  return [GENERIC_MESSAGE];
}
