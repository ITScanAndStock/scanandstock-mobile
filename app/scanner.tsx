// import react
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// import react native
import AntDesign from '@expo/vector-icons/AntDesign';
import { Button, StyleSheet, Text, Vibration, View } from 'react-native';
import Box from '../assets/images/box.svg';

// Types
type Point = { x: number; y: number };

// import expo
import { BarcodeScanningResult, BarcodeType, CameraView, useCameraPermissions } from 'expo-camera';

// import components
import InformationBanner from '@/components/ui-components/InformationBanner';
import { colors } from '@/constants/colors';
import { useAccount } from '@/context/AccountContext';
import { useAudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import GoBackHeader from '../components/GoBackHeader';
import MouvementButton from '../components/MouvementButton';
import ScanBadge from '../components/ScanBadge';
import ScanLoader from '../components/ScanLoader';
import { useStats } from '../hooks/useStats';
import { Method } from '../model/Stock';
import ProductService from '../services/ProductService';

const audioSourceSucces = require('../assets/sounds/ok.mp3');
const audioSourceError = require('../assets/sounds/error.mp3');

export default function Scanner() {
	const [permission, requestPermission] = useCameraPermissions();
	const [isScanning, setIsScanning] = useState<boolean>(true);

	const playerSuccess = useAudioPlayer(audioSourceSucces);
	const playerError = useAudioPlayer(audioSourceError);

	const typeOfAcceptScan: BarcodeType[] = useMemo(() => ['qr', 'aztec', 'codabar', 'code128', 'code39', 'code93', 'datamatrix', 'ean13', 'ean8', 'itf14', 'pdf417', 'upc_a', 'upc_e'], []);

	const { reload: reloadStats, stats } = useStats();
	const [scannedCode, setScannedCode] = useState('');
	const [scanCount, setScanCount] = useState(0);
	const [method, setMethod] = useState(Method.decrease);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isBadgeProcessing, setIsBadgeProcessing] = useState(false);
	const [showBanner, setShowBanner] = useState(false);
	const { isTracingEnabled, activeBadgeId, getBadge } = useAccount();

	// Utiliser useRef pour éviter de bloquer le scan pendant le traitement
	const processingRef = useRef(false);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const bannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Mémoiser le callback de changement de méthode
	const handleMethodChange = useCallback((newMethod: Method) => {
		setMethod(newMethod);

		// Afficher la bannière si on passe en mode sortie de stock
		if (newMethod === Method.decrease) {
			setShowBanner(true);

			// Masquer la bannière après 5 secondes
			if (bannerTimeoutRef.current) {
				clearTimeout(bannerTimeoutRef.current);
			}
			bannerTimeoutRef.current = setTimeout(() => {
				setShowBanner(false);
			}, 5000);
		} else {
			setShowBanner(false);
		}
	}, []);

	const handleBadgeConnexion = async ({ data }: BarcodeScanningResult) => {
		if (isBadgeProcessing) return;

		setIsBadgeProcessing(true);
		setIsScanning(false);
		Vibration.vibrate(100);
		try {
			await getBadge(data);
			playerSuccess.seekTo(0);
			playerSuccess.play();
		} catch (error) {
			if (__DEV__) {
				console.error('❌ Erreur lors du scan du badge:', error);
			}
			playerError.seekTo(0);
			playerError.play();
		} finally {
			setIsBadgeProcessing(false);
			setIsScanning(true);
			router.navigate('/');
		}
	};

	// Mémoiser le handler pour éviter les re-renders inutiles de CameraView
	const handleBarcodeScanned = useCallback(
		(result: BarcodeScanningResult) => {
			const { data } = result;

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
							playerSuccess.seekTo(0);
							playerSuccess.play();
						})
						.catch((error) => {
							if (__DEV__) {
								console.error('❌ Erreur lors du scan:', error);
							}
							playerError.seekTo(0);
							playerError.play();
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
					}, 2000);
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

	const handleScan = ({ data }: BarcodeScanningResult) => {
		// Ne pas scanner si un traitement est en cours (badge ou produit)
		if (isBadgeProcessing || isProcessing) return;

		if (isTracingEnabled && activeBadgeId === '') {
			handleBadgeConnexion({ data } as BarcodeScanningResult);
		} else {
			handleBarcodeScanned({ data } as BarcodeScanningResult);
		}
	};

	// Cleanup du timeout lors du démontage du composant
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			if (bannerTimeoutRef.current) {
				clearTimeout(bannerTimeoutRef.current);
			}
		};
	}, []);

	// Afficher la bannière pendant 5 secondes au chargement si en mode sortie de stock
	useEffect(() => {
		if (method === Method.decrease) {
			setShowBanner(true);
			bannerTimeoutRef.current = setTimeout(() => {
				setShowBanner(false);
			}, 5000);
		}
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
				onBarcodeScanned={handleScan}
			/>
			<GoBackHeader />
			<View style={styles.banner}>{showBanner && method === Method.decrease ? <InformationBanner title="Attention la sortie de stock est activée" /> : isTracingEnabled && activeBadgeId !== '' ? <ScanBadge /> : null}</View>
			<View style={styles.foot}>
				<View style={styles.stats}>
					<View style={styles.text}>
						{stats && stats.length > 0 && stats[0].type === 'increase' ? (
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
								style={{ margin: 0 }}
							/>
						)}
						<Text style={{ fontFamily: 'SemiBold', color: colors.WHITE, fontSize: 16 }}>{stats && stats.length > 0 ? stats[0].designation : ''}</Text>
					</View>
					<View style={styles.text}>
						<Box width={24} />
						<Text style={{ fontFamily: 'Regular', color: colors.WHITE, fontSize: 15 }}>STOCK(S) : {stats && stats.length > 0 ? stats[0].totalStock : 0}</Text>
					</View>
				</View>
				<MouvementButton setMethod={handleMethodChange} />
			</View>
			<ScanLoader visible={isProcessing || isBadgeProcessing} />
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
	banner: { backgroundColor: 'transparent', position: 'absolute', top: 50, width: '100%' },
	button: {
		flex: 1,
		alignItems: 'center',
	},
	text: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	stats: {
		gap: 5,
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
	scanAreaOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	scanAreaTop: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	scanAreaMiddle: {
		flexDirection: 'row',
		height: 250,
	},
	scanAreaSide: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	scanBox: {
		width: 250,
		position: 'relative',
		// borderWidth: 2,
		// borderColor: 'rgba(255, 255, 255, 0.5)',
	},
	scanAreaBottom: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	corner: {
		position: 'absolute',
		width: 30,
		height: 30,
		borderColor: colors.GREEN,
	},
	cornerTopLeft: {
		top: -2,
		left: -2,
		borderTopWidth: 4,
		borderLeftWidth: 4,
	},
	cornerTopRight: {
		top: -2,
		right: -2,
		borderTopWidth: 4,
		borderRightWidth: 4,
	},
	cornerBottomLeft: {
		bottom: -2,
		left: -2,
		borderBottomWidth: 4,
		borderLeftWidth: 4,
	},
	cornerBottomRight: {
		bottom: -2,
		right: -2,
		borderBottomWidth: 4,
		borderRightWidth: 4,
	},
});
