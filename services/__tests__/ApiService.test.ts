import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HeaderStore from "../../state/HeaderStore";
import apiClient from "../ApiService";

// Runs on axios's Node build, not the react-native one Metro ships: interceptors and config merge only.
// Not covered: a replay after a 401 keeps an old Badge-Id (ticket 18); simultaneous 401s (AuthService mocked).

const auth = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(),
  refreshToken: vi.fn<() => Promise<string>>(),
}));

vi.mock("../AuthService", () => ({ default: auth }));

vi.mock("../../config/KeycloakConfig", () => ({
  apiConfig: { apiUrl: "https://api.test/api" },
}));

const MAX_CALLS = 2;

let statuses: number[];
// Headers copied at send time: the replay reuses and mutates the first request's config.
let sent: AxiosHeaders[];

// axios does not check the status of what an adapter returns (each adapter calls `settle`),
// so an error status must be rejected here to reach the response interceptor.
const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  sent.push(new AxiosHeaders(config.headers));
  if (sent.length > MAX_CALLS) {
    throw new Error(`adapter called more than ${MAX_CALLS} times`);
  }
  const status = statuses[sent.length - 1];
  const response = { status, statusText: "", data: { status }, headers: {}, config };
  if (status >= 400) {
    throw new AxiosError(`status ${status}`, AxiosError.ERR_BAD_REQUEST, config, null, response);
  }
  return response;
};

const rejectionOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as AxiosError;
  }
  throw new Error("expected the request to be rejected");
};

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  statuses = [200];
  sent = [];
  apiClient.defaults.adapter = adapter;
  HeaderStore.reset();
  auth.getToken.mockReset().mockResolvedValue("token");
  auth.refreshToken.mockReset().mockResolvedValue("refreshed");
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.restoreAllMocks();
});

describe("ApiService request interceptor", () => {
  it("sends the token, the account and the badge when tracing is on (catches: Account-Id removed)", async () => {
    HeaderStore.setAccountId("42");
    HeaderStore.setTracingEnabled(true);
    HeaderStore.setBadgeScan("BADGE-7");

    await apiClient.get("/product");

    expect(sent).toHaveLength(1);
    expect(sent[0].get("Authorization")).toBe("Bearer token");
    expect(sent[0].get("Account-Id")).toBe("42");
    expect(sent[0].get("Badge-Id")).toBe("BADGE-7");
  });

  it("sends no badge when tracing is off (catches: tracing condition removed)", async () => {
    HeaderStore.setAccountId("42");
    HeaderStore.setTracingEnabled(false);
    HeaderStore.setBadgeScan("BADGE-7");

    await apiClient.get("/product");

    expect(sent[0].get("Badge-Id")).toBeUndefined();
  });

  it("sends no Authorization without a token (catches: header set unconditionally, 'Bearer null')", async () => {
    auth.getToken.mockResolvedValue(null);

    await apiClient.get("/product");

    expect(sent[0].get("Authorization")).toBeUndefined();
  });
});

describe("ApiService response interceptor", () => {
  it("refreshes once and replays a request refused with 401 (catches: no replay)", async () => {
    statuses = [401, 200];

    const response = await apiClient.get("/product");

    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(2);
    expect(response.status).toBe(200);
  });

  it("replays with the refreshed token (catches: header of the replay removed)", async () => {
    statuses = [401, 200];
    auth.getToken.mockResolvedValueOnce("old").mockResolvedValueOnce(null);
    auth.refreshToken.mockResolvedValue("new");

    await apiClient.get("/product");

    expect(sent[0].get("Authorization")).toBe("Bearer old");
    expect(sent[1].get("Authorization")).toBe("Bearer new");
  });

  it("rejects a second 401 without refreshing again (catches: replay flag removed)", async () => {
    statuses = [401, 401];

    const error = await rejectionOf(apiClient.get("/product"));

    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(2);
    expect(error.response?.status).toBe(401);
  });

  it("rejects the original 401 when the refresh fails (catches: replay despite the failure)", async () => {
    statuses = [401, 200];
    auth.refreshToken.mockRejectedValue(new Error("session rejected"));

    const error = await rejectionOf(apiClient.get("/product"));

    expect(sent).toHaveLength(1);
    expect(error.response?.status).toBe(401);
  });
});

// The expression of ProductService.ts and BatchChoice.ts, evaluated on a real axios error; those
// files are not run here, so a mutation in them does not turn this red.
describe("Badge-Id read back from a rejected request", () => {
  const badgeSent = (error: AxiosError) => !!error.config?.headers?.["Badge-Id"];

  beforeEach(() => {
    statuses = [417];
    HeaderStore.setBadgeScan("BADGE-7");
  });

  it("is true when the badge was sent (catches: Badge-Id not set on the request)", async () => {
    HeaderStore.setTracingEnabled(true);

    const error = await rejectionOf(apiClient.put("/product/stock"));

    expect(error.response?.status).toBe(417);
    expect(badgeSent(error)).toBe(true);
  });

  it("is false when tracing is off (catches: tracing condition removed)", async () => {
    HeaderStore.setTracingEnabled(false);

    const error = await rejectionOf(apiClient.put("/product/stock"));

    expect(badgeSent(error)).toBe(false);
  });
});
