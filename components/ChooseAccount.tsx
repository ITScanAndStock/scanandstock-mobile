import { useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ChevronDown from "../assets/images/figma/chevron-down.svg";
import { colors } from "../constants/colors";
import { useAccount } from "../context/AccountContext";
import { Account } from "../model/Account";

type ChooseAccountProps = {
  /** Smaller pill used next to screen titles (e.g. Commandes). */
  compact?: boolean;
};

export default function ChoosAccount({ compact = false }: ChooseAccountProps) {
  const { accounts, activeAccount, setActiveAccount } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const chooseAccount = (account: Account) => {
    setActiveAccount(account);
    closeMenu();
  };

  const openMenu = () => {
    setMenuVisible(true);
    setIsOpen(true);
    Animated.timing(animation, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    setIsOpen(false);
    Animated.timing(animation, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuVisible(false);
      }
    });
  };

  const toggleDropdown = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const rotateIcon = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const menuOpacity = animation;
  const menuTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0],
  });

  const chevronSize = compact ? 16 : 18;

  return (
    <View style={[styles.container, menuVisible && styles.containerOpen]}>
      <TouchableOpacity
        style={[styles.mainBtn, compact && styles.mainBtnCompact]}
        onPress={toggleDropdown}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Compte actif: ${activeAccount?.name}`}
        accessibilityHint={`Appuyez pour ${isOpen ? "fermer" : "ouvrir"} la liste des comptes`}
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={[styles.text, compact && styles.textCompact]} numberOfLines={1}>
          {activeAccount?.name}
        </Text>
        <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
          <ChevronDown width={chevronSize} height={chevronSize} accessible={false} />
        </Animated.View>
      </TouchableOpacity>

      {menuVisible ? (
        <Animated.View
          pointerEvents={isOpen ? "auto" : "none"}
          style={[
            styles.dropdownContainer,
            compact && styles.dropdownAlignEnd,
            {
              opacity: menuOpacity,
              transform: [{ translateY: menuTranslateY }],
            },
          ]}
          accessible={false}
        >
          {accounts.map((item) => {
            const isSelected = item.id === activeAccount?.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => chooseAccount(item)}
                style={styles.items}
                accessible={true}
                accessibilityRole="radio"
                accessibilityLabel={item.name}
                accessibilityState={{ selected: isSelected, checked: isSelected }}
                accessibilityHint="Appuyez pour changer de compte"
              >
                <Text style={[styles.text, compact && styles.textCompact]}>{item.name}</Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 3,
  },
  containerOpen: {
    zIndex: 20,
  },
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.PILL,
  },
  mainBtnCompact: {
    gap: 6,
  },
  dropdownContainer: {
    position: "absolute",
    top: 48,
    left: 0,
    minWidth: "100%",
    backgroundColor: colors.MUTED,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.DARK,
    paddingVertical: 4,
  },
  dropdownAlignEnd: {
    left: undefined,
    right: 0,
  },
  text: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "700",
    maxWidth: 140,
  },
  textCompact: {
    fontSize: 13,
    maxWidth: 120,
  },
  items: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 20,
  },
});
