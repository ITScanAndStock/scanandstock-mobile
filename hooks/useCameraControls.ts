import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";

import { createCameraControls } from "@/services/CameraControls";

export function useCameraControls() {
  const [controls] = useState(createCameraControls);
  const onFrameLayout = ({ nativeEvent }: LayoutChangeEvent) => controls.frameMeasured(nativeEvent.layout);
  return { accepts: controls.accepts, onFrameLayout };
}
