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
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [activeAccount, setActiveAccountState] = useState<Account | null>(null);
	const [isTracingEnabled, setIsTracingEnabled] = useState<boolean>(true);
	const [isLoading, setIsLoading] = useState(true);
	const { isAuthenticated } = useAuth();

	useEffect(() => {
		loadAccounts();
	}, [isAuthenticated]);

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

	const resetAccount = async () => {
		setAccounts([]);
		setActiveAccountState(null);
		setIsTracingEnabled(false);
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

	return <AccountContext.Provider value={{ accounts, activeAccount, setActiveAccount, isLoading, isTracingEnabled, resetAccount }}>{children}</AccountContext.Provider>;
}

export function useAccount() {
	const context = useContext(AccountContext);
	if (!context) {
		throw new Error('useAccount doit être utilisé dans AccountProvider');
	}
	return context;
}
