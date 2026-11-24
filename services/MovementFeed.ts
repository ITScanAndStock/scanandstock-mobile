import type { StatsModel } from "../model/Stats";
import { AccountChangedError } from "./AccountResponse";

// The API writes a movement after answering the write: the reload right after it may not see it yet.
const LATER_RELOAD_AFTER_WRITE_MS = 2000;

export type MovementLoading = "first" | "reload" | "nextPage" | null;

export type MovementFeedState = {
  movements: StatsModel[];
  reachedEnd: boolean;
  loading: MovementLoading;
  firstLoadFailed: boolean;
  nextPageFailed: boolean;
  pulling: boolean;
  backToTop: number;
};

export type MovementSession = {
  accountId: string | null;
  connected: boolean;
};

type MovementFeedOptions = {
  loadPage: (accountId: string, offset: number) => Promise<StatsModel[]>;
  pageSize: number;
  onPullFailed: () => void;
};

const EMPTY: MovementFeedState = {
  movements: [],
  reachedEnd: false,
  loading: null,
  firstLoadFailed: false,
  nextPageFailed: false,
  pulling: false,
  backToTop: 0,
};

// A movement written between two pages shifts the rest by one: the last movement seen comes back.
export function appendMovements(loaded: readonly StatsModel[], incoming: readonly StatsModel[]): StatsModel[] {
  const seen = new Set(loaded.map((movement) => movement.id));
  return [...loaded, ...incoming.filter((movement) => !seen.has(movement.id) && seen.add(movement.id))];
}

export function createMovementFeed({ loadPage, pageSize, onPullFailed }: MovementFeedOptions) {
  let state = EMPTY;
  let accountId: string | null = null;
  // Bumped by every reload and session change, so an answer to an earlier request changes nothing.
  let generation = 0;
  // Movements received since the last reload, not movements shown: a page of duplicates would ask the same page again.
  let received = 0;
  let pageReceived = false;
  let laterReload: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const update = (changes: Partial<MovementFeedState>) => {
    state = { ...state, ...changes };
    listeners.forEach((listener) => listener());
  };

  const request = (
    account: string,
    offset: number,
    onPage: (page: StatsModel[]) => void,
    onFailure: () => void,
  ) => {
    const run = generation;
    loadPage(account, offset).then(
      (page) => {
        if (run === generation) {
          pageReceived = true;
          onPage(page);
        }
      },
      (error: unknown) => {
        if (run !== generation) {
          return;
        }
        if (error instanceof AccountChangedError) {
          update({ loading: null, pulling: false });
        } else {
          onFailure();
        }
      },
    );
  };

  const cancelLaterReload = () => {
    if (laterReload !== null) {
      clearTimeout(laterReload);
      laterReload = null;
    }
  };

  const reload = (account: string, fromPull = false) => {
    cancelLaterReload();
    generation += 1;
    update({ loading: state.movements.length > 0 ? "reload" : "first", pulling: fromPull });
    request(
      account,
      0,
      (page) => {
        received = page.length;
        update({
          movements: appendMovements([], page),
          reachedEnd: page.length < pageSize,
          loading: null,
          firstLoadFailed: false,
          nextPageFailed: false,
          pulling: false,
        });
      },
      () => {
        update({ loading: null, pulling: false, firstLoadFailed: state.movements.length === 0 });
        if (fromPull) {
          onPullFailed();
        }
      },
    );
  };

  const reloadToTop = (account: string) => {
    reload(account);
    update({ backToTop: state.backToTop + 1 });
  };

  const nextPage = (account: string) => {
    update({ loading: "nextPage", nextPageFailed: false });
    request(
      account,
      received,
      (page) => {
        received += page.length;
        update({
          movements: appendMovements(state.movements, page),
          reachedEnd: page.length < pageSize,
          loading: null,
        });
      },
      () => update({ loading: null, nextPageFailed: true }),
    );
  };

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setSession: (session: MovementSession) => {
      const next = session.connected ? session.accountId : null;
      if (next === accountId) {
        return;
      }
      accountId = next;
      cancelLaterReload();
      generation += 1;
      received = 0;
      pageReceived = false;
      update({ ...EMPTY, backToTop: state.backToTop });
      if (next !== null) {
        reload(next);
      }
    },
    pull: () => {
      if (accountId !== null) {
        reload(accountId, true);
      }
    },
    loadNextPage: () => {
      if (accountId === null || !pageReceived || state.reachedEnd || state.loading !== null || state.nextPageFailed) {
        return;
      }
      nextPage(accountId);
    },
    retry: () => {
      if (accountId === null || state.loading !== null) {
        return;
      }
      if (state.nextPageFailed) {
        nextPage(accountId);
      } else if (state.firstLoadFailed) {
        reload(accountId);
      }
    },
    afterWrite: () => {
      if (accountId === null) {
        return;
      }
      const account = accountId;
      reloadToTop(account);
      laterReload = setTimeout(() => {
        laterReload = null;
        reloadToTop(account);
      }, LATER_RELOAD_AFTER_WRITE_MS);
    },
  };
}

export type MovementFeed = ReturnType<typeof createMovementFeed>;
