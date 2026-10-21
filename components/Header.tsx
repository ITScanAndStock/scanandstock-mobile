// import react native
import { Pressable, StyleSheet, View } from "react-native";

// import svg and icons
import LogoutIcon from "../assets/images/figma/logout.svg";
import Logo from "../assets/images/logo.svg";

// import constants
import { colors } from "../constants/colors";
import { useAccount } from "../context/AccountContext";
import { useAuth } from "../context/AuthContext";

// header of the application
export default function Header() {
  const { logout } = useAuth();
  const { resetAccount } = useAccount();

  const handleLogout = () => {
    resetAccount();
    logout();
  };

  return (
    <View style={styles.container}>
      <Logo width={108} height={40} accessible={false} />

      <Pressable
        onPress={handleLogout}
        style={styles.logoutBtn}
        accessible={true}
        accessibilityLabel="Déconnexion"
        accessibilityRole="button"
        accessibilityHint="Appuyez pour vous déconnecter"
      >
        <LogoutIcon width={22} height={22} accessible={false} />
      </Pressable>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: colors.DARK,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.PILL,
    alignItems: "center",
    justifyContent: "center",
  },
});
