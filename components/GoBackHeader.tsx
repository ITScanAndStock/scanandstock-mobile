// import react native
import { StyleSheet, TextProps, TouchableOpacity, View } from 'react-native';

// import expo
import { router } from 'expo-router';

// import svg and icons
import Feather from '@expo/vector-icons/Feather';

// import components
import ThemedText from './ui-components/ThemedText';

// import constants
import { colors } from '../constants/colors';

// types of props
type GoBackHeaderProps = TextProps & {
	title?: string;
	onPress?: () => void;
};

// components use to goback to the last page in scanner's page
export default function GoBackHeader({ title = 'Retour au scan rapide', onPress }: GoBackHeaderProps) {
	const handlePress = () => {
		if (onPress) {
			onPress();
		} else {
			router.back();
		}
	};

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.backButton}
				onPress={handlePress}
				accessibilityRole="button"
				accessibilityLabel="Retour"
			>
				<Feather
					name="chevron-left"
					size={40}
					color={colors.WHITE}
				/>
				<ThemedText
					variant="title"
					color="WHITE"
				>
					{title}
				</ThemedText>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
		position: 'absolute',
		top: 0,
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	title: {
		marginLeft: 8,
	},
});
