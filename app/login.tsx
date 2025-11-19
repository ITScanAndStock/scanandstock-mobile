import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import LogoVertical from '../assets/images/logo-vertical.svg';
import ThemedText from '../components/ui-components/ThemedText';
import { colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
	const { login, isLoading } = useAuth();
	const router = useRouter();

	const handleLogin = async () => {
		try {
			const success = await login();
			if (success) {
				console.log('🚀 Login - Redirection vers (tabs)');
				router.replace('/(tabs)');
			}
		} catch (error) {
			if (__DEV__) {
				console.error('❌ Erreur:', error);
			}
		}
	};

	if (isLoading) {
		return (
			<View
				style={styles.container}
				accessible={true}
				accessibilityLabel="Connexion en cours"
			>
				<ActivityIndicator
					size="large"
					color={colors.DARK}
					accessibilityLabel="Chargement"
				/>
				<ThemedText
					variant="regularText"
					color="DARK"
					style={{ marginTop: 20 }}
				>
					Connexion en cours...
				</ThemedText>
			</View>
		);
	}

	return (
		<View
			style={styles.container}
			accessible={false}
		>
			<LogoVertical
				width={200}
				height={200}
				accessible={true}
				accessibilityLabel="Logo ScanAndStock"
				accessibilityRole="image"
			/>

			<TouchableOpacity
				onPress={handleLogin}
				activeOpacity={0.8}
				style={[styles.btn, isLoading && styles.btnDisabled]}
				disabled={isLoading}
				accessible={true}
				accessibilityLabel="Se connecter"
				accessibilityHint="Appuyez pour vous connecter avec votre compte"
				accessibilityRole="button"
				accessibilityState={{ disabled: isLoading }}
			>
				{isLoading ? (
					<ActivityIndicator
						size="small"
						color={colors.WHITE}
					/>
				) : (
					<ThemedText
						variant="textBtn"
						color="WHITE"
					>
						Se connecter
					</ThemedText>
				)}
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
		marginVertical: 30,
	},
	btnDisabled: {
		opacity: 0.5,
	},
});
