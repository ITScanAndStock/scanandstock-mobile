import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./ApiService";

class UserService {
  async stockUserAccounts() {
    const response = await apiClient.get('/user/accounts');

    // Sauvegarder les comptes
    if (response.data.accounts) {
      await AsyncStorage.setItem('account', JSON.stringify(response.data.accounts));

      // Sauvegarder le premier compte comme compte actif
      if (response.data.accounts.length > 0) {

        await AsyncStorage.setItem('activated_compte', JSON.stringify(response.data.accounts[0]));
      }
    }

    // Sauvegarder tracingEnabled seulement s'il existe
    if (response.data.login.tracingEnabled) {
      await AsyncStorage.setItem('tracingEnabled', JSON.stringify(response.data.login.tracingEnabled));
    }
  }

  // ✅ Méthode pour récupérer les comptes
  async getUserAccounts() {
    try {
      const accounts = await AsyncStorage.getItem('account');
      return accounts ? JSON.parse(accounts) : [];
    } catch (error) {
      console.error('Erreur récupération accounts:', error);
      return [];
    }
  }

  // ✅ Méthode pour effacer les comptes
  async clearUserAccounts() {
    await AsyncStorage.removeItem('account');
    await AsyncStorage.removeItem('activated_compte');
    await AsyncStorage.removeItem('tracingEnabled');
  }
}

export default new UserService();