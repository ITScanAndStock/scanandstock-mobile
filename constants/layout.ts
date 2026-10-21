import { Dimensions } from "react-native";

const TABLET_MIN_SIDE = 600;

export const isTablet = () => {
  const { width, height } = Dimensions.get("screen");
  return Math.min(width, height) >= TABLET_MIN_SIDE;
};
