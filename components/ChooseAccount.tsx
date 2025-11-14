import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { useAccount } from '../context/AccountContext';
import { Account } from '../model/Account';
import ThemedText from './ui-components/ThemedText';

export default function ChoosAccount() {
	const { accounts, activeAccount, setActiveAccount } = useAccount();
	const [isOpen, setIsOpen] = useState(false);
	const [animation] = useState(new Animated.Value(0));

	const chooseAccount = (account: Account) => {
		setActiveAccount(account);
		toggleDropdown(); // Fermer après sélection
	};

	const toggleDropdown = () => {
		const toValue = isOpen ? 0 : 1;

		Animated.timing(animation, {
			toValue,
			duration: 300,
			useNativeDriver: false,
		}).start();

		setIsOpen(!isOpen);
	};

	// Calculer la hauteur animée
	const dropdownHeight = animation.interpolate({
		inputRange: [0, 1],
		outputRange: [0, accounts.length * 50], // 50 = hauteur approximative d'un item
	});

	// Rotation de la flèche
	const rotateIcon = animation.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '180deg'],
	});

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.mainBtn}
				onPress={toggleDropdown}
			>
				<ThemedText
					variant="title"
					color="WHITE"
				>
					{activeAccount?.name}
				</ThemedText>
				<Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
					<Ionicons
						name="chevron-down"
						size={24}
						color={colors.WHITE}
					/>
				</Animated.View>
			</TouchableOpacity>

			<Animated.View style={[styles.dropdownContainer, { height: dropdownHeight, overflow: 'hidden' }]}>
				{accounts.map((item) => {
					return (
						<TouchableOpacity
							key={item.id}
							onPress={() => chooseAccount(item)}
							style={styles.items}
						>
							<ThemedText
								variant="textBtn"
								color="WHITE"
							>
								{item.name}
							</ThemedText>
							{item.id === activeAccount?.id ? (
								<Ionicons
									name="radio-button-on"
									size={24}
									color={colors.WHITE}
								/>
							) : (
								<Ionicons
									name="radio-button-off"
									size={24}
									color={colors.WHITE}
								/>
							)}
						</TouchableOpacity>
					);
				})}
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: '50%',
		backgroundColor: colors.DARK,
		position: 'absolute',
		top: 1,
		left: 0,
		borderBottomRightRadius: 10,
		zIndex: 3,
	},
	mainBtn: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: 10,
	},
	dropdownContainer: {
		backgroundColor: colors.DARK,
		borderBottomRightRadius: 10,
	},
	text: {
		color: colors.WHITE,
	},
	items: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: 10,
		borderTopWidth: 1,
		borderTopColor: 'rgba(255, 255, 255, 0.1)',
	},
});
