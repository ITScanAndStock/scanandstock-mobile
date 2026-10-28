import { AxiosErrorType } from "../model/ApiError";
import { StatsResponse } from "../model/Stats";
import { Method, StockModel } from "../model/Stock";
import HeaderStore from "../state/HeaderStore";
import apiClient from "./ApiService";
import { movementErrorToast } from "./MovementErrorToast";
import ToastService from "./ToastService";

class ProductService {
  async getStats() {
    try {
      const response = await apiClient.get<StatsResponse>(
        "/statistics/stocks/last",
      );
      const statsList = response.data.content;

      return statsList;
    } catch (e) {
      if (__DEV__) {
        console.error("❌ Erreur lors de la récupération des stats", e);
      }
      ToastService.error("Impossible de charger les statistiques");
      throw e;
    }
  }
  async scan(
    code: string,
    method: Method,
    force?: boolean,
  ): Promise<StockModel> {
    try {
      let stockModel;
      if (force) {
        stockModel = this.getStockModel(code, method, force);
      } else {
        stockModel = this.getStockModel(code, method);
      }
      const response = await apiClient.put<any>("/product/stock", stockModel);

      // Afficher un message de succès
      const message = response.data.message.split("<br/>");
      ToastService.success(message[0], "Succès");

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosErrorType;

      if (__DEV__) {
        console.error("code scanné", code);
        console.error("❌ Erreur lors du scan");
        console.error("Status:", axiosError.response?.status);
        console.error("Message:", axiosError.response?.data);
        console.error("URL:", axiosError.config?.url);
      }
      const toast = movementErrorToast({
        response: axiosError.response,
        badgeSent: !!axiosError.config?.headers?.["Badge-Id"],
        tracingEnabled: HeaderStore.isTracingEnabled(),
      });
      if (toast) {
        ToastService.error(...toast);
      }
      throw error;
    }
  }
  getStockModel(scan: string, method: Method, force?: boolean): StockModel {
    const stockModel = new StockModel();
    stockModel.code = scan;
    stockModel.action = method;
    if (force) {
      stockModel.force = true;
    }
    return stockModel;
  }
}

// Exporter une instance de la classe
export default new ProductService();
