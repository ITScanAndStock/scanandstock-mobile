import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');

interface CustomSplashScreenProps {
	onReady?: () => void;
}

export default function CustomSplashScreen({ onReady }: CustomSplashScreenProps) {
	return (
		<View style={styles.container}>
			<Image
				source={require('../assets/images/splash-icon.png')}
				style={styles.logo}
				resizeMode="contain"
				onLoad={onReady}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.WHITE,
		justifyContent: 'center',
		alignItems: 'center',
		width: width,
		height: height,
	},
	logo: {
		width: width * 0.5, // 50% de la largeur de l'écran
		height: height * 0.3, // 30% de la hauteur de l'écran
	},
});
