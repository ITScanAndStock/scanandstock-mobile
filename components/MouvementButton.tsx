import { memo, useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { Method } from '../model/Stock';
import ThemedText from './ui-components/ThemedText';

interface MouvementButtonProps {
	setMethod: (method: Method) => void;
}

function MouvementButton({ setMethod }: MouvementButtonProps) {
	const [activeClass, setActiveClass] = useState(0);

	const handlePress = useCallback(() => {
		const newActive = activeClass === 1 ? 0 : 1;
		setActiveClass(newActive);
		setMethod(newActive === 1 ? Method.increase : Method.decrease);
	}, [activeClass, setMethod]);

	return (
		<View
			style={styles.container}
			accessible={true}
			accessibilityLabel="Sélection du type de mouvement de stock"
			accessibilityRole="radiogroup"
		>
			<TouchableOpacity
				onPress={handlePress}
				style={[styles.btn, activeClass === 0 ? styles.active : null]}
				accessible={true}
				accessibilityLabel="Sortie de stock"
				accessibilityHint="Appuyez pour scanner des produits en sortie de stock"
				accessibilityRole="radio"
				accessibilityState={{ selected: activeClass === 0, checked: activeClass === 0 }}
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
				accessible={true}
				accessibilityLabel="Entrée de stock"
				accessibilityHint="Appuyez pour scanner des produits en entrée de stock"
				accessibilityRole="radio"
				accessibilityState={{ selected: activeClass === 1, checked: activeClass === 1 }}
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
