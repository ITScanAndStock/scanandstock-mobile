// import React native
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function Profile() {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>Page Profil Utilisateur</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.WHITE,
	},
	text: {
		fontSize: 18,
		color: colors.DARK,
	},
});
