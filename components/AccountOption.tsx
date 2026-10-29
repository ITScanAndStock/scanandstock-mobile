import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { colors } from "../constants/colors";
import { Account } from "../model/Account";

type AccountOptionProps = {
  account: Account;
  isSelected: boolean;
  onChoose: (account: Account) => void;
};

export default function AccountOption({ account, isSelected, onChoose }: AccountOptionProps) {
  return (
    <TouchableOpacity
      onPress={() => onChoose(account)}
      style={styles.item}
      accessible={true}
      accessibilityRole="radio"
      accessibilityLabel={account.name}
      accessibilityState={{ selected: isSelected, checked: isSelected }}
      accessibilityHint="Appuyez pour changer de compte"
    >
      <Text style={styles.itemText} numberOfLines={1}>
        {account.name}
      </Text>
    </TouchableOpacity>
  );
}

export const accountListStyles = StyleSheet.create({
  list: {
    width: 240,
    backgroundColor: colors.MUTED,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.DARK,
    paddingVertical: 4,
  },
});

const styles = StyleSheet.create({
  itemText: {
    flexShrink: 1,
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 20,
  },
});
