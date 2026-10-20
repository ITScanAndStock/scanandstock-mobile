import { StockProduit } from "@/model/StockProduit";

/** Placeholder stock list until the catalogue API is wired — mirrors the Figma screens. */
export const MOCK_STOCK: StockProduit[] = [
  {
    id: "stk-1",
    designation: "Composite Filtek Z250 A2 seringue 4 g",
    supplier: "Fournisseur A",
    category: "Restauration",
    quantity: 2,
    threshold: 3,
    orderedQty: 6,
    reference: "6020A2",
    idealStock: 8,
    perBox: 1,
    purchasePrice: 18.4,
    lots: [
      {
        id: "lot-1",
        lotNumber: "LT1876",
        quantity: 1,
        expiresAt: "2026-11-30",
        expiresHint: "dans 6 semaines",
        expiringSoon: true,
      },
      {
        id: "lot-2",
        lotNumber: "LT2291",
        quantity: 1,
        expiresAt: "2028-03-31",
      },
      {
        id: "lot-3",
        lotNumber: "LT1102",
        quantity: 2,
        expiresAt: "2025-08-15",
        used: true,
      },
    ],
  },
  {
    id: "stk-2",
    designation: "Compresses stériles 5 × 5 cm",
    supplier: "Fournisseur B",
    category: "Hygiène",
    quantity: 4,
    threshold: 10,
    reference: "COMP55",
    idealStock: 20,
    perBox: 100,
    purchasePrice: 4.5,
    lots: [
      {
        id: "lot-c1",
        lotNumber: "CS4401",
        quantity: 4,
        expiresAt: "2027-01-31",
      },
    ],
  },
  {
    id: "stk-3",
    designation: "Hypochlorite de sodium 2,5 % 1 L",
    supplier: "Fournisseur C",
    category: "Endodontie",
    quantity: 1,
    threshold: 2,
    reference: "HYP25",
    idealStock: 4,
    perBox: 1,
    purchasePrice: 12.9,
    lots: [
      {
        id: "lot-h1",
        lotNumber: "HY992",
        quantity: 1,
        expiresAt: "2026-09-30",
        expiresHint: "dans 3 mois",
        expiringSoon: true,
      },
    ],
  },
  {
    id: "stk-4",
    designation: "Gants nitrile taille M, boîte de 100",
    supplier: "Fournisseur A",
    category: "Hygiène",
    quantity: 24,
    threshold: 10,
    reference: "GN-M100",
    idealStock: 30,
    perBox: 100,
    purchasePrice: 6.2,
    lots: [
      {
        id: "lot-g1",
        lotNumber: "GN884",
        quantity: 24,
        expiresAt: "2029-11-30",
      },
    ],
  },
  {
    id: "stk-5",
    designation: "Fraise diamantée 856 016",
    supplier: "Fournisseur A",
    category: "Instruments",
    quantity: 13,
    threshold: 5,
    reference: "FD856016",
    idealStock: 15,
    perBox: 5,
    purchasePrice: 3.8,
    lots: [
      {
        id: "lot-f1",
        lotNumber: "FD220",
        quantity: 13,
        expiresAt: "2030-01-01",
      },
    ],
  },
  {
    id: "stk-6",
    designation: "Articaïne 4 % adrénalinée 1/100 000",
    supplier: "Fournisseur D",
    category: "Anesthésie",
    quantity: 120,
    threshold: 50,
    reference: "ART4-100",
    idealStock: 150,
    perBox: 50,
    purchasePrice: 42.0,
    lots: [
      {
        id: "lot-a1",
        lotNumber: "AR5501",
        quantity: 120,
        expiresAt: "2027-06-30",
      },
    ],
  },
];

export function getStockProduitById(id: string): StockProduit | undefined {
  return MOCK_STOCK.find((item) => item.id === id);
}
