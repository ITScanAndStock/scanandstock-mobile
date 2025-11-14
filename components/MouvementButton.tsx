import { colors } from '@/constants/colors';
import { Method } from '@/model/Stock';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import ThemedText from './ui-components/ThemedText';

export default function MouvementButton({ setMethod }: any) {
	const [activeClass, setActiveClass] = useState(0);
	const handlePress = () => {
		activeClass === 1 ? setActiveClass(0) : setActiveClass(1);
		activeClass === 1 ? setMethod(Method.decrease) : setMethod(Method.increase);
	};
	return (
		<View style={styles.container}>
			<TouchableOpacity
				onPress={handlePress}
				style={[styles.btn, activeClass === 0 ? styles.active : null]}
			>
				<ThemedText
					variant="productAttribut"
					color={activeClass === 0 ? 'WHITE' : 'DARK'}
				>
					sortie de stock
				</ThemedText>
			</TouchableOpacity>
			<TouchableOpacity
				onPress={handlePress}
				style={[styles.btn, activeClass === 1 ? styles.active : null]}
			>
				<ThemedText
					variant="productAttribut"
					color={activeClass === 1 ? 'WHITE' : 'DARK'}
				>
					entrée de stock
				</ThemedText>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		height: 50,
		width: '100%',
		justifyContent: 'space-around',
		alignItems: 'center',
		borderRadius: 100,
		borderWidth: 1,
		borderColor: colors.WHITE,
		backgroundColor: '#fff',
	},
	btn: {
		width: '50%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 100,
	},
	active: {
		backgroundColor: colors.DARK,
	},
});
