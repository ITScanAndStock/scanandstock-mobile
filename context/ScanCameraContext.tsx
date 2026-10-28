import React, { createContext, useContext, useMemo, useState } from "react";
import { Animated } from "react-native";

type ScanCameraContextType = {
  isCameraOpen: boolean;
  setCameraOpen: (open: boolean) => void;
  progress: Animated.Value;
  homeOpacity: Animated.AnimatedInterpolation<number>;
};

const ScanCameraContext = createContext<ScanCameraContextType | undefined>(undefined);

export function ScanCameraProvider({ children }: { children: React.ReactNode }) {
  const [isCameraOpen, setCameraOpen] = useState(false);
  const [animation] = useState(() => {
    const progress = new Animated.Value(0);
    const homeOpacity = progress.interpolate({
      inputRange: [0, 0.6],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return { progress, homeOpacity };
  });

  const value = useMemo(() => ({ isCameraOpen, setCameraOpen, ...animation }), [isCameraOpen, animation]);

  return <ScanCameraContext.Provider value={value}>{children}</ScanCameraContext.Provider>;
}

export function useScanCamera() {
  const context = useContext(ScanCameraContext);
  if (!context) {
    throw new Error("useScanCamera must be used within ScanCameraProvider");
  }
  return context;
}
