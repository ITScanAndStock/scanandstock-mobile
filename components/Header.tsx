// import react native
import { Image, Pressable, StyleSheet, View } from 'react-native';

// import expo
import { Link } from 'expo-router';

// import svg and icons
import FontAwesome from '@expo/vector-icons/FontAwesome';

// import constants
import { colors } from '@/constants/colors';
import { useAccount } from '@/context/AccountContext';
import { useAuth } from '../context/AuthContext';

// header of the application
export default function Header() {
	const { logout } = useAuth();
	const { resetAccount } = useAccount();

	const handleLogout = () => {
		resetAccount();
		logout();
	};

	return (
		<View style={styles.container}>
			<Link href={'/'}>
				<Image
					style={styles.img}
					source={require('../assets/images/logo.png')}
				/>
			</Link>
			<Pressable onPress={handleLogout}>
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
