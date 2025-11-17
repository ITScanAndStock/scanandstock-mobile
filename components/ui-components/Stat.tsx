import AntDesign from '@expo/vector-icons/AntDesign';
import { StatsModel } from '../../model/Stats';
import ThemedText from './ThemedText';

interface StatProps extends StatsModel {
	color?: 'DARK' | 'GREEN' | 'WHITE' | 'GREY';
}

export default function Stat({ designation, type, color }: StatProps) {
	const actionText = type === 'increase' ? 'Augmentation' : 'Diminution';

	return (
		<ThemedText
			variant="productDesignation"
			numberOfLines={1}
			ellipsizeMode="tail"
			color={color ? color : 'DARK'}
			accessible={true}
			accessibilityRole="text"
			accessibilityLabel={`${actionText}: ${designation}`}
		>
			{type === 'increase' ? (
				<AntDesign
					name="arrow-up"
					size={24}
					color="green"
					accessible={false}
				/>
			) : (
				<AntDesign
					name="arrow-down"
					size={24}
					color="red"
					accessible={false}
				/>
			)}
			{designation}
		</ThemedText>
	);
}
