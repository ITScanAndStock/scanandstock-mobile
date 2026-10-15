import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { Method } from '../model/Stock';
import ThemedText from './ui-components/ThemedText';

interface MouvementButtonProps {
	method: Method;
	setMethod: (method: Method) => void;
}

function MouvementButton({ method, setMethod }: MouvementButtonProps) {
	const isDecrease = method === Method.decrease;
	const isIncrease = method === Method.increase;

	return (
		<View
			style={styles.container}
			accessible={true}
			accessibilityLabel="Sélection du type de mouvement de stock"
			accessibilityRole="radiogroup"
		>
			<TouchableOpacity
				onPress={() => setMethod(Method.decrease)}
				style={[styles.btn, isDecrease ? styles.active : null]}
				accessible={true}
				accessibilityLabel="Sortie de stock"
				accessibilityHint="Appuyez pour scanner des produits en sortie de stock"
				accessibilityRole="radio"
				accessibilityState={{ selected: isDecrease, checked: isDecrease }}
			>
				<ThemedText
					variant="productAttribut"
					color={isDecrease ? 'WHITE' : 'DARK'}
				>
					sortie de stock
				</ThemedText>
			</TouchableOpacity>
			<TouchableOpacity
				onPress={() => setMethod(Method.increase)}
				style={[styles.btn, isIncrease ? styles.active : null]}
				accessible={true}
				accessibilityLabel="Entrée de stock"
				accessibilityHint="Appuyez pour scanner des produits en entrée de stock"
				accessibilityRole="radio"
				accessibilityState={{ selected: isIncrease, checked: isIncrease }}
			>
				<ThemedText
					variant="productAttribut"
					color={isIncrease ? 'WHITE' : 'DARK'}
				>
					entrée de stock
				</ThemedText>
			</TouchableOpacity>
		</View>
	);
}

// Mémoriser le composant pour éviter les re-renders inutiles
export default memo(MouvementButton);

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
