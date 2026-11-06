import { describe, expect, it } from "vitest";
import { consumePuzzleSetHandoff, enqueuePuzzleSetHandoff } from "./handoff";
import { createPuzzleSet, type PuzzleSet } from "./index";

type StoredRecord = { id: string; set: unknown; queuedAt: string };

function createMemoryIndexedDB(): IDBFactory {
  const stores = new Map<string, Map<string, StoredRecord>>();

  return {
    open(_name: string, _version?: number) {
      const request = {
        result: null as unknown as IDBDatabase,
        error: null as DOMException | null,
        onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
      };

      const objectStoreNames = {
        contains: (storeName: string) => stores.has(storeName),
      } as DOMStringList;

      const db = {
        objectStoreNames,
        createObjectStore(storeName: string) {
          if (!stores.has(storeName)) {
            stores.set(storeName, new Map());
          }
          return {} as IDBObjectStore;
        },
        transaction(storeName: string | string[]) {
          const name = Array.isArray(storeName) ? storeName[0] : storeName;
          const map = stores.get(name) ?? new Map<string, StoredRecord>();
          stores.set(name, map);

          const tx = {
            error: null as DOMException | null,
            oncomplete: null as ((event: Event) => void) | null,
            onerror: null as ((event: Event) => void) | null,
            onabort: null as ((event: Event) => void) | null,
            objectStore() {
              return {
                put(value: StoredRecord) {
                  const req = { result: value.id, error: null, onsuccess: null as ((e: Event) => void) | null, onerror: null as ((e: Event) => void) | null };
                  queueMicrotask(() => {
                    map.set(value.id, structuredClone(value));
                    req.onsuccess?.(new Event("success"));
                  });
                  return req;
                },
                get(key: string) {
                  const req = { result: undefined as StoredRecord | undefined, error: null, onsuccess: null as ((e: Event) => void) | null, onerror: null as ((e: Event) => void) | null };
                  queueMicrotask(() => {
                    const value = map.get(key);
                    req.result = value ? structuredClone(value) : undefined;
                    req.onsuccess?.(new Event("success"));
                  });
                  return req;
                },
                delete(key: string) {
                  const req = { result: undefined, error: null, onsuccess: null as ((e: Event) => void) | null, onerror: null as ((e: Event) => void) | null };
                  queueMicrotask(() => {
                    map.delete(key);
                    req.onsuccess?.(new Event("success"));
                  });
                  return req;
                },
              } as unknown as IDBObjectStore;
            },
          };

          setTimeout(() => {
            tx.oncomplete?.(new Event("complete"));
          }, 0);

          return tx as unknown as IDBTransaction;
        },
        close() {},
      } as unknown as IDBDatabase;

      request.result = db;
      queueMicrotask(() => {
        request.onupgradeneeded?.(new Event("upgradeneeded") as IDBVersionChangeEvent);
        request.onsuccess?.(new Event("success"));
      });

      return request as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;
}

async function samplePuzzleSet(name = "Tactical Sprint"): Promise<PuzzleSet> {
  return createPuzzleSet({
    id: "handoff-set-1",
    name,
    createdAt: "2026-10-16T08:00:00.000Z",
    source: {
      name: "Lichess Puzzle Database",
      url: "https://database.lichess.org/",
      snapshot: "2026-10-05",
      license: "CC0",
    },
    selection: {
      ratingMin: 1100,
      ratingMax: 1600,
      themes: ["short"],
      themeMatch: "all",
      count: 1,
      seed: "woodpecker-2026",
    },
    puzzles: [
      {
        id: "0000H",
        fen: "r4rk1/pp3ppp/8/2bqp2b/3N4/P2Bn2P/1PPN1P2/R1BQ1RK1 w - - 1 15",
        moves: ["d1h5", "d5g2"],
        rating: 1554,
        ratingDeviation: 223,
        popularity: 100,
        nbPlays: 11,
        themes: ["mate", "mateIn1", "middlegame", "oneMove"],
        gameUrl: "https://lichess.org/EwHRkfas#29",
        openingTags: [],
        dailyDate: null,
      },
    ],
  });
}

describe("Puzzle Set Handoff inbox", () => {
  it("stores a pending Puzzle Set payload, returns it once on consume, and clears the inbox", async () => {
    const idb = createMemoryIndexedDB();
    const set = await samplePuzzleSet();

    await enqueuePuzzleSetHandoff(set, idb);

    const firstConsume = await consumePuzzleSetHandoff(idb);
    expect(firstConsume).toEqual(set);

    const secondConsume = await consumePuzzleSetHandoff(idb);
    expect(secondConsume).toBeNull();
  });

  it("returns null when no pending Puzzle Set exists in the inbox", async () => {
    const idb = createMemoryIndexedDB();
    await expect(consumePuzzleSetHandoff(idb)).resolves.toBeNull();
  });
});
