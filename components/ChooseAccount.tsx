import { colors } from '@/constants/colors';
import { useAccount } from '@/context/AccountContext';
import { Account } from '@/model/Account';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import ThemedText from './ui-components/ThemedText';

export default function ChoosAccount() {
	const { accounts, activeAccount, setActiveAccount } = useAccount();
	const [height, setHeight] = useState(0);

	const chooseAccount = (account: Account) => {
		setActiveAccount(account);
	};

	const open = () => {};

	return (
		<View style={styles.container}>
			<TouchableOpacity style={styles.mainBtn}>
				<ThemedText
					variant="title"
					color="WHITE"
				>
					{activeAccount?.name}
				</ThemedText>
				<Ionicons
					name="chevron-down"
					size={24}
					color={colors.WHITE}
				/>
			</TouchableOpacity>
			<View style={{ height: height }}>
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
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: '50%',
		backgroundColor: colors.DARK,
	},
	mainBtn: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	text: {
		color: colors.WHITE,
	},
	items: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
});
