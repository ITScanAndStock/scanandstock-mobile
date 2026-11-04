import { describe, expect, it } from "vitest";
import type { BarcodeBounds } from "expo-camera";
import { type CameraControls, createCameraControls, PINCH_ZOOM_GAIN } from "../CameraControls";

const FRAME = { x: 50, y: 100, width: 280, height: 200 };

function bounds(x: number, y: number, width: number, height: number): BarcodeBounds {
  return { origin: { x, y }, size: { width, height } };
}

function measured(frame = FRAME) {
  const controls = createCameraControls();
  controls.frameMeasured(frame);
  return controls;
}

describe("CameraControls.accepts", () => {
  it("accepts a code centred in the frame (catches: accepts always false)", () => {
    expect(measured().accepts(bounds(170, 180, 40, 40))).toBe(true);
  });

  it("accepts a code overflowing on the left when its centre is inside (catches: whole code required)", () => {
    expect(measured().accepts(bounds(30, 180, 100, 40))).toBe(true);
  });

  it("accepts a code overflowing on the right when its centre is inside (catches: x + width instead of x + width / 2)", () => {
    expect(measured().accepts(bounds(250, 180, 100, 40))).toBe(true);
  });

  it("refuses a code whose left edge is inside but centre is outside (catches: left edge taken instead of the centre, x + height / 2)", () => {
    expect(measured().accepts(bounds(300, 180, 100, 40))).toBe(false);
  });

  it("accepts a wide short code by its vertical centre (catches: y + width / 2 instead of y + height / 2)", () => {
    expect(measured().accepts(bounds(150, 285, 80, 30))).toBe(true);
  });

  it("refuses a code left of the frame (catches: accepts always true)", () => {
    expect(measured().accepts(bounds(20, 180, 40, 40))).toBe(false);
  });

  it("refuses a code below the frame (catches: x and y swapped)", () => {
    expect(measured().accepts(bounds(170, 290, 40, 40))).toBe(false);
  });

  it.each([
    ["left", bounds(30, 180, 40, 40)],
    ["right", bounds(310, 180, 40, 40)],
    ["top", bounds(170, 80, 40, 40)],
    ["bottom", bounds(170, 280, 40, 40)],
  ])("accepts a centre on the %s edge (catches: strict bound on that side)", (_side, box) => {
    expect(measured().accepts(box)).toBe(true);
  });

  it("refuses a code without bounds (catches: code without position accepted)", () => {
    expect(measured().accepts(undefined)).toBe(false);
  });

  it("refuses a code of zero size (catches: zero-size guard dropped)", () => {
    expect(measured().accepts(bounds(170, 180, 0, 0))).toBe(false);
  });

  it("refuses everything while the frame was never measured (catches: default frame covering the screen)", () => {
    expect(createCameraControls().accepts(bounds(170, 180, 40, 40))).toBe(false);
  });

  it("treats a zero-size frame as not measured (catches: zero size taken for a measure)", () => {
    const controls = measured({ x: 50, y: 100, width: 0, height: 0 });
    expect(controls.accepts(bounds(30, 80, 40, 40))).toBe(false);
  });

  it("treats a zero-width frame as not measured (catches: zero width taken for a measure)", () => {
    const controls = measured({ x: 50, y: 100, width: 0, height: 200 });
    expect(controls.accepts(bounds(30, 180, 40, 40))).toBe(false);
  });

  it("treats a zero-height frame as not measured (catches: zero height taken for a measure)", () => {
    const controls = measured({ x: 50, y: 100, width: 280, height: 0 });
    expect(controls.accepts(bounds(170, 80, 40, 40))).toBe(false);
  });

  it("refuses everything after a negative-size measure replaces a valid one (catches: invalid measure ignored, first kept)", () => {
    const controls = measured();
    controls.frameMeasured({ x: 50, y: 100, width: -280, height: 200 });
    expect(controls.accepts(bounds(170, 180, 40, 40))).toBe(false);
  });

  it("follows the latest measure (catches: first measure kept)", () => {
    const controls = measured();
    controls.frameMeasured({ x: 50, y: 400, width: 280, height: 200 });
    expect(controls.accepts(bounds(170, 180, 40, 40))).toBe(false);
    expect(controls.accepts(bounds(170, 480, 40, 40))).toBe(true);
  });
});

describe("CameraControls torch", () => {
  it("starts with the torch off (catches: torch initially on)", () => {
    expect(createCameraControls().getState().torch).toBe(false);
  });

  it("opened() puts a lit torch out (catches: torch kept on opening)", () => {
    const controls = createCameraControls();
    controls.toggleTorch();
    controls.opened();
    expect(controls.getState().torch).toBe(false);
  });

  it("closed() puts a lit torch out (catches: closed() without effect on the torch)", () => {
    const controls = createCameraControls();
    controls.toggleTorch();
    controls.closed();
    expect(controls.getState().torch).toBe(false);
  });

  it("toggleTorch() twice lights then puts out (catches: torch always on)", () => {
    const controls = createCameraControls();
    controls.toggleTorch();
    expect(controls.getState().torch).toBe(true);
    controls.toggleTorch();
    expect(controls.getState().torch).toBe(false);
  });

  it("notifies a subscriber on toggleTorch (catches: notification removed from toggleTorch)", () => {
    const controls = createCameraControls();
    let calls = 0;
    controls.subscribe(() => calls++);
    controls.toggleTorch();
    expect(calls).toBe(1);
  });

  it("notifies a subscriber on opened() with the torch on (catches: notification removed from opened)", () => {
    const controls = createCameraControls();
    controls.toggleTorch();
    let calls = 0;
    controls.subscribe(() => calls++);
    controls.opened();
    expect(calls).toBe(1);
  });

  it("notifies a subscriber on closed() with the torch on (catches: notification removed from closed)", () => {
    const controls = createCameraControls();
    controls.toggleTorch();
    let calls = 0;
    controls.subscribe(() => calls++);
    controls.closed();
    expect(calls).toBe(1);
  });

  it("does not notify when opened() or closed() find the torch already off (catches: notification without a change)", () => {
    const controls = createCameraControls();
    let calls = 0;
    controls.subscribe(() => calls++);
    controls.opened();
    controls.closed();
    expect(calls).toBe(0);
  });

  it("returns a new state object after a change (catches: state mutated in place)", () => {
    const controls = createCameraControls();
    const before = controls.getState();
    controls.toggleTorch();
    expect(controls.getState()).not.toBe(before);
    expect(before.torch).toBe(false);
  });

  it("returns the same state object on two reads without change (catches: state recreated on each read)", () => {
    const controls = createCameraControls();
    expect(controls.getState()).toBe(controls.getState());
    controls.toggleTorch();
    expect(controls.getState()).toBe(controls.getState());
  });

  it("stops notifying after unsubscribe (catches: listener never removed)", () => {
    const controls = createCameraControls();
    let calls = 0;
    const unsubscribe = controls.subscribe(() => calls++);
    unsubscribe();
    controls.toggleTorch();
    expect(calls).toBe(0);
  });

  it("keeps the frame measure across a close and a reopening (catches: frame reset on close, nothing read after reopening)", () => {
    const controls = measured();
    controls.closed();
    controls.opened();
    expect(controls.accepts(bounds(170, 180, 40, 40))).toBe(true);
  });
});

function pinched(controls: CameraControls, scale: number) {
  controls.pinchStarted();
  controls.pinchChanged(scale);
}

function zoomedTo(controls: CameraControls, zoom: number) {
  controls.pinchStarted();
  controls.pinchChanged(1 + zoom / PINCH_ZOOM_GAIN);
}

describe("CameraControls zoom", () => {
  it("starts without zoom (catches: zoom initially above 0)", () => {
    expect(createCameraControls().getState()).toMatchObject({ zoom: 0, zoomed: false });
  });

  it("opened() drops a zoom while the torch is lit (catches: zoom kept by opened())", () => {
    const controls = createCameraControls();
    controls.toggleTorch();
    zoomedTo(controls, 0.3);
    controls.opened();
    expect(controls.getState()).toEqual({ torch: false, zoom: 0, zoomed: false });
  });

  it("closed() drops a zoom while the torch is lit (catches: zoom kept by closed())", () => {
    const controls = createCameraControls();
    controls.toggleTorch();
    zoomedTo(controls, 0.3);
    controls.closed();
    expect(controls.getState()).toEqual({ torch: false, zoom: 0, zoomed: false });
  });

  it("keeps the torch when only the zoom changes (catches: torch reset by a pinch)", () => {
    const controls = createCameraControls();
    controls.toggleTorch();
    zoomedTo(controls, 0.3);
    expect(controls.getState().torch).toBe(true);
  });

  it("keeps the zoom when only the torch toggles (catches: zoom reset by toggleTorch)", () => {
    const controls = createCameraControls();
    zoomedTo(controls, 0.3);
    controls.toggleTorch();
    expect(controls.getState().zoom).toBeCloseTo(0.3);
  });

  it("a pinch of scale 1 right after a start leaves the zoom unchanged (catches: scale added instead of its gap to 1)", () => {
    const controls = createCameraControls();
    zoomedTo(controls, 0.3);
    pinched(controls, 1);
    expect(controls.getState().zoom).toBeCloseTo(0.3);
  });

  it("a second pinch starts from the zoom the first one left (catches: start taken as 0 at each gesture)", () => {
    const controls = createCameraControls();
    zoomedTo(controls, 0.3);
    pinched(controls, 1 + 0.2 / PINCH_ZOOM_GAIN);
    expect(controls.getState().zoom).toBeCloseTo(0.5);
  });

  it("follows scale during one gesture from the same start (catches: start moved on each change)", () => {
    const controls = createCameraControls();
    zoomedTo(controls, 0.3);
    controls.pinchStarted();
    controls.pinchChanged(1 + 0.1 / PINCH_ZOOM_GAIN);
    controls.pinchChanged(1 + 0.2 / PINCH_ZOOM_GAIN);
    expect(controls.getState().zoom).toBeCloseTo(0.5);
  });

  it("clamps a very wide pinch to 1 (catches: upper bound removed)", () => {
    const controls = createCameraControls();
    pinched(controls, 100);
    expect(controls.getState().zoom).toBe(1);
  });

  it("clamps a very narrow pinch to 0 (catches: lower bound removed)", () => {
    const controls = createCameraControls();
    zoomedTo(controls, 0.3);
    pinched(controls, 0);
    expect(controls.getState()).toMatchObject({ zoom: 0, zoomed: false });
  });

  it("zoomed is true above 0 (catches: zoomed never true)", () => {
    const controls = createCameraControls();
    zoomedTo(controls, 0.3);
    expect(controls.getState().zoomed).toBe(true);
  });

  it("zooms by half the range for a pinch doubling the distance (catches: pinch gain changed)", () => {
    const controls = createCameraControls();
    pinched(controls, 2);
    expect(controls.getState().zoom).toBeCloseTo(0.5);
  });

  it("ignores a law result that is not a finite number (catches: NaN zoom sent to the camera)", () => {
    const controls = createCameraControls({ zoomLaw: () => Number.NaN });
    const before = controls.getState();
    pinched(controls, 2);
    expect(controls.getState()).toBe(before);
  });

  it("resetZoom() brings zoom to 0 and zoomed to false, keeping the torch (catches: resetZoom without effect on zoom)", () => {
    const controls = createCameraControls();
    controls.toggleTorch();
    zoomedTo(controls, 0.3);
    controls.resetZoom();
    expect(controls.getState()).toEqual({ torch: true, zoom: 0, zoomed: false });
  });

  it("uses the law given as an option (catches: option ignored, default law always used)", () => {
    const controls = createCameraControls({ zoomLaw: (start, scale) => start + scale / 10 });
    pinched(controls, 3);
    expect(controls.getState().zoom).toBeCloseTo(0.3);
  });

  it("clamps what a custom law returns (catches: clamp applied to the default law only)", () => {
    const controls = createCameraControls({ zoomLaw: () => 7 });
    pinched(controls, 2);
    expect(controls.getState().zoom).toBe(1);
  });

  it("notifies a subscriber on pinchChanged (catches: notification removed from pinchChanged)", () => {
    const controls = createCameraControls();
    controls.pinchStarted();
    let calls = 0;
    controls.subscribe(() => calls++);
    controls.pinchChanged(2);
    expect(calls).toBe(1);
  });

  it("notifies a subscriber on resetZoom (catches: notification removed from resetZoom)", () => {
    const controls = createCameraControls();
    zoomedTo(controls, 0.3);
    let calls = 0;
    controls.subscribe(() => calls++);
    controls.resetZoom();
    expect(calls).toBe(1);
  });

  it("notifies a subscriber on opened() with only a zoom to drop (catches: opened() notifying on the torch only)", () => {
    const controls = createCameraControls();
    zoomedTo(controls, 0.3);
    let calls = 0;
    controls.subscribe(() => calls++);
    controls.opened();
    expect(calls).toBe(1);
  });

  it("returns the same state object and stays silent when pinchChanged(1) changes nothing (catches: new state without a change)", () => {
    const controls = createCameraControls();
    zoomedTo(controls, 0.3);
    const before = controls.getState();
    let calls = 0;
    controls.subscribe(() => calls++);
    pinched(controls, 1);
    expect(controls.getState()).toBe(before);
    expect(calls).toBe(0);
  });

  it("returns a new state object after a zoom change (catches: state mutated in place)", () => {
    const controls = createCameraControls();
    const before = controls.getState();
    pinched(controls, 2);
    expect(controls.getState()).not.toBe(before);
    expect(before.zoom).toBe(0);
  });
});
