import { describe, expect, it } from "vitest";
import type { BarcodeBounds } from "expo-camera";
import { createCameraControls } from "../CameraControls";

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
