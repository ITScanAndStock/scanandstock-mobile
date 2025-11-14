// import react native
import { Pressable, StyleSheet, View } from 'react-native';

// import expo
import { Link } from 'expo-router';

// import svg and icons
import FontAwesome from '@expo/vector-icons/FontAwesome';

// import constants
import { colors } from '@/constants/colors';
import { useAccount } from '@/context/AccountContext';
import Logo from '../assets/images/logo.svg';
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
			<Link
				style={styles.link}
				href={'/'}
			>
				<Logo width={120} />
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
		backgroundColor: colors.GREY,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	link: {
		height: 60,
	},
	img: {
		width: 120,
	},
});
