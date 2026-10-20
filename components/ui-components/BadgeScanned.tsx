import { colors } from "@/constants/colors";
import { useAccount } from "@/context/AccountContext";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface BadgesScannedProps {
  name: string;
  /** Darker chip for camera overlay (matches account pill). */
  tone?: "default" | "overlay";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return name;
}

export default function BadgesScanned({ name, tone = "default" }: BadgesScannedProps) {
  const { resetBadge } = useAccount();

  return (
    <Pressable
      onPress={resetBadge}
      style={[styles.container, tone === "overlay" && styles.containerOverlay]}
      accessible={true}
      accessibilityLabel={`Badge connecté : ${name}, appuyer pour changer`}
      accessibilityRole="button"
      accessibilityHint="Appuyez pour vous déconnecter du badge"
    >
      <View style={styles.avatar}>
        <Text style={styles.initials}>{getInitials(name)}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {shortName(name)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 22,
    backgroundColor: colors.PILL,
  },
  containerOverlay: {
    backgroundColor: "rgba(22,30,34,0.72)",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.BADGE_AVATAR,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.DARK,
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  name: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "600",
    maxWidth: 100,
  },
});
