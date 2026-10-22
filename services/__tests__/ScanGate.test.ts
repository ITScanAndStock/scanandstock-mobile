import { describe, expect, it } from "vitest";
import { createScanGate, REARM_DELAY_MS, type ScanDecision, type ScanGate } from "../ScanGate";

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

function scan(gate: ScanGate, code: string, from: number, to: number, options: ScanOptions = {}) {
  const { step = FRAME_STEP_MS, finishAfter = SEND_DURATION_MS, ok = true } = options;
  const sentAt: number[] = [];
  let finishAt: number | null = null;
  for (let t = from; t <= to; t += step) {
    if (finishAt !== null && t >= finishAt) {
      gate.sendFinished(ok);
      finishAt = null;
    }
    if (gate.frame(code, t).kind === "send") {
      sentAt.push(t);
      finishAt = t + finishAfter;
    }
  }
  return sentAt;
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

  it("keeps holding across an invalid code between two held frames (catches: an invalid code clears the hold)", () => {
    const gate = createScanGate();

    expect(scan(gate, "AAAA", 0, 600)).toEqual([200]);
    gate.frame("XYZ", 700);
    expect(scan(gate, "AAAA", 800, 1200)).toEqual([]);
  });

  it("keeps the send lock across a camera reopening: 3 frames of B do not send before sendFinished (catches: reopening lifts the lock)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);

    gate.cameraReopened(400);
    const decisions = frames(gate, "BBBB", 500, 3);

    expect(sends(decisions)).toEqual([]);
    expect(gate.isBusy()).toBe(true);
  });

  it("does not count closed-camera time as absence: held code shown 300 ms after reopening is not sent (catches: closed time counts as absence)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 700)).toEqual([200]);

    const reopenedAt = 700 + 3000;
    gate.cameraReopened(reopenedAt);

    expect(scan(gate, "AAAA", reopenedAt + 300, reopenedAt + 500)).toEqual([]);
  });

  it("re-arms a held code first seen REARM_DELAY_MS after reopening (catches: reopening holds the code forever)", () => {
    const gate = createScanGate();
    expect(scan(gate, "AAAA", 0, 700)).toEqual([200]);

    const reopenedAt = 700 + 3000;
    gate.cameraReopened(reopenedAt);
    const back = reopenedAt + REARM_DELAY_MS;

    expect(scan(gate, "AAAA", back, back + 200)).toEqual([back + 200]);
  });

  it("resets the count on reopening: A, A, reopen, A sends nothing (catches: reopening keeps the count)", () => {
    const gate = createScanGate();

    frames(gate, "AAAA", 0, 2);
    gate.cameraReopened(200);
    const decision = gate.frame("AAAA", 300);

    expect(decision.kind).toBe("ignore");
  });

  it("sends nothing during a 5 s alert, nor after cancelling with the conflicting code in view (catches: closing the alert clears the hold, or frames during the alert do not extend it)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);

    gate.alertOpened();
    const during = alternate(gate, ["AAAA", "BBBB", "BBBB", "BBBB"], 500, 5500);
    gate.alertCancelled();
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
    gate.alertCancelled();
    const after = frames(gate, "AAAA", 5600, 10);

    expect(sends(during)).toEqual([]);
    expect(sends(after)).toEqual([]);
  });

  it("sends B on its 3rd frame after the alert is cancelled (catches: the lock stays on)", () => {
    const gate = createScanGate();
    frames(gate, "AAAA", 0, 3);

    gate.alertOpened();
    gate.alertCancelled();
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

    gate.alertForced();
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

    gate.alertForced();
    const during = frames(gate, "AAAA", 1500, 3);
    gate.sendFinished(true);
    const after = frames(gate, "AAAA", 1800, 30);

    expect(sends([...during, ...after])).toEqual([]);
  });

  it("is busy from alertOpened to alertCancelled, and from alertForced to sendFinished", () => {
    const cancelled = createScanGate();
    frames(cancelled, "AAAA", 0, 3);
    cancelled.alertOpened();
    expect(cancelled.isBusy()).toBe(true);
    cancelled.alertCancelled();
    expect(cancelled.isBusy()).toBe(false);

    const forced = createScanGate();
    frames(forced, "AAAA", 0, 3);
    forced.alertOpened();
    forced.alertForced();
    expect(forced.isBusy()).toBe(true);
    forced.sendFinished(true);
    expect(forced.isBusy()).toBe(false);
  });
});
