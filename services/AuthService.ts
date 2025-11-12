// services/AuthService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { keycloakConfig } from '../config/KeycloakConfig';
import UserService from './UserService';

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
      });

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
      console.error('❌ Erreur lors de l\'échange du code:', error);
      throw error;
    }
  }

  // Stocker les tokens dans AsyncStorage
  private async storeTokens(tokenResponse: any) {
    await AsyncStorage.setItem('token', tokenResponse.accessToken);
    await AsyncStorage.setItem('refreshToken', tokenResponse.refreshToken);
    await AsyncStorage.setItem('tokenExpiry',
      String(Date.now() + (tokenResponse.expiresIn * 1000))
    );
  }

  // Récupérer les informations utilisateur
  private async fetchUserInfo(accessToken: string) {
    try {
      const response = await fetch(
        `${keycloakConfig.url}realms/${keycloakConfig.realm}/protocol/openid-connect/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const userInfo = await response.json();

      // Stocker les infos utilisateur
      await AsyncStorage.setItem('accountName', userInfo.name || '');
      await AsyncStorage.setItem('roles', JSON.stringify(userInfo.realm_access?.roles || []));

      return userInfo;
    } catch (error) {
      console.error('Erreur lors de la récupération des infos utilisateur:', error);
      throw error;
    }
  }

  // Rafraîchir le token
  async refreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');

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
      const tokenExpiry = await AsyncStorage.getItem('tokenExpiry');
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (!tokenExpiry || !refreshToken) {
        return false;
      }

      // Vérifier si le token expire dans moins de 5 minutes
      const expiryTime = parseInt(tokenExpiry);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiryTime - now < fiveMinutes) {
        // Token expire bientôt, le rafraîchir
        try {
          await this.refreshToken();
          return true;
        } catch (error) {
          // Si le refresh échoue, retourner false
          return false;
        }
      }

      return expiryTime > now;
    } catch (error) {
      return false;
    }
  }

  // Obtenir le token actuel
  async getToken(): Promise<string | null> {
    const isValid = await this.isTokenValid();
    if (!isValid) {
      return null;
    }
    return await AsyncStorage.getItem('token');
  }

  async getUserInfo() {
    const userInfo = await AsyncStorage.getAllKeys()
    return userInfo;
  }

  async storeUserInfo() {
    await UserService.stockUserAccounts();
  }

  // Déconnexion
  async logout() {
    try {
      const token = await AsyncStorage.getItem('token');

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

      // Nettoyer le stockage local (comme dans votre code Angular)
      await AsyncStorage.multiRemove([
        'token',
        'refreshToken',
        'tokenExpiry',
        'catalogue',
        'nb_account',
        'activated_compte',
        'lastConnection',
        'first_connection',
        'accountName',
        'roles',
        'licence',
        'licenseType',
        'proLink',
        'tracingEnabled',
        'Badge-Id'
      ]);
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