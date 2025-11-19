// app.config.js
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

// Charger les variables selon le profil de build
const getEnvVars = () => {
	// EAS Build définit EXPO_PUBLIC_ENV via eas.json
	const env = process.env.EXPO_PUBLIC_ENV || 'staging';

	return {
		EXPO_PUBLIC_ENV: env,
		EXPO_PUBLIC_KEYCLOAK_URL: process.env.EXPO_PUBLIC_KEYCLOAK_URL || 'https://staging-sso.myscanandstock.fr/',
		EXPO_PUBLIC_KEYCLOAK_REALM: process.env.EXPO_PUBLIC_KEYCLOAK_REALM || 'scan-and-stock',
		EXPO_PUBLIC_KEYCLOAK_CLIENT_ID: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID || 'scanandstock-mobile',
		EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://staging-api.myscanandstock.fr/api',
		EXPO_PUBLIC_COOMPY_URL: process.env.EXPO_PUBLIC_COOMPY_URL || 'https://staging-api.mycoompy.fr/api',
		EXPO_PUBLIC_MY_COOMPY_URL: process.env.EXPO_PUBLIC_MY_COOMPY_URL || 'https://staging.mycoompy.fr',
	};
};

const envVars = getEnvVars();

export default {
	expo: {
		name: IS_PREVIEW ? 'ScanAndStock (Staging)' : 'ScanAndStock',
		slug: 'scanandstock',
		version: '1.0.0',
		orientation: 'portrait',
		icon: './assets/images/icon.png',
		scheme: 'scanandstock',
		userInterfaceStyle: 'automatic',
		newArchEnabled: true,
		ios: {
			supportsTablet: true,
			bundleIdentifier: 'com.scanandstock.scanandstock',
		},
		android: {
			adaptiveIcon: {
				backgroundColor: '#E6F4FE',
				foregroundImage: './assets/images/android-icon-foreground.png',
				backgroundImage: './assets/images/android-icon-background.png',
				monochromeImage: './assets/images/android-icon-monochrome.png',
			},
			edgeToEdgeEnabled: true,
			package: 'com.scanandstock.scanandstock',
			predictiveBackGestureEnabled: false,
			intentFilters: [
				{
					action: 'VIEW',
					data: [
						{
							scheme: 'scanandstock',
						},
					],
					category: ['BROWSABLE', 'DEFAULT'],
				},
				{
					action: 'VIEW',
					data: [
						{
							scheme: 'scanandstock',
						},
					],
					category: ['BROWSABLE', 'DEFAULT'],
				},
			],
		},
		web: {
			output: 'static',
			favicon: './assets/images/favicon.png',
		},
		plugins: [
			'expo-router',
			[
				'expo-splash-screen',
				{
					image: './assets/images/splash-icon.png',
					imageWidth: 200,
					resizeMode: 'contain',
					backgroundColor: '#ffffff',
					dark: {
						backgroundColor: '#000000',
					},
				},
			],
			[
				'expo-secure-store',
				{
					faceIDPermission: 'Allow $(PRODUCT_NAME) to access your Face ID biometric data.',
				},
			],
			'expo-audio',
		],
		experiments: {
			typedRoutes: true,
			reactCompiler: true,
		},
		extra: {
			router: {},
			eas: {
				projectId: 'b3291952-eb54-434f-b546-6cac13f8a086',
			},
			// Injecter les variables d'environnement dans extra
			env: envVars.EXPO_PUBLIC_ENV,
			KEYCLOAK_URL: envVars.EXPO_PUBLIC_KEYCLOAK_URL,
			KEYCLOAK_REALM: envVars.EXPO_PUBLIC_KEYCLOAK_REALM,
			KEYCLOAK_CLIENT_ID: envVars.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID,
			API_URL: envVars.EXPO_PUBLIC_API_URL,
			COOMPY_URL: envVars.EXPO_PUBLIC_COOMPY_URL,
			MY_COOMPY_URL: envVars.EXPO_PUBLIC_MY_COOMPY_URL,
		},
		runtimeVersion: {
			policy: 'appVersion',
		},
		updates: {
			url: 'https://u.expo.dev/b3291952-eb54-434f-b546-6cac13f8a086',
		},
	},
};
