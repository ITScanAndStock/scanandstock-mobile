// import React native
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// import expo
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

// import components
import CustomSplashScreen from '../components/CustomSplashScreen';
import Header from '../components/Header';
import { AccountProvider } from '../context/AccountContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import RootNavigator from './RootNavigator';

// Empêcher le splash screen de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
	const { isAuthenticated } = useAuth();
	const [appIsReady, setAppIsReady] = useState(false);

	useEffect(() => {
		const prepare = async () => {
			try {
				// Ajoutez ici vos opérations de chargement (fonts, données, etc.)
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} catch (e) {
				console.warn(e);
			} finally {
				setAppIsReady(true);
				SplashScreen.hideAsync();
			}
		};

		prepare();
	}, []);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" />
			{isAuthenticated && <Header />}
			<RootNavigator />
			<Toast />
		</SafeAreaView>
	);
}

export default function RootLayout() {
	return (
		<AuthProvider>
			<AccountProvider>
				<RootLayoutContent />
			</AccountProvider>
		</AuthProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#28343B',
	},
});
