import type { BarcodeBounds } from "expo-camera";
import type { LayoutRectangle } from "react-native";

type CameraControlsState = { torch: boolean; zoom: number; zoomed: boolean };
type ZoomLaw = (start: number, scale: number) => number;

export const PINCH_ZOOM_GAIN = 0.5;

const defaultZoomLaw: ZoomLaw = (start, scale) => start + (scale - 1) * PINCH_ZOOM_GAIN;

export type CameraControls = {
  frameMeasured: (rect: LayoutRectangle) => void;
  accepts: (bounds?: BarcodeBounds) => boolean;
  opened: () => void;
  closed: () => void;
  toggleTorch: () => void;
  pinchStarted: () => void;
  pinchChanged: (scale: number) => void;
  resetZoom: () => void;
  getState: () => CameraControlsState;
  subscribe: (listener: () => void) => () => void;
};

export function createCameraControls({ zoomLaw = defaultZoomLaw }: { zoomLaw?: ZoomLaw } = {}): CameraControls {
  let frame: LayoutRectangle | null = null;
  let state: CameraControlsState = { torch: false, zoom: 0, zoomed: false };
  let pinchStart = 0;
  const listeners = new Set<() => void>();

  const update = ({ torch = state.torch, zoom = state.zoom }: { torch?: boolean; zoom?: number }) => {
    const clamped = Number.isFinite(zoom) ? Math.min(1, Math.max(0, zoom)) : state.zoom;
    if (state.torch === torch && state.zoom === clamped) return;
    state = { torch, zoom: clamped, zoomed: clamped > 0 };
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
    opened: () => update({ torch: false, zoom: 0 }),
    closed: () => update({ torch: false, zoom: 0 }),
    toggleTorch: () => update({ torch: !state.torch }),
    pinchStarted: () => {
      pinchStart = state.zoom;
    },
    pinchChanged: (scale) => update({ zoom: zoomLaw(pinchStart, scale) }),
    resetZoom: () => update({ zoom: 0 }),
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
