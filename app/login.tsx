import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import LogoVertical from '../assets/images/logo-vertical.svg';
import ThemedText from '../components/ui-components/ThemedText';
import { colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
	const { login, isLoading } = useAuth();

	const handleLogin = async () => {
		try {
			await login();
		} catch (error) {
			console.error('❌ Erreur:', error);
		}
	};

	if (isLoading) {
		return <ActivityIndicator size="large" />;
	}

	return (
		<View style={styles.container}>
			<LogoVertical />

			<TouchableOpacity
				onPress={handleLogin}
				activeOpacity={0.8}
				style={styles.btn}
			>
				<ThemedText
					variant="textBtn"
					color="WHITE"
				>
					Se connecter
				</ThemedText>
			</TouchableOpacity>
		</View>
	);
};

export default LoginScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.WHITE,
	},
	btn: {
		backgroundColor: colors.DARK,
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 20,
	},
});
