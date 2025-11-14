// import react native
import { StyleSheet, View } from 'react-native';

// import svg and icons
import Exclamation from '../assets/images/exclamation-triangle.svg';

// import components
import ThemedText from './ui-components/ThemedText';

// import constants
import { colors } from '../constants/colors';

// components that show to the users if there are log in with badge or not
export default function ScanBadge() {
	return (
		<View style={styles.container}>
			<Exclamation
				height={30}
				width={30}
				color={colors.WHITE}
			/>
			<ThemedText
				variant="regularText"
				color="WHITE"
			>
				Scannez votre badge
			</ThemedText>
		</View>
	);
}

export const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.GREEN,
		flexDirection: 'row',
		width: '100%',
		padding: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginVertical: 20,
		gap: 10,
		borderRadius: 10,
	},
});
