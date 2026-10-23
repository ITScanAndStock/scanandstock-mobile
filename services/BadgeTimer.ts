export const BADGE_DURATION_MS = 60_000;
// A foreground timer fires on time, so a later removal means the phone slept and nobody is there to read a toast.
export const LATE_REMOVAL_MS = 5000;

export type RemoveScope = "all" | "memory";

type BadgeTimerOptions = {
  durationMs: number;
  now: () => number;
  remove: (scope: RemoveScope) => Promise<boolean>;
  confirm: () => void;
};

export type BadgeTimer = {
  badgeConnected: () => void;
  isBadgeValid: () => boolean;
  scanSent: () => void;
  removeManually: () => Promise<void>;
  cancel: () => void;
};

export function createBadgeTimer({ durationMs, now, remove, confirm }: BadgeTimerOptions): BadgeTimer {
  let connected = false;
  let deadline = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const disconnect = () => {
    clearTimer();
    const wasConnected = connected;
    connected = false;
    return wasConnected;
  };

  const removeAtDeadline = async () => {
    disconnect();
    const late = now() - deadline >= LATE_REMOVAL_MS;
    if ((await remove("all")) && !late) {
      confirm();
    }
  };

  const arm = () => {
    clearTimer();
    deadline = now() + durationMs;
    timer = setTimeout(() => void removeAtDeadline(), durationMs);
  };

  const isBadgeValid = () => {
    if (!connected) {
      return false;
    }
    if (now() < deadline) {
      return true;
    }
    void removeAtDeadline();
    return false;
  };

  return {
    badgeConnected: () => {
      connected = true;
      arm();
    },
    isBadgeValid,
    scanSent: () => {
      if (isBadgeValid()) {
        arm();
      }
    },
    removeManually: async () => {
      if (disconnect() && (await remove("all"))) {
        confirm();
      }
    },
    cancel: () => {
      if (disconnect()) {
        void remove("memory");
      }
    },
  };
}
