// import react native
import { StyleSheet, View } from 'react-native';

// import expo
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';

// import svg and icons
import Badge from '@/assets/images/badge.svg';
import ScanLine from '@/assets/images/scan-line.svg';
import AntDesign from '@expo/vector-icons/AntDesign';

// import components
import ChoosAccount from '@/components/ChooseAccount';
import ScanBadge from '@/components/ScanBadge';
import ThemedText from '@/components/ui-components/ThemedText';

// importe constants
import { colors } from '@/constants/colors';

export default function Scan() {
	const dataTest = [
		{ designation: 'ADHESIF ABCD VPS 17 ML Avec 10% de mire laine machine', mouvement: 1 },
		{ designation: 'Airflow', mouvement: 0 },
		{ designation: 'Airflow', mouvement: 1 },
	];

	return (
		<View style={styles.container}>
			<Badge style={styles.svg} />
			<ChoosAccount />
			<ScanBadge />
			<Link
				style={styles.btn}
				href="/scanner"
			>
				<View style={styles.btnContent}>
					<ScanLine
						width={24}
						height={24}
					/>
					<ThemedText variant="textBtn"> scannez</ThemedText>
				</View>
			</Link>

			<View style={styles.historyContainer}>
				<LinearGradient
					style={styles.backgroundGradient}
					colors={['#12A19A40', '#12A19A1C']}
				/>
				{dataTest.map((data, index) => {
					return (
						<ThemedText
							variant="productDesignation"
							key={index}
							numberOfLines={1}
							ellipsizeMode="tail"
						>
							{data.mouvement === 1 ? (
								<AntDesign
									name="arrow-up"
									size={24}
									color="green"
								/>
							) : (
								<AntDesign
									name="arrow-down"
									size={24}
									color="red"
								/>
							)}
							{data.designation}
						</ThemedText>
					);
				})}
			</View>
		</View>
	);
}

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 12,
	},
	svg: {
		width: 160,
		height: 160,
	},
	btn: {
		width: '100%',
		maxWidth: 400,
		borderWidth: 3,
		borderColor: colors.DARK,
		borderRadius: 25,
		padding: 10,
		textAlign: 'center',
	},
	btnContent: {
		flexDirection: 'row',
		gap: 10,
	},
	historyContainer: {
		width: '100%',
		padding: 10,
		boxSizing: 'border-box',
		justifyContent: 'space-around',
		alignItems: 'center',
		marginTop: 20,
		height: 140,
	},
	backgroundGradient: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		height: 140,
		borderRadius: 15,
	},
});
