import type { BarcodeSettings } from "expo-camera";

export const BARCODE_SCANNER_SETTINGS: BarcodeSettings = {
  barcodeTypes: [
    "qr",
    "aztec",
    "codabar",
    "code128",
    "code39",
    "code93",
    "datamatrix",
    "ean13",
    "ean8",
    "itf14",
    "pdf417",
    "upc_a",
    "upc_e",
  ],
};
