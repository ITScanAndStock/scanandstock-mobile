// import expo
import { Tabs } from 'expo-router';

// import svg and icons
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// import constants
import { colors } from '@/constants/colors';

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: colors.GREEN,
				tabBarInactiveTintColor: colors.DARK,
				headerShown: false,
				tabBarStyle: {
					height: 60, // Hauteur fixe pour la tab bar
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={({ navigation }) => {
					const isFocused = navigation.isFocused();
					return {
						title: 'Scan',
						tabBarIcon: ({ focused }) => (
							<MaterialCommunityIcons
								name="line-scan"
								size={24}
								color={focused ? colors.GREEN : colors.DARK}
							/>
						),
						tabBarLabelStyle: {
							fontSize: 16,
							fontFamily: 'Montserrat',
							fontWeight: '900',
						},
						tabBarItemStyle: {
							borderTopWidth: 3,
							borderTopColor: isFocused ? colors.GREEN : colors.DARK,
							height: 60,
						},
					};
				}}
			/>
			{/* <Tabs.Screen
				name="profile"
				options={({ navigation }) => {
					const isFocused = navigation.isFocused();
					return {
						title: 'Info',
						tabBarIcon: ({ focused }) => (
							<Feather
								name="user"
								size={24}
								color={focused ? colors.GREEN : colors.DARK}
							/>
						),
						tabBarLabelStyle: {
							fontSize: 16,
							fontFamily: 'Montserrat',
							fontWeight: '900',
						},
						tabBarItemStyle: {
							borderTopWidth: 3,
							borderTopColor: isFocused ? colors.GREEN : colors.DARK,
							height: 60,
						},
					};
				}}
			/> */}
		</Tabs>
	);
}
