import { Batch, BatchIdentity } from "@/model/Batch";

function expirationTime({ expirationDate }: Batch): number {
  if (!expirationDate) {
    return Number.MAX_SAFE_INTEGER;
  }
  const [day, month, year] = expirationDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function isSameBatch(batch: Batch, identity: BatchIdentity): boolean {
  return batch.batchNumber === identity.batchNumber && batch.expirationDate === identity.expirationDate;
}

export function orderBatches(batches: Batch[], remembered?: BatchIdentity): Batch[] {
  const byExpiration = [...batches].sort((a, b) => expirationTime(a) - expirationTime(b));
  const rememberedIndex = remembered ? byExpiration.findIndex((batch) => isSameBatch(batch, remembered)) : -1;
  if (rememberedIndex <= 0) {
    return byExpiration;
  }
  const [rememberedBatch] = byExpiration.splice(rememberedIndex, 1);
  return [rememberedBatch, ...byExpiration];
}
