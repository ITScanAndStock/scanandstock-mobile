// Never below 800 ms: expo-camera drops a repeated event for 500 ms (EventThrottleMs), so a still code shows such gaps.
export const REARM_DELAY_MS = 1000;
// Longer than the gaps a hand-held phone leaves with the code in view, so a cancel stays a cancel.
export const CANCELLED_REARM_DELAY_MS = 3000;
// Longer than the time Android leaves one code of a two-code box unreported, so a box still counts as one.
export const GROUP_HOLD_MAX_MS = 6000;

const FRAMES_TO_SEND = 3;
const MIN_CODE_LENGTH = 4;
const MAX_CODE_LENGTH = 100;

const normalize = (raw: string) => raw.replace(/\x1D/g, "$");

type Hold = { groupLastSeen: number; ownLastSeen: number; delay: number; group: number };

export type ScanDecision = { kind: "send"; code: string } | { kind: "ignore"; reason?: "invalid" };

export type ScanGate = {
  frame: (raw: string, now: number) => ScanDecision;
  sendFinished: (ok: boolean) => void;
  alertOpened: () => void;
  alertCancelled: (now: number) => void;
  alertForced: (now: number) => void;
  cameraClosed: (now: number) => void;
  cameraReopened: () => void;
  badgeConnected: (raw: string, now: number) => void;
  isBusy: () => boolean;
};

export function createScanGate(): ScanGate {
  let candidate: string | null = null;
  let count = 0;
  let busy = false;
  let alertOpen = false;
  // Android reports one code per frame, so a frame of any code of a box extends the whole group's hold.
  const held = new Map<string, Hold>();
  let lastSent: string | null = null;
  let nextGroupId = 0;
  let badgeGroup: number | null = null;
  let awaitingFirstFrame = false;
  let closedAt: number | null = null;
  let closed = false;

  const groupForNewHold = () => {
    let freshest: Hold | null = null;
    for (const hold of held.values()) {
      if (hold.group === badgeGroup) {
        continue;
      }
      if (!freshest || hold.groupLastSeen > freshest.groupLastSeen) {
        freshest = hold;
      }
    }
    return freshest?.group ?? ++nextGroupId;
  };

  const holdAlertGroupFrom = (now: number, delay: number) => {
    if (lastSent !== null) {
      const group = held.get(lastSent)?.group ?? groupForNewHold();
      for (const member of held.values()) {
        if (member.group === group) {
          member.groupLastSeen = now;
          member.ownLastSeen = now;
        }
      }
      held.set(lastSent, { groupLastSeen: now, ownLastSeen: now, delay, group });
    }
  };

  const forgetExpiredHolds = (now: number) => {
    const alertGroup = alertOpen && lastSent !== null ? held.get(lastSent)?.group : undefined;
    for (const [heldCode, { groupLastSeen, ownLastSeen, delay, group }] of held) {
      const expired = now - groupLastSeen >= delay || now - ownLastSeen >= GROUP_HOLD_MAX_MS;
      if (group !== alertGroup && expired) {
        held.delete(heldCode);
      }
    }
  };

  const resetCount = () => {
    candidate = null;
    count = 0;
  };

  return {
    frame: (raw, now) => {
      const code = normalize(raw);
      if (code.length < MIN_CODE_LENGTH || code.length > MAX_CODE_LENGTH) {
        return { kind: "ignore", reason: "invalid" };
      }

      if (awaitingFirstFrame) {
        awaitingFirstFrame = false;
        // The first frame comes well after open() and onCameraReady, so closed-camera time lasts until it.
        for (const hold of held.values()) {
          hold.groupLastSeen = Math.max(hold.groupLastSeen, now);
          hold.ownLastSeen = Math.max(hold.ownLastSeen, now);
        }
      }
      forgetExpiredHolds(now);
      const hold = held.get(code);
      if (hold) {
        for (const member of held.values()) {
          if (member.group === hold.group) {
            member.groupLastSeen = now;
          }
        }
        hold.ownLastSeen = now;
        resetCount();
        return { kind: "ignore" };
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
      held.set(code, { groupLastSeen: now, ownLastSeen: now, delay: REARM_DELAY_MS, group: groupForNewHold() });
      lastSent = code;
      return { kind: "send", code };
    },
    sendFinished: () => {
      busy = false;
    },
    alertOpened: () => {
      busy = false;
      alertOpen = true;
    },
    alertCancelled: (now) => {
      if (alertOpen) {
        holdAlertGroupFrom(now, CANCELLED_REARM_DELAY_MS);
      }
      alertOpen = false;
    },
    alertForced: (now) => {
      if (alertOpen) {
        holdAlertGroupFrom(now, REARM_DELAY_MS);
      }
      alertOpen = false;
      busy = true;
    },
    cameraClosed: (now) => {
      if (!closed && !awaitingFirstFrame) {
        closedAt = now;
      }
      closed = true;
    },
    cameraReopened: () => {
      closed = false;
      resetCount();
      if (closedAt !== null) {
        forgetExpiredHolds(closedAt);
      }
      awaitingFirstFrame = true;
    },
    badgeConnected: (raw, now) => {
      // A badge is never part of a box: its own group, which no product joins, so it never holds one.
      badgeGroup = ++nextGroupId;
      held.set(normalize(raw), { groupLastSeen: now, ownLastSeen: now, delay: REARM_DELAY_MS, group: badgeGroup });
    },
    isBusy: () => busy || alertOpen,
  };
}
