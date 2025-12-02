import AsyncStorage from "@react-native-async-storage/async-storage";
import { AxiosErrorType } from "../model/ApiError";
import apiClient from "./ApiService";
import ToastService from "./ToastService";

class BadgeService {
  async getBadge(badge: string) {
    try {
      const cleanedBadge = badge.replace(/\x1D/g, "$"); // Nettoyer le code

      if (__DEV__) {
        console.log("🎫 Scan badge:", cleanedBadge);
      }

      const response = await apiClient.get(
        `/user/structure/badges/${cleanedBadge}`
      );

      if (response.data) {
        if (__DEV__) {
          console.log("✅ Badge trouvé:", response.data);
        }
        await AsyncStorage.setItem(
          "badge_id",
          JSON.stringify(response.data.id)
        );
        await AsyncStorage.setItem(
          "user_name",
          JSON.stringify(response.data.identifier)
        );
        await AsyncStorage.setItem(
          "badge-scan",
          JSON.stringify(response.data.scan)
        );
        ToastService.success(
          `Badge ${response.data.identifier} connect\u00e9`,
          "Succ\u00e8s"
        );
        return true;
      }
      return false;
    } catch (error) {
      const axiosError = error as AxiosErrorType;
      if (__DEV__) {
        console.error("❌ Erreur getBadge:");
        console.error("Status:", axiosError.response?.status);
        console.error("URL:", axiosError.config?.url);
        console.error("Message:", axiosError.response?.data);
      }

      if (axiosError.response?.status === 404) {
        ToastService.error("Badge non reconnu", "Erreur");
      } else {
        const errorMessage =
          axiosError.response?.data?.message ||
          "Erreur lors de la v\u00e9rification du badge";
        ToastService.error(errorMessage, "Erreur");
      }
      throw error;
    }
  }
}

export default new BadgeService();
