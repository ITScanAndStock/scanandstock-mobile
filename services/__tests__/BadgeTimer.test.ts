import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BADGE_DURATION_MS, createBadgeTimer, LATE_REMOVAL_MS, type RemoveScope } from "../BadgeTimer";

const START = new Date("2026-10-23T08:00:00Z").getTime();
const s = (seconds: number) => seconds * 1000;

async function advanceTo(time: number) {
  await vi.advanceTimersByTimeAsync(START + time - Date.now());
}

function setup(removeSucceeds = true) {
  let clockOffset = 0;
  const remove = vi.fn((_scope: RemoveScope) => Promise.resolve(removeSucceeds));
  const confirm = vi.fn();
  const timer = createBadgeTimer({
    durationMs: BADGE_DURATION_MS,
    now: () => Date.now() + clockOffset,
    remove,
    confirm,
  });
  const setClockOffset = (ms: number) => {
    clockOffset = ms;
  };
  return { timer, remove, confirm, setClockOffset };
}

describe("BadgeTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes a connected badge one minute after it connected", async () => {
    const { timer, remove, confirm } = setup();

    timer.badgeConnected();
    await advanceTo(s(59));
    expect(remove).not.toHaveBeenCalled();

    await advanceTo(s(60));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("all");
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("pushes the removal back one minute after each send", async () => {
    const { timer, remove } = setup();

    timer.badgeConnected();
    await advanceTo(s(50));
    timer.scanSent();
    await advanceTo(s(109));
    expect(remove).not.toHaveBeenCalled();

    await advanceTo(s(110));
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending removal when the badge is removed by hand", async () => {
    const { timer, remove, confirm } = setup();

    timer.badgeConnected();
    await advanceTo(s(10));
    void timer.removeManually();
    await advanceTo(s(10));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("all");
    expect(confirm).toHaveBeenCalledTimes(1);

    await advanceTo(s(30));
    timer.badgeConnected();
    await advanceTo(s(89));
    expect(remove).toHaveBeenCalledTimes(1);

    await advanceTo(s(90));
    expect(remove).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("confirms a hand removal once even when it is asked twice in a row", async () => {
    const { timer, confirm } = setup();

    timer.badgeConnected();
    const first = timer.removeManually();
    const second = timer.removeManually();
    await Promise.all([first, second]);

    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the badge is removed by hand while none is connected", async () => {
    const { timer, remove, confirm } = setup();

    await timer.removeManually();

    expect(remove).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("clears a connected badge from memory without confirming when cancelled", async () => {
    const { timer, remove, confirm } = setup();

    timer.badgeConnected();
    timer.cancel();
    await advanceTo(s(0));

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("memory");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("stays disconnected after a cancel, so a later send arms nothing", async () => {
    const { timer, remove, confirm } = setup();

    timer.badgeConnected();
    await advanceTo(s(10));
    timer.cancel();
    await advanceTo(s(20));
    timer.scanSent();
    await advanceTo(s(120));

    expect(remove).not.toHaveBeenCalledWith("all");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("drops the pending removal on cancel, so a new badge gets a full minute", async () => {
    const { timer, remove } = setup();

    timer.badgeConnected();
    await advanceTo(s(10));
    timer.cancel();
    await advanceTo(s(30));
    timer.badgeConnected();
    await advanceTo(s(89));
    expect(remove).not.toHaveBeenCalledWith("all");

    await advanceTo(s(90));
    expect(remove).toHaveBeenCalledWith("all");
  });

  it("is no longer valid at the deadline itself, even before the timer runs", () => {
    const { timer } = setup();

    timer.badgeConnected();
    vi.setSystemTime(START + s(60));

    expect(timer.isBadgeValid()).toBe(false);
  });

  it("removes the badge without confirming when the phone wakes up past the deadline", async () => {
    const { timer, remove, confirm } = setup();

    timer.badgeConnected();
    vi.setSystemTime(START + s(120));

    expect(timer.isBadgeValid()).toBe(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("all");
    expect(confirm).not.toHaveBeenCalled();

    timer.scanSent();
    expect(timer.isBadgeValid()).toBe(false);
  });

  it("arms nothing when a scan is sent without a connected badge", async () => {
    const { timer, remove, confirm } = setup();

    timer.scanSent();
    await advanceTo(s(120));

    expect(remove).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("keeps a single pending removal when the badge connects twice", async () => {
    const { timer, remove, confirm } = setup();

    timer.badgeConnected();
    await advanceTo(s(30));
    timer.badgeConnected();
    await advanceTo(s(89));
    expect(remove).not.toHaveBeenCalled();

    await advanceTo(s(90));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("removes only once when a scan is sent after the deadline", async () => {
    const { timer, remove } = setup();

    timer.badgeConnected();
    await advanceTo(s(60));
    timer.scanSent();
    await advanceTo(s(120));

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("does not confirm a removal that failed at the deadline", async () => {
    const { timer, confirm } = setup(false);

    timer.badgeConnected();
    await advanceTo(s(60));

    expect(timer.isBadgeValid()).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("does not confirm a hand removal that failed", async () => {
    const { timer, confirm } = setup(false);

    timer.badgeConnected();
    await timer.removeManually();

    expect(timer.isBadgeValid()).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("does not confirm a timer removal that runs late", async () => {
    const { timer, remove, confirm, setClockOffset } = setup();

    timer.badgeConnected();
    await advanceTo(s(59));
    setClockOffset(s(10));
    await advanceTo(s(60));

    expect(remove).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("confirms a removal just under the late threshold, not at it", async () => {
    const onTime = setup();
    onTime.timer.badgeConnected();
    const late = setup();
    late.timer.badgeConnected();

    await advanceTo(s(59));
    onTime.setClockOffset(LATE_REMOVAL_MS - 1);
    late.setClockOffset(LATE_REMOVAL_MS);
    await advanceTo(s(60));

    expect(onTime.confirm).toHaveBeenCalledTimes(1);
    expect(late.confirm).not.toHaveBeenCalled();
  });

  it("leaves nothing to fire at the old deadline after a hand removal", async () => {
    const { timer, remove, confirm } = setup();

    timer.badgeConnected();
    await advanceTo(s(10));
    await timer.removeManually();
    await advanceTo(s(120));

    expect(remove).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
