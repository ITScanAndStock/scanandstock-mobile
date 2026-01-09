import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../constants/colors";
import { useAccount } from "../context/AccountContext";
import { Account } from "../model/Account";

export default function ChoosAccount() {
  const { accounts, activeAccount, setActiveAccount } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const chooseAccount = (account: Account) => {
    setActiveAccount(account);
    toggleDropdown();
  };

  const toggleDropdown = () => {
    const toValue = isOpen ? 0 : 1;

    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setIsOpen(!isOpen);
  };

  const dropdownHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, accounts.length * 50],
  });

  // Rotation de la flèche
  const rotateIcon = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.mainBtn}
        onPress={toggleDropdown}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Compte actif: ${activeAccount?.name}`}
        accessibilityHint={`Appuyez pour ${
          isOpen ? "fermer" : "ouvrir"
        } la liste des comptes`}
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={styles.text}>{activeAccount?.name}</Text>
        <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
          <Ionicons
            name="chevron-down"
            size={24}
            color={colors.WHITE}
            accessible={false}
          />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.dropdownContainer,
          { height: dropdownHeight, overflow: "hidden" },
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
              <Text style={styles.text}>{item.name}</Text>
              {isSelected ? (
                <Ionicons
                  name="radio-button-on"
                  size={24}
                  color={colors.WHITE}
                  accessible={false}
                />
              ) : (
                <Ionicons
                  name="radio-button-off"
                  size={24}
                  color={colors.WHITE}
                  accessible={false}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: "50%",
    backgroundColor: colors.DARK,
    position: "absolute",
    top: 1,
    left: 0,
    borderBottomRightRadius: 10,
    zIndex: 3,
  },
  mainBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
  },
  dropdownContainer: {
    backgroundColor: colors.DARK,
    borderBottomRightRadius: 10,
  },
  text: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  items: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 20,
  },
});
