// services/AuthService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { apiConfig, keycloakConfig } from '../config/KeycloakConfig';
import { TokenResponse, UserInfo } from '../model/ApiError';
import SecureStorageService from './SecureStorageService';

// Nécessaire pour que le navigateur se ferme après l'authentification
WebBrowser.maybeCompleteAuthSession();

class AuthService {
	private discovery = {
		authorizationEndpoint: `${keycloakConfig.url}realms/${keycloakConfig.realm}/protocol/openid-connect/auth`,
		tokenEndpoint: `${keycloakConfig.url}realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
		revocationEndpoint: `${keycloakConfig.url}realms/${keycloakConfig.realm}/protocol/openid-connect/logout`,
	};

	// Créer la requête d'authentification
	async login() {
		try {
			const redirectUri = AuthSession.makeRedirectUri({
				scheme: 'scanandstock',
				path: 'login',
			});

			console.log('🔗 Redirect URI:', redirectUri);

			const authRequest = new AuthSession.AuthRequest({
				clientId: keycloakConfig.clientId,
				redirectUri,
				scopes: ['openid', 'profile', 'email'],
				responseType: AuthSession.ResponseType.Code,
				usePKCE: true, // ✅ Active PKCE
			});

			const result = await authRequest.promptAsync(this.discovery);

			if (result.type === 'success') {
				const { code } = result.params;
				await this.exchangeCodeForToken(code, redirectUri, authRequest);
				await this.storeUserInfo();
				return true;
			}
			return false;
		} catch (error) {
			console.error('❌ Erreur lors de la connexion:', error);
			throw error;
		}
	}

	// Échanger le code d'autorisation contre un token
	private async exchangeCodeForToken(code: string, redirectUri: string, authRequest: AuthSession.AuthRequest) {
		try {
			const tokenResponse = await AuthSession.exchangeCodeAsync(
				{
					clientId: keycloakConfig.clientId,
					code,
					redirectUri,
					extraParams: {
						code_verifier: authRequest.codeVerifier || '', // ✅ Utilise le code_verifier de l'authRequest
					},
				},
				this.discovery
			);

			// Stocker les tokens
			await this.storeTokens(tokenResponse);

			// Récupérer les informations utilisateur
			await this.fetchUserInfo(tokenResponse.accessToken);

			return tokenResponse;
		} catch (error) {
			if (__DEV__) {
				console.error("❌ Erreur lors de l'échange du code:", error);
			}
			throw error;
		}
	}

	// Stocker les tokens de manière sécurisée
	private async storeTokens(tokenResponse: TokenResponse) {
		// ✅ Tokens stockés de manière sécurisée (chiffrés)
		await SecureStorageService.setToken(tokenResponse.accessToken);
		if (tokenResponse.refreshToken) {
			await SecureStorageService.setRefreshToken(tokenResponse.refreshToken);
		}
		const expiresIn = tokenResponse.expiresIn || 3600; // Par défaut 1 heure
		await SecureStorageService.setItem('tokenExpiry', String(Date.now() + expiresIn * 1000));
	}

	// Récupérer les informations utilisateur
	private async fetchUserInfo(accessToken: string): Promise<UserInfo> {
		try {
			const response = await fetch(`${keycloakConfig.url}realms/${keycloakConfig.realm}/protocol/openid-connect/userinfo`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const userInfo: UserInfo = await response.json();

			// Stocker les infos utilisateur
			await AsyncStorage.setItem('accountName', userInfo.name || '');
			await AsyncStorage.setItem('roles', JSON.stringify(userInfo.realm_access?.roles || []));

			return userInfo;
		} catch (error) {
			if (__DEV__) {
				console.error('Erreur lors de la récupération des infos utilisateur:', error);
			}
			throw error;
		}
	}

	// Rafraîchir le token
	async refreshToken() {
		try {
			// ✅ Récupérer le refresh token de manière sécurisée
			const refreshToken = await SecureStorageService.getRefreshToken();

			if (!refreshToken) {
				throw new Error('Pas de refresh token disponible');
			}

			const response = await fetch(this.discovery.tokenEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: refreshToken,
					client_id: keycloakConfig.clientId,
				}).toString(),
			});

			const tokenResponse = await response.json();
			await this.storeTokens(tokenResponse);

			return tokenResponse.accessToken;
		} catch (error) {
			console.error('Erreur lors du refresh du token:', error);
			// Si le refresh échoue, déconnecter l'utilisateur
			await this.logout();
			throw error;
		}
	}

	// Vérifier si le token est valide
	async isTokenValid(): Promise<boolean> {
		try {
			console.log('🔍 AuthService - Vérification de la validité du token...');
			// ✅ Récupérer les données de manière sécurisée
			const tokenExpiry = await SecureStorageService.getItem('tokenExpiry');
			const refreshToken = await SecureStorageService.getRefreshToken();

			console.log('🔍 AuthService - tokenExpiry:', tokenExpiry ? 'présent' : 'absent');
			console.log('🔍 AuthService - refreshToken:', refreshToken ? 'présent' : 'absent');

			if (!tokenExpiry || !refreshToken) {
				console.log('❌ AuthService - Pas de token ou expiry trouvé');
				return false;
			}

			// Vérifier si le token expire dans moins de 5 minutes
			const expiryTime = parseInt(tokenExpiry);
			const now = Date.now();
			const fiveMinutes = 5 * 60 * 1000;

			console.log('🔍 AuthService - Token expire dans:', Math.floor((expiryTime - now) / 1000), 'secondes');

			if (expiryTime - now < fiveMinutes) {
				// Token expire bientôt, le rafraîchir
				try {
					console.log('🔄 AuthService - Rafraîchissement du token...');
					await this.refreshToken();
					console.log('✅ AuthService - Token rafraîchi avec succès');
					return true;
				} catch (error) {
					// Si le refresh échoue, retourner false
					console.error('❌ AuthService - Échec du rafraîchissement:', error);
					return false;
				}
			}

			const isValid = expiryTime > now;
			console.log('✅ AuthService - Token valide:', isValid);
			return isValid;
		} catch (error) {
			console.error('❌ AuthService - Erreur isTokenValid:', error);
			return false;
		}
	}

	// Obtenir le token actuel
	async getToken(): Promise<string | null> {
		const isValid = await this.isTokenValid();
		if (!isValid) {
			return null;
		}
		// ✅ Récupérer le token de manière sécurisée
		return await SecureStorageService.getToken();
	}

	async getUserInfo() {
		const userInfo = await AsyncStorage.getAllKeys();
		return userInfo;
	}

	async storeUserInfo() {
		try {
			// ✅ Récupérer le token de manière sécurisée
			const token = await SecureStorageService.getToken();

			if (!token) {
				throw new Error('Pas de token disponible');
			}

			// Utiliser fetch directement pour éviter le cycle
			const response = await fetch(`${apiConfig.apiUrl}/user/accounts`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Erreur HTTP: ${response.status}`);
			}

			const data = await response.json();
			if (__DEV__) {
				console.log('📦 Données utilisateur reçues:', data);
			}

			// Sauvegarder les comptes
			if (data.accounts && Array.isArray(data.accounts)) {
				await AsyncStorage.setItem('account', JSON.stringify(data.accounts));

				// Sauvegarder le premier compte comme compte actif
				if (data.accounts.length > 0) {
					await AsyncStorage.setItem('activated_compte', JSON.stringify(data.accounts[0]));
				}
			}

			// Sauvegarder tracingEnabled
			const tracingEnabled = data.login?.tracingEnabled ?? data.tracingEnabled ?? false;
			await AsyncStorage.setItem('tracingEnabled', JSON.stringify(tracingEnabled));

			if (__DEV__) {
				console.log('✅ Informations utilisateur stockées avec succès');
			}
		} catch (error) {
			console.error('❌ Erreur stockage user info:', error);
			// Ne pas throw l'erreur pour ne pas bloquer le login
			// Définir des valeurs par défaut
			await AsyncStorage.setItem('tracingEnabled', JSON.stringify(false));
		}
	}

	// Déconnexion
	async logout() {
		try {
			// ✅ Récupérer le token de manière sécurisée
			const token = await SecureStorageService.getToken();

			if (token) {
				// Appeler l'endpoint de logout de Keycloak
				await fetch(this.discovery.revocationEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Bearer ${token}`,
					},
				});
			}

			// ✅ Nettoyer les tokens sécurisés
			await SecureStorageService.clearTokens();

			// Nettoyer les autres données du stockage local
			await AsyncStorage.multiRemove(['catalogue', 'nb_account', 'activated_compte', 'lastConnection', 'first_connection', 'accountName', 'roles', 'licence', 'licenseType', 'proLink', 'tracingEnabled', 'badge_id', 'user_name', 'badge-scan']);
		} catch (error) {
			console.error('Erreur lors de la déconnexion:', error);
		}
	}

	// Vérifier les rôles
	async hasRole(role: string): Promise<boolean> {
		try {
			const rolesString = await AsyncStorage.getItem('roles');

			if (!rolesString) {
				return false;
			}

			const roles: string[] = JSON.parse(rolesString);
			return roles.includes(role);
		} catch (error) {
			return false;
		}
	}

	// Vérifier si l'utilisateur est superviseur
	async isSupervisor(): Promise<boolean> {
		return await this.hasRole('SUPERVISOR');
	}
}

export default new AuthService();
