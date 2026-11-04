import { StyleSheet, View } from "react-native";
import { GestureDetector, type PinchGesture } from "react-native-gesture-handler";
import { type BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";

import { BARCODE_SCANNER_SETTINGS } from "../constants/barcodes";
import { colors } from "../constants/colors";
import { useCameraMounted } from "../context/ScanCameraContext";
import { useCameraControls } from "../hooks/useCameraControls";
import CameraPermissionRequest from "./CameraPermissionRequest";
import { ROUND_BUTTON } from "./RoundButton";
import TorchButton from "./TorchButton";
import Viewfinder from "./Viewfinder";
import ZoomResetButton from "./ZoomResetButton";

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
        zoom={cameraControls.zoom}
        pinch={cameraControls.pinch}
        onScanned={(result) => {
          if (cameraControls.accepts(result.bounds)) onScanned(result);
        }}
      />
      <Viewfinder
        style={styles.viewfinder}
        onLayout={cameraControls.onFrameLayout}
      />
      <TorchButton on={cameraControls.torch} onPress={cameraControls.toggleTorch} style={styles.torchButton} />
      {cameraControls.zoomed ? <ZoomResetButton onPress={cameraControls.resetZoom} style={styles.zoomButton} /> : null}
    </View>
  );
}

type MountedCameraProps = ReceiptCameraProps & { torch: boolean; zoom: number; pinch: PinchGesture };

function MountedCamera({ onScanned, torch, zoom, pinch }: MountedCameraProps) {
  useCameraMounted("receipt");
  return (
    <GestureDetector gesture={pinch}>
      <CameraView
        active={true}
        enableTorch={torch}
        zoom={zoom}
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={BARCODE_SCANNER_SETTINGS}
        onBarcodeScanned={onScanned}
      />
    </GestureDetector>
  );
}

const VIEWFINDER_HEIGHT = 170;
const BUTTON_GAP = 20;
const BUTTONS_TOP_MARGIN = VIEWFINDER_HEIGHT / 2 + BUTTON_GAP;

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
    marginTop: BUTTONS_TOP_MARGIN,
  },
  zoomButton: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginTop: BUTTONS_TOP_MARGIN,
    marginLeft: ROUND_BUTTON.width / 2 + BUTTON_GAP,
  },
});
