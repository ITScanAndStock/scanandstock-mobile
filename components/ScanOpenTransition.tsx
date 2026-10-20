import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

type ScanOpenTransitionProps = {
  visible: boolean;
  progress: Animated.Value;
  onNavigate: () => void;
  onFinished: () => void;
};

const DURATION_MS = 1400;
const NAVIGATE_AT_MS = 480;

/**
 * Drives Accueil → camera progress (JS driver so layout restores reliably on back).
 */
export default function ScanOpenTransition({
  visible,
  progress,
  onNavigate,
  onFinished,
}: ScanOpenTransitionProps) {
  const navigatedRef = useRef(false);
  const finishedRef = useRef(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const overlay = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0.35, 0.55],
  });

  useEffect(() => {
    if (!visible) {
      navigatedRef.current = false;
      finishedRef.current = false;
      animationRef.current?.stop();
      animationRef.current = null;
      progress.setValue(0);
      return;
    }

    navigatedRef.current = false;
    finishedRef.current = false;
    progress.setValue(0);

    const navigateTimer = setTimeout(() => {
      if (navigatedRef.current) {
        return;
      }
      navigatedRef.current = true;
      onNavigate();
    }, NAVIGATE_AT_MS);

    // useNativeDriver: false — panel translateY must reset cleanly when coming back.
    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.bezier(0.33, 0.0, 0.2, 1),
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      clearTimeout(navigateTimer);
      if (!finished || finishedRef.current) {
        return;
      }
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        onNavigate();
      }
      finishedRef.current = true;
      onFinished();
    });

    return () => {
      clearTimeout(navigateTimer);
      animationRef.current?.stop();
      animationRef.current = null;
    };
  }, [visible, progress, onNavigate, onFinished]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.root} pointerEvents="none" accessibilityElementsHidden>
      <Animated.View style={[styles.dim, { opacity: overlay }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28,37,41,0.65)",
  },
});
