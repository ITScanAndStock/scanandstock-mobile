// import react
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// import react native
import { Button, StyleSheet, Text, Vibration, View } from 'react-native';

// import expo
import { BarcodeScanningResult, BarcodeType, CameraView, useCameraPermissions } from 'expo-camera';

// import components
import Stat from '@/components/ui-components/Stat';
import GoBackHeader from '../components/GoBackHeader';
import MouvementButton from '../components/MouvementButton';
import ScanLoader from '../components/ScanLoader';
import { useStats } from '../hooks/useStats';
import { Method } from '../model/Stock';
import ProductService from '../services/ProductService';

export default function Scanner() {
	const [permission, requestPermission] = useCameraPermissions();
	const [isScanning, setIsScanning] = useState<boolean>(true);

	// Mémoiser les types de codes-barres pour éviter de recréer le tableau à chaque render
	const typeOfAcceptScan: BarcodeType[] = useMemo(() => ['qr', 'aztec', 'codabar', 'code128', 'code39', 'code93', 'datamatrix', 'ean13', 'ean8', 'itf14', 'pdf417', 'upc_a', 'upc_e'], []);

	const { reload: reloadStats, stats } = useStats();
	const [scannedCode, setScannedCode] = useState('');
	const [scanCount, setScanCount] = useState(0);
	const [method, setMethod] = useState(Method.decrease);
	const [isProcessing, setIsProcessing] = useState(false);

	// Utiliser useRef pour éviter de bloquer le scan pendant le traitement
	const processingRef = useRef(false);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Mémoiser le callback de changement de méthode
	const handleMethodChange = useCallback((newMethod: Method) => {
		setMethod(newMethod);
	}, []);

	// Mémoiser le handler pour éviter les re-renders inutiles de CameraView
	const handleBarcodeScanned = useCallback(
		({ data }: BarcodeScanningResult) => {
			// Ignorer si déjà en traitement ou scanner désactivé
			if (!isScanning || !data || processingRef.current) {
				return;
			}

			const cleanedCode = data.replace(/\x1D/g, '$'); // \x1D = caractère GS

			// Validation du code-barres
			if (!cleanedCode || cleanedCode.length < 4 || cleanedCode.length > 100) {
				if (__DEV__) {
					console.warn('⚠️ Code-barres invalide (longueur):', cleanedCode);
				}
				return;
			}

			// Vérifier que le code contient des caractères valides
			const validCodePattern = /^[A-Za-z0-9$\-_.+!*'(),]+$/;
			if (!validCodePattern.test(cleanedCode)) {
				if (__DEV__) {
					console.warn('⚠️ Code-barres invalide (caractères):', cleanedCode);
				}
				return;
			}

			// 1. Si c'est un nouveau code différent du précédent
			if (cleanedCode !== scannedCode) {
				setScannedCode(cleanedCode);
				setScanCount(1);
				return;
			}

			// 2. Si c'est le MÊME code que la frame précédente
			if (cleanedCode === scannedCode) {
				// Si on l'a vu assez de fois (3 frames au lieu de 5 pour plus de réactivité)
				if (scanCount >= 2) {
					// Marquer comme en traitement immédiatement
					processingRef.current = true;
					setIsProcessing(true);
					setIsScanning(false);

					// Vibration haptique
					Vibration.vibrate(100);

					// Appel API optimisé
					ProductService.scan(cleanedCode, method)
						.then(() => {
							// Recharger les stats en arrière-plan
							reloadStats();
						})
						.catch((error) => {
							if (__DEV__) {
								console.error('❌ Erreur lors du scan:', error);
							}
						})
						.finally(() => {
							setIsProcessing(false);
							processingRef.current = false;
						});

					// Reset immédiat pour le prochain scan
					setScannedCode('');
					setScanCount(0);

					// Réactiver le scan après un délai réduit
					if (timeoutRef.current) {
						clearTimeout(timeoutRef.current);
					}
					timeoutRef.current = setTimeout(() => {
						setIsScanning(true);
					}, 1500); // Réduit de 2000ms à 1500ms
				} else {
					// Incrémenter le compteur
					setScanCount((prev) => prev + 1);
				}
			}
		},
		[isScanning, scannedCode, scanCount, method, reloadStats]
	);

	// Mémoiser les settings du scanner
	const barcodeScannerSettings = useMemo(
		() => ({
			barcodeTypes: typeOfAcceptScan,
		}),
		[typeOfAcceptScan]
	);

	// Cleanup du timeout lors du démontage du composant
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	// Rendu conditionnel après tous les hooks
	if (!permission) {
		// Camera permissions are still loading.
		return <View style={styles.container} />;
	}

	if (!permission.granted) {
		// Camera permissions are not granted yet.
		return (
			<View
				style={styles.container}
				accessible={true}
				accessibilityLabel="Permission de la caméra requise"
			>
				<Text
					style={styles.message}
					accessible={true}
					accessibilityRole="text"
				>
					Nous avons besoins de votre permission pour utiliser la caméra
				</Text>
				<Button
					onPress={requestPermission}
					title="Autoriser la caméra"
					accessibilityLabel="Autoriser la caméra"
				/>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<CameraView
				style={styles.camera}
				barcodeScannerSettings={barcodeScannerSettings}
				onBarcodeScanned={handleBarcodeScanned}
			/>
			{!isScanning && !isProcessing && (
				<View style={styles.scannerDisabledOverlay}>
					<Text style={styles.scannerDisabledText}>Scanner temporairement désactivé...</Text>
				</View>
			)}
			<GoBackHeader />
			<View style={styles.foot}>
				<Stat
					color="WHITE"
					designation={stats?.[0]?.designation ?? ''}
					type={stats?.[0]?.type ?? ''}
					mvmtDateTime={''}
					price={0}
					provider={''}
					quantity={0}
					totalStock={0}
					userEmail={''}
					userName={''}
					action={''}
				/>
				<MouvementButton setMethod={handleMethodChange} />
			</View>
			<ScanLoader visible={isProcessing} />
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
	scannerDisabledOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.4)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1,
	},
	scannerDisabledText: {
		color: 'white',
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center',
	},
});
