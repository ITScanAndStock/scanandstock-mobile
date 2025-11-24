// hooks/useStats.ts
import { useStatsContext } from "../context/StatsContext";

export function useStats() {
  return useStatsContext();
}
