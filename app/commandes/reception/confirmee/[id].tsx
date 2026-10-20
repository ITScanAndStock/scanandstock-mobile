import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import CheckWhiteIcon from "@/assets/images/figma/check-white.svg";
import { colors } from "@/constants/colors";
import { getCommandeById } from "@/data/mockCommandes";
import {
  COMMANDE_STATUS_LABEL,
  CommandeStatus,
  formatCommandeTitle,
} from "@/model/Commande";

type SummaryItem = {
  designation: string;
  qty: number;
};

type ReceptionSummary = {
  total: number;
  remaining: number;
  status: CommandeStatus;
  items: SummaryItem[];
};

function parseSummary(raw: string | string[] | undefined): ReceptionSummary | null {
  if (!raw || Array.isArray(raw)) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as ReceptionSummary;
    if (
      typeof parsed.total !== "number" ||
      typeof parsed.remaining !== "number" ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function ReceptionConfirmee() {
  const { id, summary: summaryParam } = useLocalSearchParams<{
    id: string;
    summary?: string;
  }>();
  const commandeId = Array.isArray(id) ? id[0] : id;
  const commande = getCommandeById(commandeId);
  const summary = parseSummary(summaryParam);

  const title = commande
    ? formatCommandeTitle(commande.orderedAt)
    : "Commande";
  const status: CommandeStatus = summary?.status ?? "partielle";
  const total = summary?.total ?? 0;
  const remaining = summary?.remaining ?? 0;
  const items = summary?.items ?? [];

  const statusStyle =
    status === "receptionnee"
      ? {
          backgroundColor: colors.STATUS_RECEPTIONNEE_BG,
          color: colors.STATUS_RECEPTIONNEE_TEXT,
        }
      : {
          backgroundColor: colors.STATUS_PARTIELLE_BG,
          color: colors.STATUS_PARTIELLE_TEXT,
        };

  const goToCommande = () => {
    // Pop back to the existing detail — don't push a second one on the stack.
    router.dismissTo(`/commandes/${commandeId}`);
  };

  const goToCommandes = () => {
    // Pop back to the existing Commandes tab — don't open a fresh tabs stack.
    router.dismissTo("/(tabs)/commandes");
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconRing}>
          <View style={styles.iconCircle}>
            <CheckWhiteIcon width={48} height={48} accessible={false} />
          </View>
        </View>
        <Text style={styles.title}>Réception enregistrée</Text>
        <Text style={styles.subtitle}>
          {total} produit{total > 1 ? "s" : ""}{" "}
          {total > 1 ? "sont" : "est"} entré{total > 1 ? "s" : ""} en stock.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>{title}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: statusStyle.color }]}>
              {COMMANDE_STATUS_LABEL[status]}
            </Text>
          </View>
        </View>

        {items.map((item) => (
          <View key={`${item.designation}-${item.qty}`} style={styles.cardRowBordered}>
            <Text style={styles.cardLabel} numberOfLines={1}>
              {item.designation}
            </Text>
            <Text style={styles.cardValue}>+{item.qty}</Text>
          </View>
        ))}

        <View style={styles.cardRowBordered}>
          <Text style={styles.cardMuted}>Reste à recevoir</Text>
          <Text style={styles.cardMutedValue}>
            {remaining} produit{remaining > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.spacer} />

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryBtn}
          onPress={goToCommande}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Voir la commande"
        >
          <Text style={styles.primaryLabel}>Voir la commande</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={goToCommandes}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Retour aux commandes"
        >
          <Text style={styles.secondaryLabel}>Retour aux commandes</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.SURFACE,
    paddingHorizontal: 20,
    // Root already reserves status-bar space — match Figma breathing room under it.
    paddingTop: 42,
    paddingBottom: 12,
  },
  hero: {
    alignItems: "center",
    gap: 14,
    width: "100%",
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18,161,154,0.15)",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.GREEN_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 12,
    color: colors.DARK,
    fontSize: 22,
    fontFamily: "SemiBold",
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: colors.BODY,
    fontSize: 14,
    fontFamily: "Montserrat",
    textAlign: "center",
  },
  card: {
    marginTop: 22,
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.CARD_BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    gap: 12,
  },
  cardRowBordered: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER,
    gap: 12,
  },
  cardLabel: {
    flex: 1,
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "Montserrat",
  },
  cardValue: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  cardMuted: {
    flex: 1,
    color: colors.MUTED,
    fontSize: 14,
    fontFamily: "Montserrat",
  },
  cardMutedValue: {
    color: colors.MUTED,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  badge: {
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  spacer: {
    flex: 1,
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.GREEN_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    color: colors.WHITE,
    fontSize: 16,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  secondaryBtn: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD3D7",
    backgroundColor: colors.WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
});
