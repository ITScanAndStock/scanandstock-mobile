import { describe, expect, it } from "vitest";
import { computeCameraTurn } from "../CameraTurn";

describe("computeCameraTurn", () => {
  it("renders the home camera alone while no receipt is open and no camera is mounted yet (catches: receipt camera rendered closed)", () => {
    expect(computeCameraTurn({ receiptOpen: false, homeMounted: false, receiptMounted: false })).toEqual({
      home: true,
      receipt: false,
    });
  });

  it("drops the home camera at the opening and waits for its unmount before the receipt's (catches: home camera kept, receipt camera rendered over a mounted home camera)", () => {
    expect(computeCameraTurn({ receiptOpen: true, homeMounted: true, receiptMounted: false })).toEqual({
      home: false,
      receipt: false,
    });
    expect(computeCameraTurn({ receiptOpen: true, homeMounted: false, receiptMounted: false })).toEqual({
      home: false,
      receipt: true,
    });
  });

  it("drops the receipt camera at the closing and waits for its unmount before the home's (catches: home camera rendered over a mounted receipt camera)", () => {
    expect(computeCameraTurn({ receiptOpen: false, homeMounted: false, receiptMounted: true })).toEqual({
      home: false,
      receipt: false,
    });
    expect(computeCameraTurn({ receiptOpen: false, homeMounted: false, receiptMounted: false })).toEqual({
      home: true,
      receipt: false,
    });
  });
});
