import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./ApiService";

class UserService {
  async stockUserAccounts() {
    const response = await apiClient.get('/user/accounts');
    await AsyncStorage.setItem('account', JSON.stringify(response.data.accounts))
    await AsyncStorage.setItem('activated_compte', JSON.stringify(response.data.accounts[0]))
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
  }
}


export default new UserService();