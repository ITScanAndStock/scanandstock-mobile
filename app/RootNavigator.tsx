// import React native
import React, { useEffect } from 'react';
import 'react-native-reanimated';

// import expo
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

export default function RootNavigator() {
	const { isAuthenticated, isLoading } = useAuth();

	if (__DEV__) {
		console.log('🔍 RootNavigator - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
	}
	useEffect(() => {
		if (!isLoading) {
			if (__DEV__) {
				console.log('🎨 Masquage du splash screen');
			}
			SplashScreen.hideAsync();
		}
	}, [isLoading]);

	if (isLoading) {
		if (__DEV__) {
			console.log('⏳ RootNavigator - Affichage du loader');
		}
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator
					size="large"
					color={colors.GREY}
				/>
			</View>
		);
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			{isAuthenticated ? (
				<>
					<Stack.Screen
						name="(tabs)"
						options={{
							presentation: 'modal',
							animationTypeForReplace: 'push',
							animation: 'slide_from_left',
						}}
					/>
					<Stack.Screen
						name="scanner"
						options={{
							presentation: 'card',
							animation: 'slide_from_right',
						}}
					/>
				</>
			) : (
				<Stack.Screen
					name="login"
					options={{
						presentation: 'card',
						animation: 'slide_from_right',
					}}
				/>
			)}
		</Stack>
	);
}
