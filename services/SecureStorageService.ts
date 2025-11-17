// services/SecureStorageService.ts
import * as SecureStore from 'expo-secure-store';

/**
 * Service pour gérer le stockage sécurisé des données sensibles
 * Utilise expo-secure-store pour chiffrer les données
 */
class SecureStorageService {
	/**
	 * Sauvegarder une valeur de manière sécurisée
	 */
	async setItem(key: string, value: string): Promise<void> {
		try {
			await SecureStore.setItemAsync(key, value);
		} catch (error) {
			if (__DEV__) {
				console.error(`❌ Erreur lors de la sauvegarde sécurisée de ${key}:`, error);
			}
			throw error;
		}
	}

	/**
	 * Récupérer une valeur sécurisée
	 */
	async getItem(key: string): Promise<string | null> {
		try {
			return await SecureStore.getItemAsync(key);
		} catch (error) {
			console.error(`❌ Erreur lors de la récupération sécurisée de ${key}:`, error);
			return null;
		}
	}

	/**
	 * Supprimer une valeur sécurisée
	 */
	async removeItem(key: string): Promise<void> {
		try {
			await SecureStore.deleteItemAsync(key);
		} catch (error) {
			if (__DEV__) {
				console.error(`❌ Erreur lors de la suppression sécurisée de ${key}:`, error);
			}
			throw error;
		}
	}

	// Méthodes spécifiques pour les tokens
	async setToken(token: string): Promise<void> {
		await this.setItem('token', token);
	}

	async getToken(): Promise<string | null> {
		return await this.getItem('token');
	}

	async setRefreshToken(refreshToken: string): Promise<void> {
		await this.setItem('refreshToken', refreshToken);
	}

	async getRefreshToken(): Promise<string | null> {
		return await this.getItem('refreshToken');
	}

	async clearTokens(): Promise<void> {
		await this.removeItem('token');
		await this.removeItem('refreshToken');
		await this.removeItem('tokenExpiry');
	}
}

export default new SecureStorageService();
