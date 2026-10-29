import { useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LockIcon from "../assets/images/figma/lock.svg";
import LogoutIcon from "../assets/images/figma/logout.svg";
import { colors } from "../constants/colors";
import { isTablet } from "../constants/layout";
import { useAccount } from "../context/AccountContext";
import { useScanCamera } from "../context/ScanCameraContext";
import { useIsLandscape } from "../hooks/useIsLandscape";
import { useLogout } from "../hooks/useLogout";
import { Account } from "../model/Account";
import { accountInitials } from "../services/AccountInitials";
import { NavigationEntry } from "../services/NavigationEntries";
import ToastService from "../services/ToastService";
import AccountOption, { accountListStyles } from "./AccountOption";
import { tabTarget, type TabBarIcons } from "./TabBar";

const RAIL_WIDTH = 96;
const FOOTER_BUTTON_SIZE = 48;
const LOGOUT_EXTRA_GAP = 6;
const ACCOUNT_LIST_MAX_HEIGHT = 320;

const LANDSCAPE = { entryHeight: 62, gap: 6, paddingTop: 22, paddingBottom: 18, logoGap: 14 };
const PORTRAIT = { entryHeight: 64, gap: 8, paddingTop: 28, paddingBottom: 24, logoGap: 18 };

type SideRailProps = BottomTabBarProps & {
  entries: readonly NavigationEntry[];
  icons: TabBarIcons;
};

export function useScreenLeftInset() {
  const insets = useSafeAreaInsets();
  return isTablet() ? RAIL_WIDTH + insets.left : 0;
}

export default function SideRail({ state, navigation, entries, icons }: SideRailProps) {
  const { isCameraOpen, homeOpacity } = useScanCamera();
  const { accounts, activeAccount, setActiveAccount } = useAccount();
  const handleLogout = useLogout();
  const insets = useSafeAreaInsets();
  const leftInset = useScreenLeftInset();
  const metrics = useIsLandscape() ? LANDSCAPE : PORTRAIT;
  const [isAccountListOpen, setAccountListOpen] = useState(false);
  const paddingBottom = metrics.paddingBottom + insets.bottom;

  const chooseAccount = (account: Account) => {
    setActiveAccount(account);
    setAccountListOpen(false);
  };

  const accountLabel = activeAccount
    ? `Changer de compte, compte actif : ${activeAccount.name}`
    : "Changer de compte";

  return (
    <Animated.View
      style={[
        styles.rail,
        {
          width: leftInset,
          paddingLeft: insets.left,
          paddingTop: metrics.paddingTop,
          paddingBottom,
          gap: metrics.gap,
          opacity: homeOpacity,
        },
      ]}
      pointerEvents={isCameraOpen ? "none" : "auto"}
      importantForAccessibility={isCameraOpen ? "no-hide-descendants" : "auto"}
      accessibilityElementsHidden={isCameraOpen}
    >
      <Image
        source={require("../assets/images/logo-white.png")}
        style={[styles.logo, { marginBottom: metrics.logoGap }]}
        resizeMode="contain"
        accessible={false}
      />

      <ScrollView
        style={styles.entries}
        contentContainerStyle={[styles.entriesContent, { gap: metrics.gap }]}
        showsVerticalScrollIndicator={false}
        accessibilityRole="tablist"
      >
        {entries.map((entry) => {
          const Icon = icons[entry.icon];

          if (entry.state === "locked") {
            return (
              <Pressable
                key={entry.key}
                onPress={() => ToastService.info("Bientôt disponible", entry.label)}
                style={[styles.entry, { height: metrics.entryHeight }]}
                accessibilityRole="tab"
                accessibilityLabel={entry.label}
                accessibilityHint="Bientôt disponible"
                accessibilityState={{ disabled: true, selected: false }}
              >
                <View>
                  <Icon width={24} height={24} color={colors.RAIL_MUTED} style={styles.dimmed} accessible={false} />
                  <LockIcon width={12} height={12} color={colors.RAIL_MUTED} style={styles.lock} accessible={false} />
                </View>
                <Text style={[styles.label, styles.dimmed, { color: colors.RAIL_MUTED }]}>{entry.label}</Text>
              </Pressable>
            );
          }

          const target = tabTarget({ state, navigation }, entry);
          if (!target) {
            return null;
          }
          const { isFocused, onPress } = target;

          return (
            <Pressable
              key={entry.key}
              onPress={onPress}
              style={[styles.entry, { height: metrics.entryHeight }, isFocused && styles.entryFocused]}
              accessibilityRole="tab"
              accessibilityLabel={entry.label}
              accessibilityState={{ selected: isFocused }}
            >
              <Icon
                width={24}
                height={24}
                color={isFocused ? colors.BADGE_AVATAR : colors.RAIL_MUTED}
                accessible={false}
              />
              <Text style={[styles.label, { color: isFocused ? colors.WHITE : colors.RAIL_MUTED }]}>{entry.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => setAccountListOpen(true)}
        style={[styles.footerButton, styles.account]}
        accessibilityRole="button"
        accessibilityLabel={accountLabel}
        accessibilityState={{ expanded: isAccountListOpen }}
      >
        <Text style={styles.initials}>{accountInitials(activeAccount?.name)}</Text>
      </Pressable>

      <Pressable
        onPress={handleLogout}
        style={[styles.footerButton, styles.logout]}
        accessibilityRole="button"
        accessibilityLabel="Se déconnecter"
      >
        <LogoutIcon width={22} height={22} accessible={false} />
      </Pressable>

      <Modal
        visible={isAccountListOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setAccountListOpen(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setAccountListOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Fermer la liste des comptes"
        />
        <ScrollView
          style={[
            accountListStyles.list,
            styles.accountList,
            {
              left: leftInset + 8,
              bottom: paddingBottom + FOOTER_BUTTON_SIZE + metrics.gap + LOGOUT_EXTRA_GAP,
            },
          ]}
          accessibilityRole="radiogroup"
          accessibilityLabel="Comptes"
        >
          {accounts.map((account) => (
            <AccountOption
              key={account.id}
              account={account}
              isSelected={account.id === activeAccount?.id}
              onChoose={chooseAccount}
            />
          ))}
        </ScrollView>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    backgroundColor: colors.RAIL_BG,
  },
  logo: {
    width: 72,
    height: 72,
  },
  entries: {
    flex: 1,
    alignSelf: "stretch",
  },
  entriesContent: {
    alignItems: "center",
  },
  entry: {
    width: 76,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  entryFocused: {
    backgroundColor: colors.RAIL_ACTIVE_BG,
  },
  dimmed: {
    opacity: 0.4,
  },
  lock: {
    position: "absolute",
    top: -6,
    right: -8,
  },
  label: {
    fontSize: 11,
    fontFamily: "SemiBold",
  },
  footerButton: {
    width: FOOTER_BUTTON_SIZE,
    height: FOOTER_BUTTON_SIZE,
    borderRadius: FOOTER_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  account: {
    backgroundColor: colors.BADGE_AVATAR,
  },
  initials: {
    color: colors.AVATAR_TEXT,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  logout: {
    marginTop: LOGOUT_EXTRA_GAP,
    backgroundColor: colors.RAIL_BUTTON,
  },
  accountList: {
    position: "absolute",
    maxHeight: ACCOUNT_LIST_MAX_HEIGHT,
  },
});
