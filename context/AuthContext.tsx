// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AuthService from '../services/AuthService';

interface AuthContextData {
	isAuthenticated: boolean;
	isLoading: boolean;
	login: () => Promise<void>;
	logout: () => Promise<void>;
	checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const checkAuth = async () => {
		try {
			const isValid = await AuthService.isTokenValid();
			setIsAuthenticated(isValid);
		} catch (error) {
			console.error('❌ AuthContext - Erreur checkAuth:', error);
			setIsAuthenticated(false);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		const initAuth = async () => {
			try {
				await checkAuth();
			} catch (error) {
				console.error('❌ Erreur initialisation auth:', error);
			} finally {
				setIsLoading(false); // Important: toujours passer à false
			}
		};

		initAuth();
	}, []);

	const login = async () => {
		try {
			console.log('🔐 AuthContext - Tentative de connexion...');
			setIsLoading(true);

			// Appeler le service d'authentification
			const success = await AuthService.login();

			if (success) {
				setIsAuthenticated(true);
			} else {
				console.log('❌ AuthContext - Connexion échouée');
				setIsAuthenticated(false);
			}
		} catch (error) {
			console.error('❌ Erreur de connexion:', error);
			setIsAuthenticated(false);
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async () => {
		try {
			setIsLoading(true);
			await AuthService.logout();
			setIsAuthenticated(false);
		} catch (error) {
			console.error('Erreur de déconnexion:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				isAuthenticated,
				isLoading,
				login,
				logout,
				checkAuth,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
