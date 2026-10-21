import { useAccount } from "@/context/AccountContext";
import BadgesScanned from "./ui-components/BadgeScanned";
import NoBadgeScanned from "./ui-components/NoBadgeScanned";

type ScanBadgeProps = {
  tone?: "default" | "overlay";
};

export default function ScanBadge({ tone = "default" }: ScanBadgeProps) {
  const { activeBadgeName, isLoading, isTracingEnabled } = useAccount();

  if (isLoading || isTracingEnabled !== true) {
    return null;
  }

  return activeBadgeName ? (
    <BadgesScanned name={activeBadgeName} tone={tone} />
  ) : (
    <NoBadgeScanned tone={tone} />
  );
}
