import React from 'react';
import { Text, View } from 'react-native';
// import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
	// const { login, isLoading, logout, isAuthenticated } = useAuth();

	// console.log('🔍 LoginScreen - isLoading:', isLoading);

	// const handleLogin = async () => {
	// 	console.log('🚀 Bouton cliqué');
	// 	try {
	// 		await login();
	// 	} catch (error) {
	// 		console.error('❌ Erreur:', error);
	// 	}
	// };

	// if (isLoading) {
	// 	return <ActivityIndicator size="large" />;
	// }

	return (
		<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
			{/* <TouchableOpacity
				onPress={handleLogin}
				style={{ padding: 20, backgroundColor: '#007AFF', borderRadius: 8 }}
			>
				<Text style={{ color: 'white', fontSize: 16 }}>Se connecter avec Keycloak</Text>
			</TouchableOpacity>

			{isAuthenticated ? (
				<Button
					title="déconnexion"
					onPress={logout}
				/>
			) : (
				<Text> pas authentifier </Text>
			)} */}

			<Text>En attendant</Text>
		</View>
	);
};

export default LoginScreen;
