import BadgeServices from '@/services/BadgeServices';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Account } from '../model/Account';
import { useAuth } from './AuthContext';

interface AccountContextType {
	accounts: Account[];
	activeAccount: Account | null;
	setActiveAccount: (account: Account) => Promise<void>;
	isLoading: boolean;
	isTracingEnabled: boolean | undefined;
	resetAccount: () => Promise<void>;
	activeBadgeId: string;
	activeBadgeName: string;
	getBadge: (badge: string) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [activeAccount, setActiveAccountState] = useState<Account | null>(null);
	const [isTracingEnabled, setIsTracingEnabled] = useState<boolean>(true);
	const [isLoading, setIsLoading] = useState(true);
	const { isAuthenticated } = useAuth();
	const [badgeConnected, setBadgeConnected] = useState(false);
	const [activeBadgeId, setActiveBadgeId] = useState('');
	const [activeBadgeName, setActiveBadgeName] = useState('');
	const [activeBadgeScan, setActiveBadgeScan] = useState('');

	useEffect(() => {
		loadAccounts();
		loadBadge();
	}, [isAuthenticated, badgeConnected]);

	const loadAccounts = async () => {
		try {
			setIsLoading(true);
			const accountsString = await AsyncStorage.getItem('account');
			const activeAccountString = await AsyncStorage.getItem('activated_compte');
			const tracingEnabled = await AsyncStorage.getItem('tracingEnabled');

			if (accountsString) {
				const parsedAccounts = JSON.parse(accountsString);
				setAccounts(parsedAccounts);
			}

			if (activeAccountString) {
				const parsedActiveAccount = JSON.parse(activeAccountString);
				setActiveAccountState(parsedActiveAccount);
			}

			if (tracingEnabled) {
				const parsedTracingEnabled = JSON.parse(tracingEnabled);
				setIsTracingEnabled(parsedTracingEnabled);
			}
		} catch (error) {
			if (__DEV__) {
				console.error('Erreur chargement comptes:', error);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const getBadge = async (badge: string) => {
		try {
			setIsLoading(true);
			const succes = await BadgeServices.getBadge(badge);
			if (succes) {
				setBadgeConnected(true);
			}
		} catch (error) {
			if (__DEV__) {
				console.error('Erreur connexion badge:', error);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const loadBadge = async () => {
		try {
			setIsLoading(true);
			const badgeId = await AsyncStorage.getItem('badge_id');
			const userName = await AsyncStorage.getItem('user_name');
			const badgeScan = await AsyncStorage.getItem('badge-scan');

			if (badgeId && userName && badgeScan) {
				setActiveBadgeId(badgeId);
				setActiveBadgeName(userName);
				setActiveBadgeScan(badgeScan);
			}
		} catch (error) {
			if (__DEV__) {
				console.error('Erreur chargement comptes:', error);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const resetAccount = async () => {
		setAccounts([]);
		setActiveAccountState(null);
		setIsTracingEnabled(false);
		setActiveBadgeId('');
		setActiveBadgeName('');
	};

	const setActiveAccount = async (account: Account) => {
		try {
			await AsyncStorage.setItem('activated_compte', JSON.stringify(account));
			setActiveAccountState(account);
		} catch (error) {
			if (__DEV__) {
				console.error('Erreur sauvegarde compte actif:', error);
			}
		}
	};

	return <AccountContext.Provider value={{ accounts, activeAccount, setActiveAccount, isLoading, isTracingEnabled, resetAccount, activeBadgeId, activeBadgeName, getBadge }}>{children}</AccountContext.Provider>;
}

export function useAccount() {
	const context = useContext(AccountContext);
	if (!context) {
		throw new Error('useAccount doit être utilisé dans AccountProvider');
	}
	return context;
}
