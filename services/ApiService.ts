// services/ApiService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import { apiConfig } from '../config/KeycloakConfig';
import AuthService from './AuthService';

const apiClient = axios.create({
	baseURL: apiConfig.apiUrl,
	timeout: 15000, // 15 secondes
	headers: {
		'Content-Type': 'application/json',
	},
});

// Intercepteur pour ajouter le token à chaque requête
apiClient.interceptors.request.use(
	async (config) => {
		const token = await AuthService.getToken();

		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		// Ajouter l'Account-Id à chaque requête
		try {
			const activeAccountString = await AsyncStorage.getItem('activated_compte');
			if (activeAccountString) {
				const activeAccount = JSON.parse(activeAccountString);
				if (activeAccount?.id) {
					config.headers['Account-Id'] = activeAccount.id;
				}
			}

			// Ajouter le Badge-Id si isTracingEnabled est true
			const tracingEnabledString = await AsyncStorage.getItem('tracingEnabled');
			if (tracingEnabledString) {
				const isTracingEnabled = JSON.parse(tracingEnabledString);
				if (isTracingEnabled === true) {
					const badgeScanString = await AsyncStorage.getItem('badge-scan');
					if (badgeScanString) {
						const badgeScan = JSON.parse(badgeScanString);
						if (__DEV__) {
							console.log('Badge-Id envoyé:', badgeScan);
						}
						config.headers['Badge-Id'] = badgeScan;
					}
				}
			}
		} catch (error) {
			if (__DEV__) {
				console.warn("⚠️ Impossible de récupérer l'Account-Id ou Badge-Id:", error);
			}
		}

		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Intercepteur pour gérer les erreurs 401
apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		// Si erreur 401 et pas déjà tenté de refresh
		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;

			try {
				await AuthService.refreshToken();
				const newToken = await AuthService.getToken();

				if (newToken) {
					originalRequest.headers.Authorization = `Bearer ${newToken}`;
					return apiClient(originalRequest);
				}
			} catch (refreshError) {
				// Le refresh a échoué, déconnecter l'utilisateur
				await AuthService.logout();
				// Rediriger vers la page de connexion
				router.replace('/login');
			}
		}

		return Promise.reject(error);
	}
);

export default apiClient;
