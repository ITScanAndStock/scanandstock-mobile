import { AxiosErrorType } from "../model/ApiError";
import { StatsResponse } from "../model/Stats";
import { Method, StockModel } from "../model/Stock";
import apiClient from "./ApiService";
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
    retryCount: number = 0,
  ): Promise<StockModel> {
    const MAX_RETRIES = 2;

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
      // Vérifier si c'est une erreur réseau et si on peut retry
      const isNetworkError =
        !axiosError.response ||
        axiosError.code === "ECONNABORTED" ||
        axiosError.code === "ERR_NETWORK";

      if (isNetworkError && retryCount < MAX_RETRIES) {
        if (__DEV__) {
          console.log(
            `🔄 Tentative ${retryCount + 1}/${MAX_RETRIES} pour le scan...`,
          );
        }
        // Attendre un peu avant de réessayer (backoff exponentiel)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retryCount + 1)),
        );
        return this.scan(code, method, force, retryCount + 1);
      }

      if (__DEV__) {
        console.error("code scanné", code);
        console.error("❌ Erreur lors du scan");
        console.error("Status:", axiosError.response?.status);
        console.error("Message:", axiosError.response?.data);
        console.error("URL:", axiosError.config?.url);
      }
      let errorMessage = "Erreur lors du scan du produit";
      if (axiosError.response?.status !== 409) {
        ToastService.error(errorMessage);
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
