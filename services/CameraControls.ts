import type { BarcodeBounds } from "expo-camera";
import type { LayoutRectangle } from "react-native";

type CameraControlsState = { torch: boolean };

export type CameraControls = {
  frameMeasured: (rect: LayoutRectangle) => void;
  accepts: (bounds?: BarcodeBounds) => boolean;
  opened: () => void;
  closed: () => void;
  toggleTorch: () => void;
  getState: () => CameraControlsState;
  subscribe: (listener: () => void) => () => void;
};

export function createCameraControls(): CameraControls {
  let frame: LayoutRectangle | null = null;
  let state: CameraControlsState = { torch: false };
  const listeners = new Set<() => void>();

  const setTorch = (torch: boolean) => {
    if (state.torch === torch) return;
    state = { torch };
    listeners.forEach((listener) => listener());
  };

  return {
    frameMeasured(rect) {
      frame = rect.width > 0 && rect.height > 0 ? rect : null;
    },
    accepts(bounds) {
      if (!frame || !bounds) return false;
      const { origin, size } = bounds;
      if (size.width <= 0 || size.height <= 0) return false;
      const centerX = origin.x + size.width / 2;
      const centerY = origin.y + size.height / 2;
      return (
        centerX >= frame.x &&
        centerX <= frame.x + frame.width &&
        centerY >= frame.y &&
        centerY <= frame.y + frame.height
      );
    },
    opened: () => setTorch(false),
    closed: () => setTorch(false),
    toggleTorch: () => setTorch(!state.torch),
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
