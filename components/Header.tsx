// import react native
import { Pressable, StyleSheet, View } from 'react-native';

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
			<Logo
				width={120}
				height={60}
				accessible={false}
			/>

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
	img: {
		width: 120,
	},
});
