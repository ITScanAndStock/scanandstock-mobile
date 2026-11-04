import type { BarcodeBounds } from "expo-camera";
import type { LayoutRectangle } from "react-native";

export type CameraControls = {
  frameMeasured: (rect: LayoutRectangle) => void;
  accepts: (bounds?: BarcodeBounds) => boolean;
};

export function createCameraControls(): CameraControls {
  let frame: LayoutRectangle | null = null;

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
  };
}
