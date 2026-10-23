import { describe, expect, it } from "vitest";
import {
  CANCELLED_REARM_DELAY_MS,
  createScanGate,
  GROUP_HOLD_MAX_MS,
  REARM_DELAY_MS,
  type ScanDecision,
  type ScanGate,
} from "../ScanGate";

const FRAME_STEP_MS = 100;
const SEND_DURATION_MS = 300;

function frames(gate: ScanGate, code: string, from: number, count: number) {
  const decisions: ScanDecision[] = [];
  for (let i = 0; i < count; i++) {
    decisions.push(gate.frame(code, from + i * FRAME_STEP_MS));
  }
  return decisions;
}

type ScanOptions = { step?: number; finishAfter?: number; ok?: boolean };

function scanCodes(gate: ScanGate, codeAt: (i: number) => string, from: number, to: number, options: ScanOptions = {}) {
  const { step = FRAME_STEP_MS, finishAfter = SEND_DURATION_MS, ok = true } = options;
  const sent: string[] = [];
  let finishAt: number | null = null;
  for (let t = from, i = 0; t <= to; t += step, i++) {
    if (finishAt !== null && t >= finishAt) {
      gate.sendFinished(ok);
      finishAt = null;
    }
    const decision = gate.frame(codeAt(i), t);
    if (decision.kind === "send") {
      sent.push(`${decision.code}@${t}`);
      finishAt = t + finishAfter;
    }
  }
  return sent;
}

function scan(gate: ScanGate, code: string, from: number, to: number, options: ScanOptions = {}) {
  return scanCodes(gate, () => code, from, to, options).map((sent) => Number(sent.split("@")[1]));
}

function sends(decisions: ScanDecision[]) {
  return decisions.filter((decision) => decision.kind === "send");
}

function alternate(gate: ScanGate, codes: string[], from: number, to: number) {
  const decisions: ScanDecision[] = [];
  for (let t = from, i = 0; t <= to; t += FRAME_STEP_MS, i++) {
    decisions.push(gate.frame(codes[i % codes.length], t));
  }
  return decisions;
}

describe("ScanGate", () => {
  it("sends a code on its 3rd consecutive frame, not before (catches: send on the 2nd)", () => {
    const gate = createScanGate();

    const decisions = frames(gate, "AAAA", 0, 3);

    expect(decisions.map((decision) => decision.kind)).toEqual(["ignore", "ignore", "send"]);
    expect(decisions[2]).toEqual({ kind: "send", code: "AAAA" });
  });

  it("sends nothing on A, A, B, A (catches: count not reset to 1 by another code)", () => {
    const gate = createScanGate();

    const decisions = ["AAAA", "AAAA", "BBBB", "AAAA"].map((code, i) => gate.frame(code, i * FRAME_STEP_MS));

    expect(sends(decisions)).toEqual([]);
  });

  it("sends B on its 3rd frame after A, B, B, B (catches: another code resets the count to 0)", () => {
    const gate = createScanGate();

    const decisions = ["AAAA", "BBBB", "BBBB", "BBBB"].map((code, i) => gate.frame(code, i * FRAME_STEP_MS));

    expect(decisions[3]).toEqual({ kind: "send", code: "BBBB" });
  });

  it("keeps the count across an invalid code: A, A, 3-char code, A sends (catches: invalid code resets the count)", () => {
    const gate = createScanGate();

    const decisions = ["AAAA", "AAAA", "XYZ", "AAAA"].map((code, i) => gate.frame(code, i * FRAME_STEP_MS));

    expect(decisions[3]).toEqual({ kind: "send", code: "AAAA" });
  });

  it("ignores 3- and 101-char codes as invalid, accepts 4 and 100 (catches: bounds off by one)", () => {
    const gate = createScanGate();

    expect(gate.frame("x".repeat(3), 0)).toEqual({ kind: "ignore", reason: "invalid" });
    expect(gate.frame("x".repeat(101), 100)).toEqual({ kind: "ignore", reason: "invalid" });
    expect(sends(frames(gate, "y".repeat(4), 200, 3))).toEqual([{ kind: "send", code: "y".repeat(4) }]);
    gate.sendFinished(true);
    expect(sends(frames(gate, "z".repeat(100), 500, 3))).toEqual([{ kind: "send", code: "z".repeat(100) }]);
  });

  it("sends a raw code with \\x1D as $ (catches: no cleaning)", () => {
    const gate = createScanGate();

    const decisions = frames(gate, "01\x1D21AB", 0, 3);

    expect(decisions[2]).toEqual({ kind: "send", code: "01$21AB" });
  });

  it("is busy between a send and sendFinished only", () => {
    const gate = createScanGate();

    frames(gate, "AAAA", 0, 2);
    expect(gate.isBusy()).toBe(false);
    gate.frame("AAAA", 200);
    expect(gate.isBusy()).toBe(true);
    gate.sendFinished(true);
    expect(gate.isBusy()).toBe(false);
  });

  it("does not count frames during a send: B sends on its 3rd frame after the release (catches: count rises during the lock)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);

    const during = frames(gate, "BBBB", 300, 3);
    gate.sendFinished(true);
    const after = frames(gate, "BBBB", 600, 3);

    expect(sends(during)).toEqual([]);
    expect(after.map((decision) => decision.kind)).toEqual(["ignore", "ignore", "send"]);
  });

  it("holds a code still in view 5 s after its send (catches: back to a fixed 2 s delay)", () => {
    const gate = createScanGate();

    expect(scan(gate, "AAAA", 0, 5200)).toEqual([200]);
  });

  it("holds a code through a slow send: sendFinished 3 s later, frames 2 s more (catches: frames during the send do not extend the hold)", () => {
    const gate = createScanGate();

    expect(scan(gate, "AAAA", 0, 200 + 3000 + 2000, { finishAfter: 3000 })).toEqual([200]);
  });

  it("re-arms a held code after an absence of exactly REARM_DELAY_MS, not 1 ms less (catches: > instead of >=, or a shifted delay)", () => {
    const rearmed = createScanGate();
    const stillHeld = createScanGate();
    const lastFrame = 200 + 500;

    expect(scan(rearmed, "AAAA", 0, lastFrame)).toEqual([200]);
    expect(scan(stillHeld, "AAAA", 0, lastFrame)).toEqual([200]);

    const back = lastFrame + REARM_DELAY_MS;
    expect(scan(rearmed, "AAAA", back, back + 200)).toEqual([back + 200]);
    expect(scan(stillHeld, "AAAA", back - 1, back - 1 + 200)).toEqual([]);
  });

  it("keeps holding a code seen every 500 ms, the expo-camera throttle gap (catches: REARM_DELAY_MS under 500 ms)", () => {
    const gate = createScanGate();

    expect(scan(gate, "AAAA", 0, 500)).toEqual([200]);
    expect(scan(gate, "AAAA", 1000, 5500, { step: 500 })).toEqual([]);
  });

  it("keeps REARM_DELAY_MS at 800 ms or more (catches: constant lowered under the bound)", () => {
    expect(REARM_DELAY_MS).toBeGreaterThanOrEqual(800);
  });

  it("holds a code after a failed send (catches: a failure clears the hold)", () => {
    const gate = createScanGate();

    expect(scan(gate, "AAAA", 0, 5200, { ok: false })).toEqual([200]);
  });

  it("sends another code 3 frames after a finished send, without waiting for the hold (catches: the hold also blocks another code)", () => {
    const gate = createScanGate();

    expect(scan(gate, "AAAA", 0, 500)).toEqual([200]);
    expect(scan(gate, "BBBB", 600, 800)).toEqual([800]);
  });

  it("sends each code of a two-code box once while the camera switches between them every 3 frames (catches: sending B releases A)", () => {
    const gate = createScanGate();

    const sent = scanCodes(gate, (i) => (Math.floor(i / 3) % 2 === 0 ? "AAAA" : "BBBB"), 0, 6000);

    expect(sent).toEqual(["AAAA@200", "BBBB@1100"]);
  });

  it("keeps holding a code of a two-code box while the camera only reports the other one for 5 s (catches: a frame only extends its own code)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 500)).toEqual([200]);
    expect(scan(gate, "BBBB", 600, 900)).toEqual([800]);
    gate.sendFinished(true);

    expect(scan(gate, "AAAA", 1000, 6000)).toEqual([]);
    expect(scan(gate, "BBBB", 6100, 6500)).toEqual([]);
  });

  it("re-sends a code held only by its group GROUP_HOLD_MAX_MS after its own last frame, not 1 ms less (catches: no cap on a group hold, or > instead of >=)", () => {
    const rearmed = createScanGate();
    const stillHeld = createScanGate();
    const lastOwnFrame = 900;
    for (const gate of [rearmed, stillHeld]) {
      expect(scan(gate, "LLLL", 0, 500)).toEqual([200]);
      expect(scan(gate, "BBBB", 600, lastOwnFrame)).toEqual([800]);
      gate.sendFinished(true);
    }

    const back = lastOwnFrame + GROUP_HOLD_MAX_MS;
    expect(scan(rearmed, "LLLL", lastOwnFrame + 100, back - 100)).toEqual([]);
    expect(scan(stillHeld, "LLLL", lastOwnFrame + 100, back - 101)).toEqual([]);
    expect(scan(rearmed, "BBBB", back, back + 200)).toEqual([back + 200]);
    expect(scan(stillHeld, "BBBB", back - 1, back - 1 + 200)).toEqual([]);
  });

  it("keeps holding across an invalid code between two held frames (catches: an invalid code clears the hold)", () => {
    const gate = createScanGate();

    expect(scan(gate, "AAAA", 0, 600)).toEqual([200]);
    gate.frame("XYZ", 700);
    expect(scan(gate, "AAAA", 800, 1200)).toEqual([]);
  });

  it("keeps the send lock across a camera reopening: 3 frames of B do not send before sendFinished (catches: reopening lifts the lock)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);

    gate.cameraClosed(300);
    gate.cameraReopened();
    const decisions = frames(gate, "BBBB", 500, 3);

    expect(sends(decisions)).toEqual([]);
    expect(gate.isBusy()).toBe(true);
  });

  it("does not count closed-camera time as absence: held code shown 300 ms after reopening is not sent (catches: closed time counts as absence)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 700)).toEqual([200]);

    const reopenedAt = 700 + 3000;
    gate.cameraClosed(800);
    gate.cameraReopened();

    expect(scan(gate, "AAAA", reopenedAt + 300, reopenedAt + 500)).toEqual([]);
  });

  it("does not count closed-camera time as absence for any held code: A then B sent, both shown 300 ms after reopening, none sent (catches: reopening only pushes the last code)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 700)).toEqual([200]);
    expect(scan(gate, "BBBB", 800, 1000)).toEqual([1000]);
    gate.sendFinished(true);

    const reopenedAt = 1000 + 3000;
    gate.cameraClosed(1100);
    gate.cameraReopened();

    expect(scan(gate, "AAAA", reopenedAt + 300, reopenedAt + 500)).toEqual([]);
    expect(scan(gate, "BBBB", reopenedAt + 600, reopenedAt + 800)).toEqual([]);
  });

  it("counts absence from the first frame after reopening: held code first seen 1600 ms after reopening is not sent (catches: absence counted from the reopening)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 700)).toEqual([200]);

    const reopenedAt = 700 + 3000;
    gate.cameraClosed(800);
    gate.cameraReopened();

    expect(scan(gate, "AAAA", reopenedAt + 1600, reopenedAt + 3000)).toEqual([]);
  });

  it("re-arms a held code absent REARM_DELAY_MS after the first frame following a reopening (catches: reopening holds the code forever)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 700)).toEqual([200]);

    const reopenedAt = 700 + 3000;
    gate.cameraClosed(800);
    gate.cameraReopened();
    const firstFrame = reopenedAt + 1600;
    expect(scan(gate, "AAAA", firstFrame, firstFrame)).toEqual([]);

    const back = firstFrame + REARM_DELAY_MS;
    expect(scan(gate, "AAAA", back, back + 200)).toEqual([back + 200]);
  });

  it("takes the first frame of any code as the camera restart: A held, B read 1600 ms after reopening, A seen 500 ms later is not sent (catches: only a frame of the held code marks the restart)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 700)).toEqual([200]);

    const reopenedAt = 700 + 3000;
    gate.cameraClosed(800);
    gate.cameraReopened();
    const firstFrame = reopenedAt + 1600;
    gate.frame("BBBB", firstFrame);

    expect(scan(gate, "AAAA", firstFrame + 500, firstFrame + 900)).toEqual([]);
  });

  it("forgets a hold that had already expired when the camera closed: A unseen 70 s camera open, closed, reopened, A sent on its 3rd frame (catches: reopening revives an expired hold)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 300)).toEqual([200]);
    gate.sendFinished(true);

    gate.cameraClosed(70000);
    gate.cameraReopened();
    const firstFrame = 70000 + 1600;

    expect(scan(gate, "AAAA", firstFrame, firstFrame + 200)).toEqual([firstFrame + 200]);
  });

  it("does not count a reopening that closes before its first frame: held code shown after the next reopening is not sent (catches: closing before any frame moves the closing time)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 700)).toEqual([200]);

    gate.cameraClosed(800);
    gate.cameraReopened();
    gate.cameraClosed(800 + 2200);
    gate.cameraReopened();
    const firstFrame = 800 + 2200 + 1000 + 1600;

    expect(scan(gate, "AAAA", firstFrame, firstFrame + 500)).toEqual([]);
  });

  it("keeps the first closing time when the camera is closed twice: held code shown after reopening is not sent (catches: a second close moves the closing time)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 700)).toEqual([200]);

    gate.cameraClosed(800);
    gate.cameraClosed(5000);
    gate.cameraReopened();
    const firstFrame = 5000 + 1600;

    expect(scan(gate, "AAAA", firstFrame, firstFrame + 500)).toEqual([]);
  });

  it("resets the count on reopening: A, A, reopen, A sends nothing (catches: reopening keeps the count)", () => {
    const gate = createScanGate();

    frames(gate, "AAAA", 0, 2);
    gate.cameraClosed(200);
    gate.cameraReopened();
    const decision = gate.frame("AAAA", 300);

    expect(decision.kind).toBe("ignore");
  });

  it("sends nothing during a 5 s alert, nor after cancelling with the conflicting code in view (catches: closing the alert clears the hold, or frames during the alert do not extend it)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);

    gate.alertOpened();
    const during = alternate(gate, ["AAAA", "BBBB", "BBBB", "BBBB"], 500, 5500);
    gate.alertCancelled(5500);
    const after = frames(gate, "AAAA", 5600, 10);

    expect(sends(during)).toEqual([]);
    expect(sends(after)).toEqual([]);
  });

  it("blocks on the alert alone, with no send in progress (catches: alertOpened does nothing)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);
    gate.sendFinished(true);

    gate.alertOpened();
    const during = alternate(gate, ["AAAA", "BBBB", "BBBB", "BBBB"], 500, 5500);
    gate.alertCancelled(5500);
    const after = frames(gate, "AAAA", 5600, 10);

    expect(sends(during)).toEqual([]);
    expect(sends(after)).toEqual([]);
  });

  it("sends B on its 3rd frame after the alert is cancelled (catches: the lock stays on)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);

    gate.alertOpened();
    gate.alertCancelled(500);
    const after = frames(gate, "BBBB", 600, 3);

    expect(after.map((decision) => decision.kind)).toEqual(["ignore", "ignore", "send"]);
  });

  it("ignores a stray sendFinished while the alert is open: 3 frames of B send nothing (catches: sendFinished lifts the lock during the alert)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);

    gate.alertOpened();
    gate.sendFinished(false);
    const decisions = frames(gate, "BBBB", 600, 3);

    expect(sends(decisions)).toEqual([]);
  });

  it("keeps the lock from alertForced to sendFinished, then sends B on its 3rd frame (catches: lock lifted when the alert closes)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);
    gate.alertOpened();

    gate.alertForced(500);
    const during = frames(gate, "BBBB", 600, 3);
    gate.sendFinished(true);
    const after = frames(gate, "BBBB", 1000, 3);

    expect(sends(during)).toEqual([]);
    expect(after.map((decision) => decision.kind)).toEqual(["ignore", "ignore", "send"]);
  });

  it("holds the forced code still in view after the forced send (catches: the forced send does not hold its code)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 5);
    gate.alertOpened();
    frames(gate, "AAAA", 500, 10);

    gate.alertForced(1450);
    const during = frames(gate, "AAAA", 1500, 3);
    gate.sendFinished(true);
    const after = frames(gate, "AAAA", 1800, 30);

    expect(sends([...during, ...after])).toEqual([]);
  });

  it("re-sends a cancelled code first seen CANCELLED_REARM_DELAY_MS after the cancel, not 1 ms less (catches: no own delay for a cancelled code, absence counted from its last frame, or > instead of >=)", () => {
    const rearmed = createScanGate();
    const stillHeld = createScanGate();
    const cancelledAt = 2000;
    for (const gate of [rearmed, stillHeld]) {
      frames(gate, "AAAA", 0, 3);
      gate.alertOpened();
      frames(gate, "AAAA", 300, 5);
      gate.alertCancelled(cancelledAt);
    }

    const back = cancelledAt + CANCELLED_REARM_DELAY_MS;
    expect(scan(rearmed, "AAAA", back, back + 200)).toEqual([back + 200]);
    expect(scan(stillHeld, "AAAA", back - 1, back - 1 + 200)).toEqual([]);
  });

  it("gives a cancelled code back REARM_DELAY_MS once it has been sent again (catches: the cancelled delay sticks to the code)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);
    gate.alertOpened();
    gate.alertCancelled(300);

    const resentAt = 300 + CANCELLED_REARM_DELAY_MS + 200;
    expect(scan(gate, "AAAA", resentAt - 200, resentAt + 300)).toEqual([resentAt]);

    const back = resentAt + 300 + REARM_DELAY_MS;
    expect(scan(gate, "AAAA", back, back + 200)).toEqual([back + 200]);
  });

  it("holds the forced code from the forcing time: no frame for 1300 ms before forcing, code still in view after the forced send, nothing re-sent (catches: forcing does not hold the code)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 8);
    gate.alertOpened();

    const forcedAt = 700 + 1300;
    gate.alertForced(forcedAt);
    gate.sendFinished(true);

    expect(scan(gate, "AAAA", forcedAt + 100, forcedAt + 2000)).toEqual([]);
  });

  it("keeps the whole group of the alert's code through a 1.5 s gap and after the cancel: A sent, B of the same box in 409, cancel, A not re-sent (catches: only the alert's own code is kept during or after the alert)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 500)).toEqual([200]);
    expect(scan(gate, "BBBB", 600, 800)).toEqual([800]);
    gate.alertOpened();

    const cancelledAt = 800 + 1500;
    gate.alertCancelled(cancelledAt);

    expect(scan(gate, "AAAA", cancelledAt + 100, cancelledAt + 1500)).toEqual([]);
  });

  it("keeps the whole group of the alert's code while frames come in during the alert: 1.5 s gap, then B frames, cancel, A not re-sent (catches: the group's hold expires during the alert)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 500)).toEqual([200]);
    expect(scan(gate, "BBBB", 600, 800)).toEqual([800]);
    gate.alertOpened();

    const backAt = 800 + 1500;
    frames(gate, "BBBB", backAt, 3);
    gate.alertCancelled(backAt + 300);

    expect(scan(gate, "AAAA", backAt + 400, backAt + 1500)).toEqual([]);
  });

  it("keeps the whole group of the alert's code after forcing: A sent, B of the same box in 409, 1.5 s gap, forced, A not re-sent (catches: forcing only holds the alert's own code)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 500)).toEqual([200]);
    expect(scan(gate, "BBBB", 600, 800)).toEqual([800]);
    gate.alertOpened();

    const forcedAt = 800 + 1500;
    gate.alertForced(forcedAt);
    gate.sendFinished(true);

    expect(scan(gate, "AAAA", forcedAt + 100, forcedAt + 1500)).toEqual([]);
  });

  it("is busy from alertOpened to alertCancelled, and from alertForced to sendFinished", () => {
    const cancelled = createScanGate();
    frames(cancelled, "AAAA", 0, 3);
    cancelled.alertOpened();
    expect(cancelled.isBusy()).toBe(true);
    cancelled.alertCancelled(300);
    expect(cancelled.isBusy()).toBe(false);

    const forced = createScanGate();
    frames(forced, "AAAA", 0, 3);
    forced.alertOpened();
    forced.alertForced(300);
    expect(forced.isBusy()).toBe(true);
    forced.sendFinished(true);
    expect(forced.isBusy()).toBe(false);
  });
});
