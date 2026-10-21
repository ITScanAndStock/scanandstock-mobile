import { beforeEach, describe, expect, it, vi } from "vitest";

const secureStore = new Map<string, string>();
const asyncStore = new Map<string, string>();

vi.mock("expo-secure-store", () => ({
  setItemAsync: async (key: string, value: unknown) => {
    if (typeof value !== "string") {
      throw new Error("Invalid value provided to SecureStore. Values must be strings");
    }
    secureStore.set(key, value);
  },
  getItemAsync: async (key: string) => secureStore.get(key) ?? null,
  deleteItemAsync: async (key: string) => {
    secureStore.delete(key);
  },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: async (key: string, value: string) => {
      asyncStore.set(key, value);
    },
    getItem: async (key: string) => asyncStore.get(key) ?? null,
    multiRemove: async (keys: string[]) => {
      keys.forEach((key) => asyncStore.delete(key));
    },
    getAllKeys: async () => [...asyncStore.keys()],
  },
}));

vi.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: () => {} }));

vi.mock("../../config/KeycloakConfig", () => ({
  keycloakConfig: {
    url: "https://sso.test/",
    realm: "scan-and-stock",
    clientId: "scanandstock-mobile",
  },
  apiConfig: { apiUrl: "https://api.test/api" },
}));

// Mirrors the library contract: POST to the token endpoint, TokenError only when the JSON
// carries `error`, network failures propagate, snake_case JSON mapped to camelCase.
vi.mock("expo-auth-session", () => {
  class TokenError extends Error {
    code: string;
    params: { error: string };
    constructor(params: { error: string }) {
      super(params.error);
      this.code = params.error;
      this.params = params;
    }
  }
  return {
    TokenError,
    refreshAsync: async (
      config: { clientId: string; refreshToken: string },
      discovery: { tokenEndpoint: string },
    ) => {
      const response = await fetch(discovery.tokenEndpoint, {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: config.refreshToken,
          client_id: config.clientId,
        }).toString(),
      });
      const json = await response.json();
      if ("error" in json) {
        throw new TokenError(json);
      }
      return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresIn: json.expires_in,
        idToken: json.id_token,
      };
    },
  };
});

const networkDown = () =>
  vi.fn(async () => {
    throw new TypeError("Network request failed");
  });

const keycloakAnswers = (status: number, body: object) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("AuthService.refreshToken", () => {
  let AuthService: typeof import("../AuthService").default;

  beforeEach(async () => {
    secureStore.clear();
    asyncStore.clear();
    vi.restoreAllMocks();
    vi.resetModules();
    AuthService = (await import("../AuthService")).default;
    secureStore.set("token", "old-access");
    secureStore.set("refreshToken", "old-refresh");
    secureStore.set("tokenExpiry", String(Date.now() + 30_000));
  });

  it("stores the renewed tokens when Keycloak accepts the refresh token", async () => {
    vi.stubGlobal(
      "fetch",
      keycloakAnswers(200, {
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 1800,
        token_type: "Bearer",
      }),
    );
    const before = Date.now();

    const token = await AuthService.refreshToken();

    expect(token).toBe("new-access");
    expect(secureStore.get("token")).toBe("new-access");
    expect(secureStore.get("refreshToken")).toBe("new-refresh");
    const expiry = Number(secureStore.get("tokenExpiry"));
    expect(expiry).toBeGreaterThanOrEqual(before + 1800 * 1000);
    expect(expiry).toBeLessThan(before + 1800 * 1000 + 5_000);
  });

  it("sends a single request to Keycloak when renewals overlap", async () => {
    const fetchMock = keycloakAnswers(200, {
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 1800,
    });
    vi.stubGlobal("fetch", fetchMock);

    const tokens = await Promise.all([
      AuthService.refreshToken(),
      AuthService.refreshToken(),
      AuthService.refreshToken(),
    ]);

    expect(tokens).toEqual(["new-access", "new-access", "new-access"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears the session and tells listeners when Keycloak rejects the refresh token", async () => {
    vi.stubGlobal("fetch", keycloakAnswers(400, { error: "invalid_grant" }));
    const onSessionEnded = vi.fn();
    AuthService.onSessionEnded(onSessionEnded);

    await expect(AuthService.refreshToken()).rejects.toThrow();

    expect(secureStore.has("token")).toBe(false);
    expect(secureStore.has("refreshToken")).toBe(false);
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the network fails during the renewal", async () => {
    vi.stubGlobal("fetch", networkDown());
    const onSessionEnded = vi.fn();
    AuthService.onSessionEnded(onSessionEnded);

    await expect(AuthService.refreshToken()).rejects.toThrow("Network request failed");

    expect(secureStore.get("token")).toBe("old-access");
    expect(secureStore.get("refreshToken")).toBe("old-refresh");
    expect(onSessionEnded).not.toHaveBeenCalled();
  });

  it.each([
    ["an HTML error page", 502, "<html>Bad Gateway</html>"],
    ["a temporarily_unavailable error", 503, JSON.stringify({ error: "temporarily_unavailable" })],
    ["a server_error", 500, JSON.stringify({ error: "server_error" })],
  ])("keeps the session when Keycloak answers %s", async (_label, status, body) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));
    const onSessionEnded = vi.fn();
    AuthService.onSessionEnded(onSessionEnded);

    await expect(AuthService.refreshToken()).rejects.toThrow();

    expect(secureStore.get("refreshToken")).toBe("old-refresh");
    expect(onSessionEnded).not.toHaveBeenCalled();
  });
});

describe("AuthService.getToken", () => {
  let AuthService: typeof import("../AuthService").default;

  beforeEach(async () => {
    secureStore.clear();
    asyncStore.clear();
    vi.restoreAllMocks();
    vi.resetModules();
    AuthService = (await import("../AuthService")).default;
    secureStore.set("token", "current-access");
    secureStore.set("refreshToken", "current-refresh");
  });

  it("returns the stored token without renewing it while it is far from expiry", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    secureStore.set("tokenExpiry", String(Date.now() + 4 * 60 * 1000));

    const token = await AuthService.getToken();

    expect(token).toBe("current-access");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the user authenticated when the renewal cannot reach Keycloak", async () => {
    vi.stubGlobal("fetch", networkDown());
    secureStore.set("tokenExpiry", String(Date.now() - 60_000));

    const isValid = await AuthService.isTokenValid();
    const token = await AuthService.getToken();

    expect(isValid).toBe(true);
    expect(token).toBe("current-access");
  });
});
