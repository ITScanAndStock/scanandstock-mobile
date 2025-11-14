// import react
import { useEffect, useState } from 'react';

// import react native
import { Button, StyleSheet, Text, Vibration, View } from 'react-native';

// import expo
import { BarcodeScanningResult, BarcodeType, CameraView, useCameraPermissions } from 'expo-camera';

// import components
import GoBackHeader from '@/components/GoBackHeader';
import MouvementButton from '@/components/MouvementButton';
import { useAccount } from '@/context/AccountContext';
import { StatsModel } from '@/model/Stats';
import { Method } from '@/model/Stock';
import ProductService from '@/services/ProductService';

export default function Scanner() {
	const [permission, requestPermission] = useCameraPermissions();
	const [isScanning, setIsScanning] = useState<boolean>(true);
	const typeOfAcceptScan: BarcodeType[] = ['qr', 'aztec', 'codabar', 'code128', 'code39', 'code93', 'datamatrix', 'ean13', 'ean8', 'itf14', 'pdf417', 'upc_a', 'upc_a', 'upc_e'];
	const { activeAccount } = useAccount();
	const [stats, setStats] = useState<StatsModel[]>();
	const [scannedCode, setScannedCode] = useState('');
	const [scanCount, setScanCount] = useState(0);
	const [method, setMethod] = useState(Method.decrease);

	useEffect(() => {
		loadStats();
	}, [activeAccount]);

	const loadStats = async () => {
		try {
			const response = await ProductService.getStats();
			setStats(response);
		} catch (error) {
			console.error('❌ Erreur chargement stats:', error);
		}
	};
	if (!permission) {
		// Camera permissions are still loading.
		return <View />;
	}

	if (!permission.granted) {
		// Camera permissions are not granted yet.
		return (
			<View style={styles.container}>
				<Text style={styles.message}>Nous avons besoins de votre permission pour utiliser la caméra</Text>
				<Button
					onPress={requestPermission}
					title="grant permission"
				/>
			</View>
		);
	}

	function handleBarcodeScanned({ data }: BarcodeScanningResult) {
		// Ignorer si le scanner est désactivé
		if (!isScanning || !data) {
			return;
		}
		const cleanedCode = data.replace(/\x1D/g, '$'); // \x1D = caractère GS

		// 1. Si c'est un nouveau code différent du précédent en cours de vérification
		if (cleanedCode !== scannedCode) {
			// ✅ Remplacer les caractères GS (ASCII 29) par $
			setScannedCode(cleanedCode);
			setScanCount(1);
			return;
		}

		// 2. Si c'est le MÊME code que la frame précédente
		if (cleanedCode === scannedCode) {
			// Si on l'a vu assez de fois (ex: 5 frames successives)
			if (scanCount >= 5) {
				Vibration.vibrate(100);
				ProductService.scan(scannedCode, method);
				setScannedCode(''); // Reset pour le prochain
				setScanCount(0);
				setIsScanning(false);
				setTimeout(() => {
					setIsScanning(true);
				}, 2000);
			} else {
				// On incrémente le compteur de confiance
				setScanCount(scanCount + 1);
			}
		}
	}

	return (
		<View style={styles.container}>
			<CameraView
				style={styles.camera}
				barcodeScannerSettings={{
					barcodeTypes: typeOfAcceptScan,
				}}
				onBarcodeScanned={(event) => {
					handleBarcodeScanned(event);
				}}
			/>
			<GoBackHeader />
			<View style={styles.foot}>
				<MouvementButton setMethod={setMethod} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
	},
	message: {
		textAlign: 'center',
		paddingBottom: 10,
	},
	camera: {
		flex: 1,
	},
	goBackContainer: {},
	button: {
		flex: 1,
		alignItems: 'center',
	},
	text: {
		fontSize: 24,
		fontWeight: 'bold',
		color: 'white',
	},
	foot: {
		width: '100%',
		height: 140,
		position: 'absolute',
		bottom: 0,
		backgroundColor: ' rgba(51, 59, 63, 0.7)',
		paddingHorizontal: 10,
		justifyContent: 'space-evenly',
	},
	info: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		gap: 8,
	},
});
