// import react native
import { StyleSheet, Text, TextProps } from 'react-native';

// importr constants
import { colors } from '../../constants/colors';

// type of props
type Props = TextProps & {
	variant?: keyof typeof styles;
	color?: keyof typeof colors;
};

export const styles = StyleSheet.create({
	smallText: {
		fontSize: 9,
		fontFamily: 'Montserat',
		fontWeight: '400',
	},
	regularText: {
		fontSize: 14,
		fontFamily: 'Montserat',
		fontWeight: '600',
	},
	productDesignation: {
		fontSize: 16,
		fontFamily: 'Montserat',
		fontWeight: 'bold',
	},
	productAttribut: {
		fontSize: 15,
		fontFamily: 'Montserat',
		fontWeight: '400',
		textTransform: 'uppercase',
	},
	textBtn: {
		fontSize: 16,
		fontFamily: 'Montserat',
		fontWeight: '600',
		textTransform: 'uppercase',
	},
	title: {
		fontSize: 20,
		fontFamily: 'Montserat',
		fontWeight: '500',
		textTransform: 'uppercase',
	},
});

// themes use for the text in the application
export default function ThemedText({ variant, color, ...rest }: Props) {
	return (
		<Text
			style={[styles[variant ?? 'regularText'], { color: colors[color ?? 'DARK'] }]}
			{...rest}
		/>
	);
}
