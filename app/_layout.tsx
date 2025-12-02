// import React native
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// import expo
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

// import components
import CustomSplashScreen from '../components/CustomSplashScreen';
import Header from '../components/Header';
import { AccountProvider } from '@/context/AccountContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { StatsProvider } from '@/context/StatsContext';
import RootNavigator from './RootNavigator';

// Empêcher le splash screen de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
	const { isAuthenticated, isLoading } = useAuth();
	const [appIsReady, setAppIsReady] = useState(false);
	const [fontsLoaded, fontsError] = useFonts({
		Montserrat: require('../assets/fonts/Montserrat-Regular.ttf'),
		Medium: require('../assets/fonts/Montserrat-Medium.ttf'),
		SemiBold: require('../assets/fonts/Montserrat-SemiBold.ttf'),
		Light: require('../assets/fonts/Montserrat-Light.ttf'),
	});

	useEffect(() => {
		if (fontsError) {
			console.warn('Erreur chargement polices:', fontsError);
		}

		if ((fontsLoaded || fontsError) && !isLoading) {
			setAppIsReady(true);
			void SplashScreen.hideAsync();
		}
	}, [fontsLoaded, fontsError, isLoading]);

	if (!appIsReady) {
		return <CustomSplashScreen />;
	}

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
				<StatsProvider>
					<RootLayoutContent />
				</StatsProvider>
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
