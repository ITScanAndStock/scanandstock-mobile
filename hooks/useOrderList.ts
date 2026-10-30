import { useCallback, useEffect, useRef, useState } from "react";

import type { Order } from "@/model/Order";
import OrderService, { AccountChangedError, appendOrders, type OrdersToReceive } from "@/services/OrderService";
import OrderCache from "@/state/OrderCache";

export type OrderListFilter = "toReceive" | "all";

type AllOrders = { orders: Order[]; hasMore: boolean; nextOffset: number };

type ListState = {
  accountId: string;
  toReceive?: OrdersToReceive;
  all?: AllOrders;
  failed: boolean;
};

export function useOrderList(accountId: string | undefined) {
  const [state, setState] = useState<ListState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const latestAccountId = useRef(accountId);
  const loadingMoreRef = useRef(false);

  const update = useCallback((forAccountId: string, change: (previous: ListState) => ListState) => {
    if (latestAccountId.current !== forAccountId) {
      return;
    }
    setState((previous) =>
      change(previous?.accountId === forAccountId ? previous : { accountId: forAccountId, failed: false }),
    );
  }, []);

  const load = useCallback(
    async (forAccountId: string) => {
      try {
        const [toReceive, firstPage] = await Promise.all([
          OrderService.getOrdersToReceive(forAccountId),
          OrderService.getOrdersPage(forAccountId, 0),
        ]);
        OrderCache.remember(forAccountId, [...toReceive.orders, ...firstPage.orders]);
        update(forAccountId, () => ({ accountId: forAccountId, toReceive, all: firstPage, failed: false }));
      } catch (error) {
        if (error instanceof AccountChangedError) {
          return;
        }
        if (__DEV__) {
          console.error("❌ Erreur lors du chargement des commandes", error);
        }
        update(forAccountId, (previous) => ({ ...previous, failed: true }));
      }
    },
    [update],
  );

  useEffect(() => {
    latestAccountId.current = accountId;
    if (accountId) {
      load(accountId);
    }
  }, [accountId, load]);

  const current = accountId && state?.accountId === accountId ? state : null;

  const loadMore = useCallback(async () => {
    const all = current?.all;
    if (!accountId || !all?.hasMore || loadingMoreRef.current) {
      return;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await OrderService.getOrdersPage(accountId, all.nextOffset);
      OrderCache.remember(accountId, page.orders);
      update(accountId, (previous) => ({
        ...previous,
        all: { orders: appendOrders(previous.all?.orders ?? [], page.orders), hasMore: page.hasMore, nextOffset: page.nextOffset },
      }));
    } catch (error) {
      if (__DEV__) {
        console.error("❌ Erreur lors du chargement des commandes suivantes", error);
      }
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [accountId, current?.all, update]);

  const retry = useCallback(() => {
    if (accountId) {
      setState(null);
      load(accountId);
    }
  }, [accountId, load]);

  return {
    toReceive: current?.toReceive,
    all: current?.all,
    failed: current?.failed ?? false,
    loadingMore,
    loadMore,
    retry,
  };
}
