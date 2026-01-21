import ToastService from "@/services/ToastService";
import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { StatsModel } from "../model/Stats";
import ProductService from "../services/ProductService";
import { useAccount } from "./AccountContext";

type StatsContextType = {
  stats?: StatsModel[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const { activeAccount, isTracingEnabled, activeBadgeId } = useAccount();
  const [stats, setStats] = useState<StatsModel[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastAccountId, setLastAccountId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!activeAccount?.id) {
      setStats(undefined);
      setLastAccountId(null);
      return;
    }

    if (isTracingEnabled && activeBadgeId === null) {
      ToastService.info("aucun bagde connecté", "Les stats non affiché");
      setStats(undefined);
      setLastAccountId(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await ProductService.getStats();
      setStats(response);
      setLastAccountId(activeAccount.id);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount?.id]);

  useEffect(() => {
    if (activeAccount?.id && activeAccount.id !== lastAccountId) {
      loadStats();
    }
  }, [activeAccount?.id, lastAccountId, loadStats]);

  return (
    <StatsContext.Provider
      value={{
        stats,
        isLoading,
        error,
        refresh: loadStats,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export function useStatsContext() {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error("useStatsContext must be used within StatsProvider");
  }
  return context;
}
