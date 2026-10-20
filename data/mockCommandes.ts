import { Commande } from "@/model/Commande";

/** Placeholder data until the commandes API is wired — mirrors the Figma screens. */
export const MOCK_COMMANDES: Commande[] = [
  {
    id: "cmd-20251018",
    orderedAt: "2025-10-18T10:00:00",
    status: "en_cours",
    suppliers: ["Fournisseur A"],
    totalAmount: 412.8,
    orderedBy: "Marie L.",
    awaitingReception: true,
    lines: [
      {
        id: "l1",
        designation: "Composite Filtek Z250 A2 seringue 4 g",
        orderedQty: 6,
        receivedQty: 0,
      },
      {
        id: "l2",
        designation: "Gants nitrile taille M, boîte de 100",
        orderedQty: 10,
        receivedQty: 4,
        receivedBy: "Marie L.",
      },
      {
        id: "l3",
        designation: "Fraise diamantée 856 016",
        orderedQty: 5,
        receivedQty: 0,
      },
      {
        id: "l4",
        designation: "Compresses stériles 5 × 5 cm",
        orderedQty: 20,
        receivedQty: 20,
        receivedBy: "Paul R.",
      },
      {
        id: "l5",
        designation: "Articaïne 4 % adrénalinée 1/100 000",
        orderedQty: 2,
        receivedQty: 0,
      },
    ],
  },
  {
    id: "cmd-20251015",
    orderedAt: "2025-10-15T09:30:00",
    status: "partielle",
    suppliers: ["Fournisseur B", "Fournisseur C"],
    totalAmount: 1236.4,
    orderedBy: "Paul R.",
    receivedBy: "Marie L.",
    awaitingReception: true,
    lines: [
      {
        id: "l1",
        designation: "Gants nitrile taille L, boîte de 100",
        orderedQty: 15,
        receivedQty: 10,
        receivedBy: "Marie L.",
      },
      {
        id: "l2",
        designation: "Masques chirurgicaux type IIR",
        orderedQty: 50,
        receivedQty: 20,
        receivedBy: "Marie L.",
      },
      {
        id: "l3",
        designation: "Seringues 2 ml",
        orderedQty: 100,
        receivedQty: 100,
        receivedBy: "Paul R.",
      },
    ],
  },
  {
    id: "cmd-20251012",
    orderedAt: "2025-10-12T14:15:00",
    status: "en_cours",
    suppliers: ["Fournisseur A"],
    totalAmount: 89.9,
    orderedBy: "Marie L.",
    awaitingReception: true,
    lines: [
      {
        id: "l1",
        designation: "Alginate Chromatic",
        orderedQty: 3,
        receivedQty: 0,
      },
    ],
  },
  {
    id: "cmd-20251005",
    orderedAt: "2025-10-05T11:00:00",
    status: "receptionnee",
    suppliers: ["Fournisseur D"],
    totalAmount: 540,
    orderedBy: "Paul R.",
    receivedBy: "Paul R.",
    awaitingReception: false,
    lines: [
      {
        id: "l1",
        designation: "Brossettes interdentaires",
        orderedQty: 12,
        receivedQty: 12,
        receivedBy: "Paul R.",
      },
    ],
  },
];

export function getCommandeById(id: string): Commande | undefined {
  return MOCK_COMMANDES.find((c) => c.id === id);
}
