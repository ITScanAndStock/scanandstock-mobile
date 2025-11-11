// import React native
import React from 'react'; // Ajout de l'import React manquant
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// import expo
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// import components
import Header from '@/components/Header';

export default function RootLayout() {
	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" />
			<Header />
			<Stack>
				<Stack.Screen
					name="(tabs)"
					options={{
						presentation: 'modal',
						headerShown: false,
						animationTypeForReplace: 'push',
						animation: 'slide_from_left',
					}}
				/>
				<Stack.Screen
					name="scanner"
					options={{
						presentation: 'card',
						headerShown: false,
						animation: 'slide_from_right',
					}}
				/>
				<Stack.Screen
					name="login"
					options={{
						presentation: 'card',
						headerShown: false,
						animation: 'slide_from_right',
					}}
				/>
			</Stack>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#28343B',
	},
});
