import { useState, useSyncExternalStore } from "react";
import type { LayoutChangeEvent } from "react-native";

import { createCameraControls } from "@/services/CameraControls";

export function useCameraControls() {
  const [controls] = useState(createCameraControls);
  const { torch } = useSyncExternalStore(controls.subscribe, controls.getState);
  const onFrameLayout = ({ nativeEvent }: LayoutChangeEvent) => controls.frameMeasured(nativeEvent.layout);
  return {
    accepts: controls.accepts,
    onFrameLayout,
    opened: controls.opened,
    closed: controls.closed,
    torch,
    toggleTorch: controls.toggleTorch,
  };
}
