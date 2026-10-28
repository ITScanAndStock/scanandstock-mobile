import { BatchIdentity } from "@/model/Batch";

const rememberedByStockId = new Map<number, BatchIdentity>();

const RememberedBatchStore = {
  remember(stockId: number, { batchNumber, expirationDate }: BatchIdentity) {
    rememberedByStockId.set(stockId, { batchNumber, expirationDate });
  },
  get(stockId: number) {
    return rememberedByStockId.get(stockId);
  },
  forgetAll() {
    rememberedByStockId.clear();
  },
};

export default RememberedBatchStore;
