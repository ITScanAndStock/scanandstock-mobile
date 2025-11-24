// import React native
import React from 'react';
import 'react-native-reanimated';

// import expo
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

function AuthStack() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="login"
				options={{
					presentation: 'card',
					animation: 'slide_from_right',
				}}
			/>
		</Stack>
	);
}

function AppStack() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="index"
				options={{ headerShown: false }}
			/>
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
		</Stack>
	);
}

export default function RootNavigator() {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.WHITE }}>
				<ActivityIndicator
					size="large"
					color={colors.DARK}
				/>
			</View>
		);
	}

	return isAuthenticated ? <AppStack /> : <AuthStack />;
}
