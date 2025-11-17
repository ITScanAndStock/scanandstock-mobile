// Types pour les erreurs API
export interface ApiErrorResponse {
	message?: string;
	status?: number;
	data?: any;
}

export interface AxiosErrorType {
	response?: {
		status: number;
		data: any;
	};
	config?: {
		url?: string;
	};
	code?: string;
	message: string;
}

// Types pour les tokens
export interface TokenResponse {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
	tokenType?: string;
}

export interface UserInfo {
	sub: string;
	name?: string;
	email?: string;
	realm_access?: {
		roles: string[];
	};
}
