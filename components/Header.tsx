// import react native
import { Pressable, StyleSheet, View } from 'react-native';

// import expo
import { Link } from 'expo-router';

// import svg and icons
import FontAwesome from '@expo/vector-icons/FontAwesome';

// import constants
import Logo from '../assets/images/logo.svg';
import { colors } from '../constants/colors';
import { useAccount } from '../context/AccountContext';
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
				accessible={true}
				accessibilityLabel="Accueil"
				accessibilityRole="link"
				accessibilityHint="Retourner à la page d'accueil"
			>
				<Logo
					width={120}
					accessible={false}
				/>
			</Link>
			<Pressable
				onPress={handleLogout}
				accessible={true}
				accessibilityLabel="Déconnexion"
				accessibilityRole="button"
				accessibilityHint="Appuyez pour vous déconnecter"
			>
				<FontAwesome
					name="power-off"
					size={30}
					color={colors.WHITE}
					accessible={false}
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
