// components/ScanLoader.tsx
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import ThemedText from './ui-components/ThemedText';

interface ScanLoaderProps {
	visible: boolean;
}

export default function ScanLoader({ visible }: ScanLoaderProps) {
	if (!visible) return null;

	return (
		<View style={styles.overlay}>
			<View style={styles.container}>
				<ActivityIndicator
					size="large"
					color={colors.WHITE}
				/>
				<ThemedText
					variant="regularText"
					color="WHITE"
					style={styles.text}
				>
					Traitement en cours...
				</ThemedText>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1000,
	},
	container: {
		backgroundColor: colors.GREY,
		padding: 30,
		borderRadius: 15,
		alignItems: 'center',
		gap: 15,
	},
	text: {
		marginTop: 10,
		color: colors.WHITE,
	},
});
