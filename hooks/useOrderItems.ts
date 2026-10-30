import { useCallback, useEffect, useState } from "react";

import type { Order, OrderItem } from "@/model/Order";
import OrderService, { AccountChangedError } from "@/services/OrderService";

type ItemsState = { accountId: string; orderId: number; attempt: number; items?: OrderItem[]; failed: boolean };

export function useOrderItems(accountId: string | undefined, order: Order | undefined) {
  const orderId = order?.orderId;
  const [state, setState] = useState<ItemsState | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!accountId || orderId === undefined) {
      return;
    }
    let cancelled = false;
    OrderService.getOrderItems(accountId, orderId).then(
      (items) => {
        if (!cancelled) {
          setState({ accountId, orderId, attempt, items, failed: false });
        }
      },
      (error) => {
        if (cancelled || error instanceof AccountChangedError) {
          return;
        }
        if (__DEV__) {
          console.error("❌ Erreur lors du chargement du détail de la commande", error);
        }
        setState({ accountId, orderId, attempt, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [accountId, orderId, attempt]);

  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);

  // On the tablet the selection changes under a mounted pane: the previous order's lines must not show meanwhile.
  const current =
    state && state.accountId === accountId && state.orderId === orderId && state.attempt === attempt ? state : null;
  return { items: current?.items, failed: current?.failed ?? false, retry };
}
