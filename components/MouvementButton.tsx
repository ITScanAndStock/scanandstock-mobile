import { memo, useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";
import { Method } from "../model/Stock";

interface MouvementButtonProps {
  method: Method;
  setMethod: (method: Method) => void;
}

const TRACK_PADDING = 4;
const TRACK_GAP = 4;

function MouvementButton({ method, setMethod }: MouvementButtonProps) {
  const isIncrease = method === Method.increase;
  const [trackWidth, setTrackWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;

  const optionWidth =
    trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2 - TRACK_GAP) / 2 : 0;

  useEffect(() => {
    if (optionWidth <= 0) {
      return;
    }
    Animated.spring(indicatorX, {
      toValue: isIncrease ? 0 : optionWidth + TRACK_GAP,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [isIncrease, optionWidth, indicatorX]);

  const onLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={styles.track}
      onLayout={onLayout}
      accessible={true}
      accessibilityLabel="Type de mouvement"
      accessibilityRole="radiogroup"
    >
      {optionWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: optionWidth,
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />
      ) : null}

      <Pressable
        onPress={() => setMethod(Method.increase)}
        style={styles.option}
        accessible={true}
        accessibilityLabel="Entrée de stock"
        accessibilityHint="Appuyez pour scanner des produits en entrée de stock"
        accessibilityRole="radio"
        accessibilityState={{ selected: isIncrease, checked: isIncrease }}
      >
        <Text style={[styles.label, isIncrease && styles.labelActive]}>Entrée</Text>
      </Pressable>
      <Pressable
        onPress={() => setMethod(Method.decrease)}
        style={styles.option}
        accessible={true}
        accessibilityLabel="Sortie de stock"
        accessibilityHint="Appuyez pour scanner des produits en sortie de stock"
        accessibilityRole="radio"
        accessibilityState={{ selected: !isIncrease, checked: !isIncrease }}
      >
        <Text style={[styles.label, !isIncrease && styles.labelActive]}>Sortie</Text>
      </Pressable>
    </View>
  );
}

export default memo(MouvementButton);

const styles = StyleSheet.create({
  track: {
    flex: 1,
    flexDirection: "row",
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(22,30,34,0.72)",
    padding: TRACK_PADDING,
    gap: TRACK_GAP,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.GREEN_DARK,
  },
  option: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  label: {
    color: colors.WHITE,
    fontSize: 15,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  labelActive: {
    fontWeight: "800",
  },
});
