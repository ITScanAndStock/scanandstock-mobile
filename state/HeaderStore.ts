type HeaderState = {
  accountId?: string;
  tracingEnabled?: boolean;
  badgeScan?: string;
};

const state: HeaderState = {};

const HeaderStore = {
  setAccountId(id?: string | null) {
    state.accountId = id ?? undefined;
  },
  getAccountId() {
    return state.accountId;
  },
  setTracingEnabled(enabled?: boolean | null) {
    state.tracingEnabled = typeof enabled === "boolean" ? enabled : undefined;
  },
  isTracingEnabled() {
    return state.tracingEnabled === true;
  },
  setBadgeScan(scan?: string | null) {
    state.badgeScan = scan ?? undefined;
  },
  getBadgeScan() {
    return state.badgeScan;
  },
  reset() {
    state.accountId = undefined;
    state.tracingEnabled = undefined;
    state.badgeScan = undefined;
  },
};

export default HeaderStore;
