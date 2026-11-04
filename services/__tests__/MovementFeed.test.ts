import { describe, expect, it, vi } from "vitest";
import { StatsModel } from "../../model/Stats";
import { AccountChangedError } from "../AccountResponse";
import { createMovementFeed } from "../MovementFeed";

type Call = {
  accountId: string;
  offset: number;
  resolve: (page: StatsModel[]) => void;
  reject: (error: unknown) => void;
};

const movement = (id: number): StatsModel => ({ ...new StatsModel(), id });
const ids = (...values: number[]) => values.map(movement);
const range = (from: number, count: number) => ids(...Array.from({ length: count }, (_, i) => from + i));
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup() {
  const calls: Call[] = [];
  const loadPage = vi.fn(
    (accountId: string, offset: number) =>
      new Promise<StatsModel[]>((resolve, reject) => calls.push({ accountId, offset, resolve, reject })),
  );
  const onPullFailed = vi.fn();
  const feed = createMovementFeed({ loadPage, pageSize: 20, onPullFailed });
  const answer = async (call: Call, page: StatsModel[]) => {
    call.resolve(page);
    await settle();
  };
  const fail = async (call: Call, error: unknown = new Error("network")) => {
    call.reject(error);
    await settle();
  };
  const shownIds = () => feed.getState().movements.map((m) => m.id);
  return { feed, calls, loadPage, onPullFailed, answer, fail, shownIds };
}

async function withFirstPage(page: StatsModel[] = range(1, 20)) {
  const context = setup();
  context.feed.setSession({ accountId: "12", connected: true });
  await context.answer(context.calls[0], page);
  return context;
}

describe("MovementFeed", () => {
  it("asks the next page from 20 after a full first page (catches: offset fixed at 0)", async () => {
    const { feed, calls } = await withFirstPage();

    feed.loadNextPage();

    expect(calls.map((c) => c.offset)).toEqual([0, 20]);
  });

  it("asks from the movements received and drops every duplicate, within a page too (catches: offset on the shown count, 36; no deduplication, 40; deduplication against the loaded list only, 37)", async () => {
    const { feed, calls, answer, shownIds } = await withFirstPage();
    feed.loadNextPage();
    await answer(calls[1], [...ids(18, 19, 20, 21, 21), ...range(22, 15)]);

    feed.loadNextPage();

    expect(calls[2].offset).toBe(40);
    expect(shownIds()).toHaveLength(36);
    expect(new Set(shownIds()).size).toBe(36);
  });

  it("ends the list on a page shorter than the page size (catches: end only on an empty page)", async () => {
    const { feed, loadPage } = await withFirstPage(range(1, 19));

    feed.loadNextPage();

    expect(feed.getState().reachedEnd).toBe(true);
    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it("ends the list on a next page shorter than the page size (catches: end only on an empty page)", async () => {
    const { feed, calls, loadPage, answer } = await withFirstPage();
    feed.loadNextPage();
    await answer(calls[1], range(21, 19));

    feed.loadNextPage();

    expect(feed.getState().reachedEnd).toBe(true);
    expect(loadPage).toHaveBeenCalledTimes(2);
  });

  it("ends the list without a failure on an empty page after a full one (catches: empty page taken for a failure)", async () => {
    const { feed, calls, answer } = await withFirstPage();
    feed.loadNextPage();
    await answer(calls[1], []);

    expect(feed.getState()).toMatchObject({ reachedEnd: true, nextPageFailed: false, loading: null });
    expect(feed.getState().movements).toHaveLength(20);
  });

  it("gives an empty finished list without a failure on an empty first page (catches: empty page taken for a failure)", async () => {
    const { feed } = await withFirstPage([]);

    expect(feed.getState()).toMatchObject({ movements: [], reachedEnd: true, firstLoadFailed: false, loading: null });
  });

  it("asks no next page while a next page runs (catches: loading guard removed)", async () => {
    const { feed, loadPage } = await withFirstPage();
    feed.loadNextPage();

    feed.loadNextPage();

    expect(loadPage).toHaveBeenCalledTimes(2);
  });

  it("asks no next page while a reload runs (catches: loading guard reduced to the next page)", async () => {
    const { feed, loadPage } = await withFirstPage();
    feed.afterWrite();

    feed.loadNextPage();

    expect(loadPage).toHaveBeenCalledTimes(2);
  });

  it("asks no next page after a failed first load (catches: guard on a received first page removed, which would ask 0)", async () => {
    const { feed, calls, loadPage, fail } = setup();
    feed.setSession({ accountId: "12", connected: true });
    await fail(calls[0]);

    feed.loadNextPage();

    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it("ignores a next page answered before the reload that replaced it (catches: stale answer applied; stale request resetting the loading state)", async () => {
    const { feed, calls, answer, shownIds } = await withFirstPage();
    feed.loadNextPage();
    feed.afterWrite();

    await answer(calls[1], range(21, 20));
    expect(shownIds()).toEqual(range(1, 20).map((m) => m.id));
    expect(feed.getState().loading).toBe("reload");

    await answer(calls[2], range(101, 20));
    expect(shownIds()).toEqual(range(101, 20).map((m) => m.id));
    expect(feed.getState().loading).toBeNull();
  });

  it("ignores a next page answered after the reload that replaced it (catches: stale answer applied)", async () => {
    const { feed, calls, answer, shownIds } = await withFirstPage();
    feed.loadNextPage();
    feed.afterWrite();

    await answer(calls[2], range(101, 20));
    await answer(calls[1], range(21, 20));

    expect(shownIds()).toEqual(range(101, 20).map((m) => m.id));
    expect(feed.getState().loading).toBeNull();
  });

  it("shows only the new account's movements when a next page of the former one answers late (catches: stale answer applied across accounts)", async () => {
    const { feed, calls, answer, shownIds } = await withFirstPage();
    feed.loadNextPage();
    feed.setSession({ accountId: "13", connected: true });

    await answer(calls[1], range(21, 20));
    expect(shownIds()).toEqual([]);
    expect(feed.getState().loading).toBe("first");

    await answer(calls[2], range(501, 20));
    expect(calls[2]).toMatchObject({ accountId: "13", offset: 0 });
    expect(shownIds()).toEqual(range(501, 20).map((m) => m.id));
  });

  it("exposes no failure for a next page that fails after a reload replaced it (catches: stale failure exposed)", async () => {
    const { feed, calls, fail } = await withFirstPage();
    feed.loadNextPage();
    feed.afterWrite();

    await fail(calls[1]);

    expect(feed.getState()).toMatchObject({ nextPageFailed: false, loading: "reload" });
  });

  it("keeps the second of two reloads when the first answers last (catches: staleness checked for next pages only)", async () => {
    const { feed, calls, answer, shownIds } = await withFirstPage();
    feed.afterWrite();
    feed.afterWrite();

    await answer(calls[2], range(201, 20));
    await answer(calls[1], range(101, 20));

    expect(shownIds()).toEqual(range(201, 20).map((m) => m.id));
  });

  it("tells a first load, a reload and a next page apart, the list kept during a reload (catches: one loading state for all; list emptied at a reload)", async () => {
    const { feed, calls, answer } = setup();
    feed.setSession({ accountId: "12", connected: true });
    expect(feed.getState().loading).toBe("first");
    await answer(calls[0], range(1, 20));

    feed.loadNextPage();
    expect(feed.getState().loading).toBe("nextPage");
    await answer(calls[1], range(21, 20));

    feed.afterWrite();
    expect(feed.getState().loading).toBe("reload");
    expect(feed.getState().movements).toHaveLength(40);
  });

  it("asks the next page from 20 again after two pages then a reload (catches: received count not reset)", async () => {
    const { feed, calls, answer } = await withFirstPage();
    feed.loadNextPage();
    await answer(calls[1], range(21, 20));
    feed.afterWrite();
    await answer(calls[2], range(1, 20));

    feed.loadNextPage();

    expect(calls[3].offset).toBe(20);
  });

  it("opens the next page again once a reload brings a full page after the end (catches: end not reset)", async () => {
    const { feed, calls, answer } = await withFirstPage(range(1, 5));
    feed.afterWrite();
    await answer(calls[1], range(1, 20));

    feed.loadNextPage();

    expect(feed.getState().reachedEnd).toBe(false);
    expect(calls[2].offset).toBe(20);
  });

  it("keeps the movements and exposes the failure of a next page (catches: list emptied at the failure)", async () => {
    const { feed, calls, fail } = await withFirstPage();
    feed.loadNextPage();
    await fail(calls[1]);

    expect(feed.getState()).toMatchObject({ nextPageFailed: true, loading: null, firstLoadFailed: false });
    expect(feed.getState().movements).toHaveLength(20);
  });

  it("asks no next page after a failed one, until retried (catches: failure guard removed, looping on failures)", async () => {
    const { feed, calls, loadPage, fail } = await withFirstPage();
    feed.loadNextPage();
    await fail(calls[1]);

    feed.loadNextPage();

    expect(loadPage).toHaveBeenCalledTimes(2);
  });

  it("asks the same offset again when a failed next page is retried (catches: offset moved on despite the failure)", async () => {
    const { feed, calls, fail } = await withFirstPage();
    feed.loadNextPage();
    await fail(calls[1]);

    feed.retry();

    expect(calls.map((c) => c.offset)).toEqual([0, 20, 20]);
    expect(feed.getState()).toMatchObject({ nextPageFailed: false, loading: "nextPage" });
  });

  it("exposes a failed first load apart from an empty list, and retries it as a first load (catches: failure shown as an empty list)", async () => {
    const { feed, calls, fail } = setup();
    feed.setSession({ accountId: "12", connected: true });
    await fail(calls[0]);

    expect(feed.getState()).toMatchObject({ movements: [], firstLoadFailed: true, reachedEnd: false, loading: null });

    feed.retry();

    expect(calls.map((c) => c.offset)).toEqual([0, 0]);
    expect(feed.getState().loading).toBe("first");
  });

  it("clears a first load failure once a reload succeeds (catches: first load failure not cleared)", async () => {
    const { feed, calls, answer, fail } = setup();
    feed.setSession({ accountId: "12", connected: true });
    await fail(calls[0]);
    feed.retry();

    await answer(calls[1], range(1, 20));

    expect(feed.getState().firstLoadFailed).toBe(false);
  });

  it("clears a next page failure once a reload succeeds (catches: next page failure not cleared)", async () => {
    const { feed, calls, answer, fail } = await withFirstPage();
    feed.loadNextPage();
    await fail(calls[1]);
    feed.afterWrite();

    await answer(calls[2], range(1, 20));

    expect(feed.getState().nextPageFailed).toBe(false);
  });

  it("keeps the list and calls no toast when a reload after a write fails (catches: toast on reloads after a write; list emptied at the failure)", async () => {
    const { feed, calls, onPullFailed, fail } = await withFirstPage();
    feed.afterWrite();

    await fail(calls[1]);

    expect(feed.getState()).toMatchObject({ loading: null, firstLoadFailed: false });
    expect(feed.getState().movements).toHaveLength(20);
    expect(onPullFailed).not.toHaveBeenCalled();
  });

  it("exposes no failure and ends the loading of a first load rejected for an account change (catches: AccountChangedError taken for a failure; loading left running)", async () => {
    const { feed, calls, fail } = setup();
    feed.setSession({ accountId: "12", connected: true });

    await fail(calls[0], new AccountChangedError());

    expect(feed.getState()).toMatchObject({ loading: null, firstLoadFailed: false });
  });

  it("exposes no failure and ends the loading of a next page rejected for an account change (catches: AccountChangedError taken for a failure; loading left running)", async () => {
    const { feed, calls, fail } = await withFirstPage();
    feed.loadNextPage();

    await fail(calls[1], new AccountChangedError());

    expect(feed.getState()).toMatchObject({ loading: null, nextPageFailed: false });
  });

  it("asks nothing without an account or while disconnected (catches: loading without a session)", () => {
    const { feed, loadPage } = setup();

    feed.setSession({ accountId: null, connected: true });
    feed.setSession({ accountId: "12", connected: false });

    expect(loadPage).not.toHaveBeenCalled();
    expect(feed.getState()).toMatchObject({ movements: [], loading: null });
  });

  it("empties the list at a logout and loads it again from the start at the login on the same account (catches: list kept at logout; login without a reload)", async () => {
    const { feed, calls } = await withFirstPage();

    feed.setSession({ accountId: "12", connected: false });
    expect(feed.getState().movements).toEqual([]);

    feed.setSession({ accountId: "12", connected: true });
    expect(calls.map((c) => c.offset)).toEqual([0, 0]);
    expect(feed.getState().loading).toBe("first");
  });

  it("neither loads nor fails on any operation without a session (catches: operation without a session guard)", async () => {
    const { feed, calls, loadPage, fail } = setup();
    feed.setSession({ accountId: "12", connected: true });
    await fail(calls[0]);
    feed.setSession({ accountId: "12", connected: false });

    feed.loadNextPage();
    feed.retry();
    feed.afterWrite();

    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(feed.getState()).toMatchObject({ loading: null, firstLoadFailed: false, nextPageFailed: false });
  });

  it("loads once for a session given twice (catches: repeated session reloading)", () => {
    const { feed, loadPage } = setup();

    feed.setSession({ accountId: "12", connected: true });
    feed.setSession({ accountId: "12", connected: true });

    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it("stays a first load when a write comes during the first load (catches: state turned to reload as soon as a reload is asked)", () => {
    const { feed } = setup();
    feed.setSession({ accountId: "12", connected: true });

    feed.afterWrite();

    expect(feed.getState().loading).toBe("first");
  });

  it("stays a first load when a write comes after an empty first page, and exposes its failure (catches: first load told by a page received rather than by movements shown)", async () => {
    const { feed, calls, fail } = await withFirstPage([]);

    feed.afterWrite();
    expect(feed.getState().loading).toBe("first");

    await fail(calls[1]);
    expect(feed.getState()).toMatchObject({ loading: null, firstLoadFailed: true });
  });

  it("stays a first load when a write comes after a failed first load (catches: state turned to reload as soon as a reload is asked)", async () => {
    const { feed, calls, fail } = setup();
    feed.setSession({ accountId: "12", connected: true });
    await fail(calls[0]);

    feed.afterWrite();

    expect(feed.getState().loading).toBe("first");
  });
});
