import { colors } from '@/constants/colors';
import { useAccount } from '@/context/AccountContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, View } from 'react-native';
import ThemedText from './ThemedText';

interface BadgesScannedProps {
	name: string;
}

export default function BadgesScanned({ name }: BadgesScannedProps) {
	const { resetBadge } = useAccount();

	const handlePress = () => {
		resetBadge();
	};

	return (
		<View style={styles.container}>
			<View>
				<ThemedText
					variant="regularText"
					color="WHITE"
				>
					Vous êtes identifié en tant que :
				</ThemedText>
				<ThemedText
					variant="regularText"
					color="WHITE"
				>
					{name}
				</ThemedText>
			</View>

			<Pressable
				onPress={handlePress}
				style={styles.btn}
				accessible={true}
				accessibilityLabel="Déconnexion"
				accessibilityRole="button"
				accessibilityHint="Appuyez pour vous déconnecter"
			>
				<FontAwesome
					name="power-off"
					size={30}
					color={colors.GREEN}
					accessible={false}
				/>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.GREEN,
		flexDirection: 'row',
		width: '100%',
		padding: 12,
		justifyContent: 'space-between',
		alignItems: 'center',
		marginVertical: 20,
		gap: 10,
		borderRadius: 10,
	},
	btn: {
		width: 50,
		height: 50,
		backgroundColor: colors.WHITE,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
