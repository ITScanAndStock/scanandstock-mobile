import { StatsModel } from '@/model/Stats';
import AntDesign from '@expo/vector-icons/AntDesign';
import ThemedText from './ThemedText';

interface StatProps extends StatsModel {
	color?: 'DARK' | 'GREEN' | 'WHITE' | 'GREY';
}

export default function Stat({ designation, type, color }: StatProps) {
	return (
		<ThemedText
			variant="productDesignation"
			numberOfLines={1}
			ellipsizeMode="tail"
			color={color ? color : 'DARK'}
		>
			{type === 'increase' ? (
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
			{designation}
		</ThemedText>
	);
}
