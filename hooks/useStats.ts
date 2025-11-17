// hooks/useStats.ts
import { useEffect, useState } from 'react';
import { useAccount } from '../context/AccountContext';
import { StatsModel } from '../model/Stats';
import ProductService from '../services/ProductService';

/**
 * Hook personnalisé pour gérer le chargement des statistiques
 * Évite la duplication de code entre index.tsx et scanner.tsx
 */
export function useStats() {
	const [stats, setStats] = useState<StatsModel[]>();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const { activeAccount } = useAccount();

	const loadStats = async () => {
		try {
			setIsLoading(true);
			setError(null);
			const response = await ProductService.getStats();
			setStats(response);
		} catch (err) {
			if (__DEV__) {
				console.error('❌ Erreur chargement stats:', err);
			}
			setError(err as Error);
		} finally {
			setIsLoading(false);
		}
	};

	// Charger automatiquement quand le compte actif change
	useEffect(() => {
		if (activeAccount) {
			loadStats();
		}
	}, [activeAccount]);

	return {
		stats,
		isLoading,
		error,
		reload: loadStats,
	};
}
