import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
	const { isAuthenticated, isLoading } = useAuth();

	// Ne rien afficher pendant le chargement
	if (isLoading) return null;

	// Redirection simple sans useEffect
	return <Redirect href={isAuthenticated ? '/(tabs)' : '/login'} />;
}
