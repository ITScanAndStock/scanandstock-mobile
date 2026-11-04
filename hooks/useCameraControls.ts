import { useState, useSyncExternalStore } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Gesture } from "react-native-gesture-handler";

import { createCameraControls } from "@/services/CameraControls";

export function useCameraControls() {
  const [controls] = useState(createCameraControls);
  const [pinch] = useState(() =>
    Gesture.Pinch()
      // The worklets plugin compiles gesture callbacks to worklets; the JS module can't be called from them.
      .runOnJS(true)
      .onStart(() => controls.pinchStarted())
      .onUpdate(({ scale }) => controls.pinchChanged(scale)),
  );
  const { torch, zoom, zoomed } = useSyncExternalStore(controls.subscribe, controls.getState);
  const onFrameLayout = ({ nativeEvent }: LayoutChangeEvent) => controls.frameMeasured(nativeEvent.layout);
  return {
    accepts: controls.accepts,
    onFrameLayout,
    opened: controls.opened,
    closed: controls.closed,
    torch,
    toggleTorch: controls.toggleTorch,
    zoom,
    zoomed,
    resetZoom: controls.resetZoom,
    pinch,
  };
}
