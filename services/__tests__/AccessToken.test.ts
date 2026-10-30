import { describe, expect, it } from "vitest";
import { canReceiveOrders, readAccessToken } from "../AccessToken";

function base64url(json: object): string {
  return Buffer.from(JSON.stringify(json)).toString("base64url");
}

function token(payload: object): string {
  return `${base64url({ alg: "RS256", typ: "JWT" })}.${base64url(payload)}.signature`;
}

const PAYLOAD = {
  email: "hélène.ç@cabinet.fr",
  note: "??>>~~x",
  realm_access: { roles: ["offline_access", "ORDER_RECEIVER"] },
};

describe("readAccessToken", () => {
  it("reads the email and roles of a base64url payload (catches: standard base64 decoding)", () => {
    const encodedPayload = token(PAYLOAD).split(".")[1];
    expect(encodedPayload).toMatch(/[-_]/);
    expect(encodedPayload.length % 4).not.toBe(0);

    expect(readAccessToken(token(PAYLOAD))).toEqual({
      email: "hélène.ç@cabinet.fr",
      roles: ["offline_access", "ORDER_RECEIVER"],
    });
  });

  it("gives nothing for a token that is not a JWT (catches: a malformed token read as a user)", () => {
    expect(readAccessToken("not-a-token")).toBeNull();
    expect(readAccessToken(null)).toBeNull();
  });
});

describe("canReceiveOrders", () => {
  it("grants the right with ORDER_RECEIVER in the realm roles (catches: right always false)", () => {
    expect(canReceiveOrders(token(PAYLOAD))).toBe(true);
  });

  it("refuses it without ORDER_RECEIVER (catches: right always true)", () => {
    expect(canReceiveOrders(token({ ...PAYLOAD, realm_access: { roles: ["STATS_VIEWER"] } }))).toBe(false);
    expect(canReceiveOrders(token({ email: "a@b.fr" }))).toBe(false);
  });
});
