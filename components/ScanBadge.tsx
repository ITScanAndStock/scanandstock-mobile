import { useAccount } from "@/context/AccountContext";
import BadgesScanned from "./ui-components/BadgeScanned";
import NoBadgeScanned from "./ui-components/NoBadgeScanned";

type ScanBadgeProps = {
  tone?: "default" | "overlay";
};

export default function ScanBadge({ tone = "default" }: ScanBadgeProps) {
  const { activeBadgeName } = useAccount();

  return activeBadgeName ? (
    <BadgesScanned name={activeBadgeName} tone={tone} />
  ) : (
    <NoBadgeScanned tone={tone} />
  );
}
