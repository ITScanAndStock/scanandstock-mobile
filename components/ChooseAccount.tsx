import { useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ChevronDown from "../assets/images/figma/chevron-down.svg";
import { colors } from "../constants/colors";
import { useAccount } from "../context/AccountContext";
import { Account } from "../model/Account";

export default function ChoosAccount() {
  const { accounts, activeAccount, setActiveAccount } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [animation] = useState(() => new Animated.Value(0));

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

  return (
    <View style={[styles.container, menuVisible && styles.containerOpen]}>
      <TouchableOpacity
        style={styles.mainBtn}
        onPress={toggleDropdown}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Compte actif: ${activeAccount?.name}`}
        accessibilityHint={`Appuyez pour ${isOpen ? "fermer" : "ouvrir"} la liste des comptes`}
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={styles.text} numberOfLines={1}>
          {activeAccount?.name}
        </Text>
        <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
          <ChevronDown width={18} height={18} accessible={false} />
        </Animated.View>
      </TouchableOpacity>

      {menuVisible ? (
        <Animated.View
          pointerEvents={isOpen ? "auto" : "none"}
          style={[
            styles.dropdownContainer,
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
                <Text style={styles.itemText} numberOfLines={1}>
                  {item.name}
                </Text>
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
  dropdownContainer: {
    position: "absolute",
    top: 48,
    left: 0,
    width: 240,
    backgroundColor: colors.MUTED,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.DARK,
    paddingVertical: 4,
  },
  text: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
    maxWidth: 140,
  },
  itemText: {
    flexShrink: 1,
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
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
