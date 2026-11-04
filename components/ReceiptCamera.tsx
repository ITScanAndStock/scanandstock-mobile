import { StyleSheet, View } from "react-native";
import { type BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";

import { BARCODE_SCANNER_SETTINGS } from "../constants/barcodes";
import { colors } from "../constants/colors";
import { useCameraMounted } from "../context/ScanCameraContext";
import CameraPermissionRequest from "./CameraPermissionRequest";
import Viewfinder from "./Viewfinder";

type ReceiptCameraProps = { onScanned: (result: BarcodeScanningResult) => void };

export default function ReceiptCamera({ onScanned }: ReceiptCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <View style={styles.container} />;
  }
  if (!permission.granted) {
    return <CameraPermissionRequest onRequest={requestPermission} />;
  }
  return (
    <View style={styles.container}>
      <MountedCamera onScanned={onScanned} />
      <Viewfinder style={styles.viewfinder} />
    </View>
  );
}

function MountedCamera({ onScanned }: ReceiptCameraProps) {
  useCameraMounted("receipt");
  return (
    <CameraView
      active={true}
      style={StyleSheet.absoluteFill}
      barcodeScannerSettings={BARCODE_SCANNER_SETTINGS}
      onBarcodeScanned={onScanned}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.DARK,
    justifyContent: "center",
  },
  viewfinder: {
    width: 260,
    height: 170,
  },
});
