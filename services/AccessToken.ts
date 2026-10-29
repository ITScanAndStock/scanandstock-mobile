const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const ORDER_RECEIVER_ROLE = "ORDER_RECEIVER";

export type AccessTokenClaims = { email?: string; roles: string[] };

// Decoded by hand: Hermes has no Buffer, and atob would leave the UTF-8 bytes of an accented claim undecoded.
function decodeBase64url(text: string): string | null {
  let bits = 0;
  let bitCount = 0;
  let escaped = "";
  for (const char of text) {
    const value = BASE64URL_ALPHABET.indexOf(char);
    if (value < 0) {
      return null;
    }
    bits = ((bits << 6) | value) & 0xffffff;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      escaped += `%${((bits >> bitCount) & 0xff).toString(16).padStart(2, "0")}`;
    }
  }
  try {
    return decodeURIComponent(escaped);
  } catch {
    return null;
  }
}

export function readAccessToken(token: string | null): AccessTokenClaims | null {
  const payload = token?.split(".")[1];
  const json = payload ? decodeBase64url(payload) : null;
  if (!json) {
    return null;
  }
  try {
    const claims = JSON.parse(json);
    const roles = claims?.realm_access?.roles;
    return {
      email: typeof claims?.email === "string" ? claims.email : undefined,
      roles: Array.isArray(roles) ? roles.filter((role): role is string => typeof role === "string") : [],
    };
  } catch {
    return null;
  }
}

export function canReceiveOrders(token: string | null): boolean {
  return readAccessToken(token)?.roles.includes(ORDER_RECEIVER_ROLE) ?? false;
}
