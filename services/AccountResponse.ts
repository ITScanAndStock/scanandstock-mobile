import type { AxiosResponse } from "axios";

export class AccountChangedError extends Error {}

// The Account-Id header is read when the request leaves, after the token wait: an account switch can slip in between.
export function sentUnder<T>(accountId: string, response: AxiosResponse<T>): T | null {
  if (String(response.config.headers?.["Account-Id"]) !== String(accountId)) {
    throw new AccountChangedError();
  }
  return response.status === 204 ? null : response.data;
}
