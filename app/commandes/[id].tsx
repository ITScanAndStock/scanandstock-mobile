import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import ChevronLeft from "@/assets/images/figma/chevron-left.svg";
import InfoIcon from "@/assets/images/figma/info.svg";
import ScanReceiveIcon from "@/assets/images/figma/scan-receive.svg";
import CommandeLigneCard from "@/components/ui-components/CommandeLigneCard";
import { colors } from "@/constants/colors";
import { getCommandeById } from "@/data/mockCommandes";
import {
  COMMANDE_STATUS_LABEL,
  CommandeStatus,
  formatCommandeAmount,
  formatCommandeTitle,
  getCommandeProgress,
} from "@/model/Commande";
import AuthService from "@/services/AuthService";

const STATUS_STYLES: Record<CommandeStatus, { backgroundColor: string; color: string }> = {
  en_cours: {
    backgroundColor: colors.STATUS_EN_COURS_BG,
    color: colors.STATUS_EN_COURS_TEXT,
  },
  partielle: {
    backgroundColor: colors.STATUS_PARTIELLE_BG,
    color: colors.STATUS_PARTIELLE_TEXT,
  },
  receptionnee: {
    backgroundColor: colors.STATUS_RECEPTIONNEE_BG,
    color: colors.STATUS_RECEPTIONNEE_TEXT,
  },
  annulee: {
    backgroundColor: colors.BORDER,
    color: colors.MUTED,
  },
};

export default function CommandeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commande = getCommandeById(Array.isArray(id) ? id[0] : id);
  const [canReceive, setCanReceive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AuthService.canReceiveCommandes().then((allowed) => {
      if (!cancelled) {
        setCanReceive(allowed);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!commande) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Commande introuvable</Text>
        <Pressable onPress={() => router.back()} style={styles.missingBack}>
          <Text style={styles.missingBackText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const statusStyle = STATUS_STYLES[commande.status];
  const title = formatCommandeTitle(commande.orderedAt);
  const progress = getCommandeProgress(commande);
  const suppliersLine = `${commande.suppliers.join(", ")} · ${formatCommandeAmount(
    commande.totalAmount,
    commande.currency,
  )}`;

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Retour aux commandes"
          >
            <ChevronLeft width={20} height={20} accessible={false} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: statusStyle.color }]}>
              {COMMANDE_STATUS_LABEL[commande.status]}
            </Text>
          </View>
        </View>

        <View style={styles.metaBlock}>
          <Text style={styles.metaLine}>{suppliersLine}</Text>
          <Text style={styles.metaLine}>Passée par {commande.orderedBy}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Reçus</Text>
            <Text style={styles.statValue}>
              {progress.receivedUnits} / {progress.orderedUnits}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Lignes terminées</Text>
            <Text style={styles.statValue}>
              {progress.completedLines} / {progress.totalLines}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={commande.lines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        renderItem={({ item }) => <CommandeLigneCard ligne={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <View style={styles.footer}>
        {canReceive ? (
          <Pressable
            style={styles.cta}
            onPress={() => router.push(`/commandes/reception/${commande.id}`)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Réceptionner en scannant"
            accessibilityHint="Ouvre la caméra pour réceptionner les produits"
          >
            <ScanReceiveIcon width={22} height={22} accessible={false} />
            <Text style={styles.ctaLabel}>Réceptionner en scannant</Text>
          </Pressable>
        ) : (
          <View
            style={styles.noRightBanner}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel="Vous pouvez consulter cette commande. La réception est réservée aux personnes habilitées de votre cabinet."
          >
            <InfoIcon width={20} height={20} accessible={false} />
            <Text style={styles.noRightText}>
              Vous pouvez consulter cette commande. La réception est réservée aux
              personnes habilitées de votre cabinet.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.SURFACE,
  },
  headerBlock: {
    backgroundColor: colors.DARK,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.PILL,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: colors.WHITE,
    fontSize: 20,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  badge: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  metaBlock: {
    opacity: 0.9,
  },
  metaLine: {
    color: colors.WHITE,
    fontSize: 13,
    lineHeight: 19.5,
    fontFamily: "Montserrat",
    fontWeight: "400",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.PILL,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statLabel: {
    color: colors.WHITE,
    opacity: 0.8,
    fontSize: 11,
    fontFamily: "Montserrat",
    fontWeight: "400",
  },
  statValue: {
    marginTop: 2,
    color: colors.WHITE,
    fontSize: 18,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  separator: {
    height: 10,
  },
  footer: {
    backgroundColor: colors.WHITE,
    borderTopWidth: 1,
    borderTopColor: colors.TAB_BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  cta: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.GREEN_DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaLabel: {
    color: colors.WHITE,
    fontSize: 16,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  noRightBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#EEF1F2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noRightText: {
    flex: 1,
    color: colors.BODY,
    fontSize: 13,
    lineHeight: 18.85,
    fontFamily: "Montserrat",
    fontWeight: "400",
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.SURFACE,
    gap: 16,
  },
  missingText: {
    color: colors.MUTED,
    fontSize: 16,
    fontFamily: "SemiBold",
  },
  missingBack: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.DARK,
  },
  missingBackText: {
    color: colors.WHITE,
    fontFamily: "SemiBold",
  },
});
