import { StyleSheet, View } from "react-native";
import { type BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";

import { BARCODE_SCANNER_SETTINGS } from "../constants/barcodes";
import { colors } from "../constants/colors";
import { useCameraMounted } from "../context/ScanCameraContext";
import { useCameraControls } from "../hooks/useCameraControls";
import CameraPermissionRequest from "./CameraPermissionRequest";
import TorchButton from "./TorchButton";
import Viewfinder from "./Viewfinder";

type ReceiptCameraProps = { onScanned: (result: BarcodeScanningResult) => void };

export default function ReceiptCamera({ onScanned }: ReceiptCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraControls = useCameraControls();

  if (!permission) {
    return <View style={styles.container} />;
  }
  if (!permission.granted) {
    return <CameraPermissionRequest onRequest={requestPermission} />;
  }
  return (
    <View style={styles.container}>
      <MountedCamera
        torch={cameraControls.torch}
        onScanned={(result) => {
          if (cameraControls.accepts(result.bounds)) onScanned(result);
        }}
      />
      <Viewfinder
        style={styles.viewfinder}
        onLayout={cameraControls.onFrameLayout}
      />
      <TorchButton on={cameraControls.torch} onPress={cameraControls.toggleTorch} style={styles.torchButton} />
    </View>
  );
}

function MountedCamera({ onScanned, torch }: ReceiptCameraProps & { torch: boolean }) {
  useCameraMounted("receipt");
  return (
    <CameraView
      active={true}
      enableTorch={torch}
      style={StyleSheet.absoluteFill}
      barcodeScannerSettings={BARCODE_SCANNER_SETTINGS}
      onBarcodeScanned={onScanned}
    />
  );
}

const VIEWFINDER_HEIGHT = 170;
const TORCH_BUTTON_GAP = 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.DARK,
    justifyContent: "center",
  },
  viewfinder: {
    width: 260,
    height: VIEWFINDER_HEIGHT,
  },
  torchButton: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: VIEWFINDER_HEIGHT / 2 + TORCH_BUTTON_GAP,
  },
});
