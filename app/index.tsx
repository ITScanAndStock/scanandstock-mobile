import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';

export default function Index() {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) return null;

	return <Redirect href={isAuthenticated ? '/(tabs)' : '/login'} />;
}
