// import React native
import React from 'react'; // Ajout de l'import React manquant
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// import expo
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

// import components
import Header from '@/components/Header';
import { AccountProvider } from '@/context/AccountContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import RootNavigator from './RootNavigator';

// Empêcher le splash screen de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
	const { isAuthenticated } = useAuth();

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" />
			{isAuthenticated && <Header />}
			<RootNavigator />
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
