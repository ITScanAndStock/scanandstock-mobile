import { useEffect, useState } from "react";

import { canReceiveOrders } from "@/services/AccessToken";
import SecureStorageService from "@/services/SecureStorageService";

// Read again for each order opened: the token is rewritten under "token" at each refresh, so the right follows it offline.
export function useCanReceive(orderId: number | undefined): boolean | null {
  const [read, setRead] = useState<{ orderId: number; canReceive: boolean } | null>(null);

  useEffect(() => {
    if (orderId === undefined) {
      return;
    }
    let cancelled = false;
    SecureStorageService.getToken().then((token) => {
      if (!cancelled) {
        setRead({ orderId, canReceive: canReceiveOrders(token) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return read && read.orderId === orderId ? read.canReceive : null;
}
