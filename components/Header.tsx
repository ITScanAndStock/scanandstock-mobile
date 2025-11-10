// import react native
import { Image, Pressable, StyleSheet, View } from 'react-native';

// import expo
import { Link } from 'expo-router';

// import svg and icons
import FontAwesome from '@expo/vector-icons/FontAwesome';

// import constants
import { colors } from '@/constants/colors';

// header of the application
export default function Header() {
	return (
		<View style={styles.container}>
			<Link href={'/'}>
				<Image
					style={styles.img}
					source={require('../assets/images/logo.png')}
				/>
			</Link>
			<Pressable>
				<FontAwesome
					name="power-off"
					size={30}
					color={colors.WHITE}
				/>
			</Pressable>
		</View>
	);
}

export const styles = StyleSheet.create({
	container: {
		width: '100%',
		height: 60,
		backgroundColor: colors.GREY,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 12,
	},
	img: {
		width: 120,
	},
});
