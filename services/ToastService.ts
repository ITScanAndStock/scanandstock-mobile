// services/ToastService.ts
import Toast from 'react-native-toast-message';

/**
 * Service centralisé pour gérer les notifications toast
 */
class ToastService {
	/**
	 * Afficher un toast de succès
	 */
	success(message: string, title: string = 'Succès') {
		Toast.show({
			type: 'success',
			text1: title,
			text2: message,
			position: 'top',
			visibilityTime: 3000,
		});
	}

	/**
	 * Afficher un toast d'erreur
	 */
	error(message: string, title: string = 'Erreur') {
		Toast.show({
			type: 'error',
			text1: title,
			text2: message,
			position: 'top',
			visibilityTime: 4000,
		});
	}

	/**
	 * Afficher un toast d'information
	 */
	info(message: string, title: string = 'Information') {
		Toast.show({
			type: 'info',
			text1: title,
			text2: message,
			position: 'top',
			visibilityTime: 3000,
		});
	}

	/**
	 * Afficher un toast d'avertissement
	 */
	warning(message: string, title: string = 'Attention') {
		Toast.show({
			type: 'warning',
			text1: title,
			text2: message,
			position: 'top',
			visibilityTime: 3500,
		});
	}

	/**
	 * Masquer tous les toasts
	 */
	hide() {
		Toast.hide();
	}
}

export default new ToastService();
