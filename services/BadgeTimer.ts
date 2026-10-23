export const BADGE_DURATION_MS = 60_000;
export const BADGE_DEADLINE_KEY = "badge_deadline";
// A foreground timer fires on time, so a later removal means the phone slept and nobody is there to read a toast.
export const LATE_REMOVAL_MS = 5000;

export type RemoveScope = "all" | "memory";

type BadgeTimerOptions = {
  durationMs: number;
  now: () => number;
  remove: (scope: RemoveScope) => Promise<boolean>;
  confirm: () => void;
  saveDeadline: (deadline: number) => void;
};

export type BadgeTimer = {
  badgeConnected: (storedDeadline?: number) => void;
  isBadgeValid: () => boolean;
  scanSent: () => void;
  removeManually: () => Promise<void>;
  cancel: () => void;
};

export function parseStoredDeadline(value: string | null): number {
  const deadline = Number(value);
  return Number.isFinite(deadline) ? deadline : 0;
}

export function createBadgeTimer({ durationMs, now, remove, confirm, saveDeadline }: BadgeTimerOptions): BadgeTimer {
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

  const arm = (remainingMs: number) => {
    clearTimer();
    deadline = now() + remainingMs;
    timer = setTimeout(() => void removeAtDeadline(), remainingMs);
    try {
      saveDeadline(deadline);
    } catch (error) {
      if (__DEV__) {
        console.error("Erreur enregistrement échéance du badge:", error);
      }
    }
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
    badgeConnected: (storedDeadline) => {
      const remainingMs = storedDeadline === undefined ? durationMs : Math.min(durationMs, storedDeadline - now());
      if (remainingMs <= 0) {
        disconnect();
        void remove("all");
        return;
      }
      connected = true;
      arm(remainingMs);
    },
    isBadgeValid,
    scanSent: () => {
      if (isBadgeValid()) {
        arm(durationMs);
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
