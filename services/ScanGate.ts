// Never below 800 ms: expo-camera drops a repeated event for 500 ms (EventThrottleMs), so a still code shows such gaps.
export const REARM_DELAY_MS = 1000;

const FRAMES_TO_SEND = 3;
const MIN_CODE_LENGTH = 4;
const MAX_CODE_LENGTH = 100;

export type ScanDecision = { kind: "send"; code: string } | { kind: "ignore"; reason?: "invalid" };

export type ScanGate = {
  frame: (raw: string, now: number) => ScanDecision;
  sendFinished: (ok: boolean) => void;
  alertOpened: () => void;
  alertCancelled: () => void;
  alertForced: () => void;
  cameraReopened: (now: number) => void;
  isBusy: () => boolean;
};

export function createScanGate(): ScanGate {
  let candidate: string | null = null;
  let count = 0;
  let busy = false;
  let alertOpen = false;
  let held: string | null = null;
  let heldLastSeen = 0;

  const resetCount = () => {
    candidate = null;
    count = 0;
  };

  return {
    frame: (raw, now) => {
      const code = raw.replace(/\x1D/g, "$");
      if (code.length < MIN_CODE_LENGTH || code.length > MAX_CODE_LENGTH) {
        return { kind: "ignore", reason: "invalid" };
      }

      if (code === held) {
        const absentLongEnough = now - heldLastSeen >= REARM_DELAY_MS;
        heldLastSeen = now;
        if (absentLongEnough) {
          held = null;
        } else {
          resetCount();
          return { kind: "ignore" };
        }
      }

      if (busy || alertOpen) {
        resetCount();
        return { kind: "ignore" };
      }

      if (code === candidate) {
        count += 1;
      } else {
        candidate = code;
        count = 1;
      }
      if (count < FRAMES_TO_SEND) {
        return { kind: "ignore" };
      }
      resetCount();
      busy = true;
      held = code;
      heldLastSeen = now;
      return { kind: "send", code };
    },
    sendFinished: () => {
      busy = false;
    },
    alertOpened: () => {
      busy = false;
      alertOpen = true;
    },
    alertCancelled: () => {
      alertOpen = false;
    },
    alertForced: () => {
      alertOpen = false;
      busy = true;
    },
    cameraReopened: (now) => {
      resetCount();
      heldLastSeen = Math.max(heldLastSeen, now);
    },
    isBusy: () => busy || alertOpen,
  };
}
