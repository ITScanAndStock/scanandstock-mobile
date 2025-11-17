// import react native
import { StyleSheet } from 'react-native';

// import svg and icons

// import components

// import constants
import { useAccount } from '@/context/AccountContext';
import { colors } from '../constants/colors';
import BadgesScanned from './ui-components/BadgeScanned';
import NoBadgeScanned from './ui-components/NoBadgeScanned';

// components that show to the users if there are log in with badge or not
export default function ScanBadge() {
	const { activeBadgeName } = useAccount();

	return activeBadgeName ? <BadgesScanned name={activeBadgeName} /> : <NoBadgeScanned />;
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
