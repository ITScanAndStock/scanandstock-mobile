import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatsResponse } from '../model/Stats';
import { Method, StockModel } from '../model/Stock';
import apiClient from './ApiService';
import ToastService from './ToastService';

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

			const errorMessage = error.response?.data?.message || 'Impossible de charger les statistiques';
			ToastService.error(errorMessage);
			throw error;
		}
	}
	async scan(code: string, method: Method) {
		try {
			const activeAccountString = await AsyncStorage.getItem('activated_compte');
			if (!activeAccountString) {
				throw new Error('Aucun compte actif trouvé');
			}
			const activeAccount = JSON.parse(activeAccountString);
			// Appeler l'API avec le header Account-Id

			const stockModel = this.getStockModel(code, method);
			const response = await apiClient.put<StockModel>('/product/stock', stockModel, {
				headers: {
					'Account-Id': activeAccount.id,
				},
			});

			// Afficher un message de succès
			const actionText = method === Method.increase ? 'ajouté au stock' : 'retiré du stock';
			ToastService.success(`Produit ${actionText}`, 'Succès');

			return response.data;
		} catch (error: any) {
			console.error('❌ Erreur lors du scan');
			console.error('Status:', error.response?.status);
			console.error('Message:', error.response?.data);
			console.error('URL:', error.config?.url);

			const errorMessage = error.response?.data?.message || 'Erreur lors du scan du produit';
			ToastService.error(errorMessage);
			throw error;
		}
	}
	getStockModel(scan: string, method: Method): StockModel {
		const stockModel = new StockModel();
		stockModel.code = scan;
		stockModel.action = method;
		return stockModel;
	}
}

// Exporter une instance de la classe
export default new ProductService();
