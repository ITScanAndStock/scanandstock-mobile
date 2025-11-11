// import react
import { useState } from 'react';

// import react native
import { Button, StyleSheet, Text, View } from 'react-native';

// import expo
import { BarcodeType, CameraView, useCameraPermissions } from 'expo-camera';

// import components
import GoBackHeader from '@/components/GoBackHeader';

export default function Scanner() {
	const [permission, requestPermission] = useCameraPermissions();
	const [isScanning, setIsScanning] = useState<boolean>(true);
	const typeOfAcceptScan: BarcodeType[] = ['qr', 'aztec', 'codabar', 'code128', 'code39', 'code93', 'datamatrix', 'ean13', 'ean8', 'itf14', 'pdf417', 'upc_a', 'upc_a', 'upc_e'];

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

	function handleBarcodeScanned(event: any) {
		// Ignorer si le scanner est désactivé
		if (!isScanning) return;

		// Desactivate scanner for 2sec after scanning success
		setIsScanning(false);
		setTimeout(() => {
			setIsScanning(true);
		}, 2000);
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
});
