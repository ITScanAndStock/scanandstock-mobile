// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AuthService from '../services/AuthService';
import ToastService from '../services/ToastService';

interface AuthContextData {
	isAuthenticated: boolean;
	isLoading: boolean;
	login: () => Promise<boolean>;
	logout: () => Promise<void>;
	checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const checkAuth = async () => {
		try {
			console.log('🔍 AuthContext - checkAuth appelé');
			const isValid = await AuthService.isTokenValid();
			console.log('🔍 AuthContext - Token valide:', isValid);
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
				console.log("🚀 AuthContext - Initialisation de l'authentification...");
				await checkAuth();
			} catch (error) {
				console.error('❌ Erreur initialisation auth:', error);
			} finally {
				setIsLoading(false); // Important: toujours passer à false
				console.log('✅ AuthContext - Initialisation terminée');
			}
		};

		initAuth();
	}, []);

	const login = async (): Promise<boolean> => {
		try {
			console.log('🔐 AuthContext - Tentative de connexion...');
			setIsLoading(true);

			// Appeler le service d'authentification
			const success = await AuthService.login();

			if (success) {
				setIsAuthenticated(true);
				console.log('✅ AuthContext - Connexion réussie');
				ToastService.success('Connexion réussie', 'Bienvenue');
				return true;
			} else {
				console.log('❌ AuthContext - Connexion échouée');
				setIsAuthenticated(false);
				ToastService.error('La connexion a échoué', 'Erreur de connexion');
				return false;
			}
		} catch (error) {
			console.error('❌ Erreur de connexion:', error);
			setIsAuthenticated(false);
			ToastService.error('Une erreur est survenue lors de la connexion', 'Erreur');
			return false;
		} finally {
			setIsLoading(false);
		}
	};
	const logout = async () => {
		try {
			setIsLoading(true);
			await AuthService.logout();
			setIsAuthenticated(false);
			ToastService.info('Vous avez été déconnecté', 'Déconnexion');
		} catch (error) {
			if (__DEV__) {
				console.error('Erreur de déconnexion:', error);
			}
			ToastService.error('Erreur lors de la déconnexion', 'Erreur');
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
