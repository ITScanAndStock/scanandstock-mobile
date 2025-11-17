// services/ApiService.ts
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
