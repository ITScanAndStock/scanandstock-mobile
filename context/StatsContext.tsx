import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createMovementFeed, type MovementFeed, type MovementFeedState } from "../services/MovementFeed";
import ProductService, { MOVEMENT_PAGE_SIZE } from "../services/ProductService";
import ToastService from "../services/ToastService";
import { useAccount } from "./AccountContext";
import { useAuth } from "./AuthContext";

type StatsContextType = MovementFeedState & Pick<MovementFeed, "loadNextPage" | "retry" | "afterWrite">;

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const { activeAccount } = useAccount();
  // The logout after 5 min in the background and a refused session keep the account in memory.
  const { isAuthenticated } = useAuth();
  const [feed] = useState(() =>
    createMovementFeed({
      loadPage: (accountId, offset) => ProductService.getMovementsPage(accountId, offset),
      pageSize: MOVEMENT_PAGE_SIZE,
      onPullFailed: () => ToastService.error("Impossible de charger les mouvements"),
    }),
  );
  const state = useSyncExternalStore(feed.subscribe, feed.getState);
  const accountId = activeAccount?.id ?? null;

  useEffect(() => {
    feed.setSession({ accountId, connected: isAuthenticated });
  }, [feed, accountId, isAuthenticated]);

  const value = useMemo(
    () => ({ ...state, loadNextPage: feed.loadNextPage, retry: feed.retry, afterWrite: feed.afterWrite }),
    [feed, state],
  );

  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStatsContext() {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error("useStatsContext must be used within StatsProvider");
  }
  return context;
}
