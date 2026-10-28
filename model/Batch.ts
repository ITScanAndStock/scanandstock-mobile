export type Batch = {
  stockDetailsId: number;
  quantity: number;
  batchNumber?: string;
  expirationDate?: string;
};

export type BatchIdentity = Pick<Batch, "batchNumber" | "expirationDate">;

export type ScannedProduct = {
  stockId: number;
  designation: string;
};
