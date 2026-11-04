import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import { type CameraTurn, computeCameraTurn } from "@/services/CameraTurn";

type CameraOwner = "home" | "receipt";

type ScanCameraContextType = {
  isCameraOpen: boolean;
  setCameraOpen: (open: boolean) => void;
  progress: Animated.Value;
  homeOpacity: Animated.AnimatedInterpolation<number>;
  isReceiptOpen: boolean;
  setReceiptOpen: (open: boolean) => void;
  cameraTurn: CameraTurn;
  setCameraMounted: (owner: CameraOwner, mounted: boolean) => void;
};

const ScanCameraContext = createContext<ScanCameraContextType | undefined>(undefined);

export function ScanCameraProvider({ children }: { children: React.ReactNode }) {
  const [isCameraOpen, setCameraOpen] = useState(false);
  const [isReceiptOpen, setReceiptOpen] = useState(false);
  const [mounted, setMounted] = useState({ home: false, receipt: false });
  const [animation] = useState(() => {
    const progress = new Animated.Value(0);
    const homeOpacity = progress.interpolate({
      inputRange: [0, 0.6],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return { progress, homeOpacity };
  });

  const setCameraMounted = useCallback(
    (owner: CameraOwner, isMounted: boolean) => setMounted((previous) => ({ ...previous, [owner]: isMounted })),
    [],
  );

  const value = useMemo(
    () => ({
      isCameraOpen,
      setCameraOpen,
      ...animation,
      isReceiptOpen,
      setReceiptOpen,
      cameraTurn: computeCameraTurn({ receiptOpen: isReceiptOpen, homeMounted: mounted.home, receiptMounted: mounted.receipt }),
      setCameraMounted,
    }),
    [isCameraOpen, animation, isReceiptOpen, mounted, setCameraMounted],
  );

  return <ScanCameraContext.Provider value={value}>{children}</ScanCameraContext.Provider>;
}

export function useScanCamera() {
  const context = useContext(ScanCameraContext);
  if (!context) {
    throw new Error("useScanCamera must be used within ScanCameraProvider");
  }
  return context;
}

// Signalled by an effect's cleanup, which runs once the camera view is gone from the tree.
export function useCameraMounted(owner: CameraOwner) {
  const { setCameraMounted } = useScanCamera();
  useEffect(() => {
    setCameraMounted(owner, true);
    return () => setCameraMounted(owner, false);
  }, [owner, setCameraMounted]);
}

export function useNavigationHidden() {
  const { isCameraOpen, isReceiptOpen, homeOpacity } = useScanCamera();
  // Once the native driver has animated the opacity, Android ignores a plain value put in its place: a receipt removes the bar instead.
  return { hidden: isCameraOpen || isReceiptOpen, style: [{ opacity: homeOpacity }, isReceiptOpen && navigationStyles.removed] };
}

const navigationStyles = StyleSheet.create({
  removed: {
    display: "none",
  },
});
