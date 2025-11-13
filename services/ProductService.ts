import { StatsResponse } from "@/model/Stats";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./ApiService";

class ProductService {
  async getStats() {
    try {
      // Récupérer le compte actif
      const activeAccountString = await AsyncStorage.getItem('activated_compte');
      if (!activeAccountString) {
        throw new Error('Aucun compte actif trouvé');
      }
      const activeAccount = JSON.parse(activeAccountString);
      // Appeler l'API avec le header Account-Id
      const response = await apiClient.get<StatsResponse>('/statistics/stocks/last', {
        headers: {
          'Account-Id': activeAccount.id,
        },
      });
      const statsList = response.data.content.slice(0, 3);

      return statsList;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des stats');
      console.error('Status:', error.response?.status);
      console.error('Message:', error.response?.data);
      console.error('URL:', error.config?.url);
      throw error;
    }
  }
}

// Exporter une instance de la classe
export default new ProductService();