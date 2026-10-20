/** Lifecycle of an order — extend when the API adds more states. */
export type CommandeStatus = "en_cours" | "partielle" | "receptionnee" | "annulee";

export type CommandeFilter = "a_receptionner" | "toutes";

/** Single product line on an order detail screen. */
export type CommandeLigne = {
  id: string;
  designation: string;
  orderedQty: number;
  receivedQty: number;
  /** Who last received units on this line (partial or complete). */
  receivedBy?: string | null;
};

/**
 * Order list/detail shape.
 * Matches the Commandes cards today; lines power the detail screen.
 */
export type Commande = {
  id: string;
  /** ISO date (or datetime) when the order was placed — drives the card title. */
  orderedAt: string;
  status: CommandeStatus;
  /** One or more suppliers shown as a comma-separated line. */
  suppliers: string[];
  totalAmount: number;
  currency?: string;
  orderedBy: string;
  /** Set when partially or fully received — drives the “reçue … par …” meta. */
  receivedBy?: string | null;
  /** Whether the order still needs reception (filter “À réceptionner”). */
  awaitingReception: boolean;
  /** Future: order reference shown in detail. */
  reference?: string;
  /** Future: deep-link / detail route payload. */
  notes?: string;
  /** Product lines for the detail screen. */
  lines: CommandeLigne[];
};

export const COMMANDE_STATUS_LABEL: Record<CommandeStatus, string> = {
  en_cours: "En cours",
  partielle: "Partielle",
  receptionnee: "Réceptionnée",
  annulee: "Annulée",
};

export function formatCommandeTitle(orderedAt: string): string {
  const date = new Date(orderedAt);
  if (Number.isNaN(date.getTime())) {
    return "Commande";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `Commande du ${day}/${month}`;
}

export function formatCommandeAmount(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getCommandeProgress(commande: Commande): {
  receivedUnits: number;
  orderedUnits: number;
  completedLines: number;
  totalLines: number;
} {
  const totalLines = commande.lines.length;
  const completedLines = commande.lines.filter((l) => l.receivedQty >= l.orderedQty).length;
  const receivedUnits = commande.lines.reduce((sum, l) => sum + l.receivedQty, 0);
  const orderedUnits = commande.lines.reduce((sum, l) => sum + l.orderedQty, 0);
  return { receivedUnits, orderedUnits, completedLines, totalLines };
}

export function getLigneRemaining(ligne: CommandeLigne): number {
  return Math.max(ligne.orderedQty - ligne.receivedQty, 0);
}

export function isLigneComplete(ligne: CommandeLigne): boolean {
  return ligne.receivedQty >= ligne.orderedQty;
}

export function formatLigneSubtitle(ligne: CommandeLigne): string {
  if (isLigneComplete(ligne)) {
    return ligne.receivedBy ? `Terminée · reçu par ${ligne.receivedBy}` : "Terminée";
  }
  const reste = `Reste ${getLigneRemaining(ligne)}`;
  if (ligne.receivedQty > 0 && ligne.receivedBy) {
    return `${reste} · reçu par ${ligne.receivedBy}`;
  }
  return reste;
}
