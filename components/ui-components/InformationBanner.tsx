import { colors } from '@/constants/colors';
import { StyleSheet, View } from 'react-native';
import ThemedText from './ThemedText';
// import svg and icons
import Exclamation from '../../assets/images/exclamation-triangle.svg';

export default function InformationBanner({ title }: { title: string }) {
	return (
		<View
			style={styles.container}
			accessible={true}
			accessibilityRole="alert"
			accessibilityLabel={title}
			accessibilityLiveRegion="polite"
		>
			<Exclamation
				height={30}
				width={30}
				color={colors.WHITE}
				accessible={false}
			/>
			<ThemedText
				variant="regularText"
				color="WHITE"
			>
				{title}
			</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
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
