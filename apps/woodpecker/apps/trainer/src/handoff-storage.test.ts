import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  completePuzzle,
  consumePuzzleSetHandoff,
  createPuzzleSet,
  enqueuePuzzleSetHandoff,
  type Puzzle,
  type PuzzleSet,
} from "@offline-woodpecker/domain";
import {
  consumePendingPuzzleSetHandoff,
  deleteSetAndRuns,
  exportTrainerBackup,
  loadTrainerData,
  mergeTrainerBackup,
  saveActiveRunTime,
  savePuzzleSet,
  saveRun,
  setArchived,
  startRunAtomically,
} from "./storage";

type StoredRecord = { id: string; setId?: string; [key: string]: unknown };

function createMemoryIndexedDB(): IDBFactory {
  const databases = new Map<string, Map<string, Map<string, StoredRecord>>>();

  return {
    open(dbName: string, _version?: number) {
      const request = {
        result: null as unknown as IDBDatabase,
        error: null as DOMException | null,
        onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
      };

      const isNew = !databases.has(dbName);
      const stores = databases.get(dbName) ?? new Map<string, Map<string, StoredRecord>>();
      databases.set(dbName, stores);

      const objectStoreNames = {
        contains: (storeName: string) => stores.has(storeName),
      } as DOMStringList;

      const db = {
        objectStoreNames,
        createObjectStore(storeName: string) {
          if (!stores.has(storeName)) {
            stores.set(storeName, new Map());
          }
          return {
            createIndex() {},
          } as unknown as IDBObjectStore;
        },
        transaction(storeNames: string | string[]) {
          const names = Array.isArray(storeNames) ? storeNames : [storeNames];
          for (const name of names) {
            if (!stores.has(name)) stores.set(name, new Map());
          }

          let pendingOps = 0;
          let completed = false;
          let aborted = false;

          const tx = {
            error: null as DOMException | null,
            oncomplete: null as ((event: Event) => void) | null,
            onerror: null as ((event: Event) => void) | null,
            onabort: null as ((event: Event) => void) | null,
            abort() {
              aborted = true;
              queueMicrotask(() => {
                tx.onabort?.(new Event("abort"));
              });
            },
            objectStore(storeName: string) {
              const map = stores.get(storeName)!;
              function schedule<T>(fn: () => T): IDBRequest<T> {
                pendingOps += 1;
                const req = {
                  result: undefined as unknown as T,
                  error: null as DOMException | null,
                  onsuccess: null as ((e: Event) => void) | null,
                  onerror: null as ((e: Event) => void) | null,
                };
                queueMicrotask(() => {
                  if (aborted) return;
                  req.result = fn();
                  req.onsuccess?.(new Event("success"));
                  pendingOps -= 1;
                  queueMicrotask(() => {
                    if (!aborted && !completed && pendingOps === 0) {
                      completed = true;
                      tx.oncomplete?.(new Event("complete"));
                    }
                  });
                });
                return req as unknown as IDBRequest<T>;
              }

              return {
                put(value: StoredRecord) {
                  return schedule(() => {
                    map.set(value.id, structuredClone(value));
                    return value.id;
                  });
                },
                get(key: string) {
                  return schedule(() => {
                    const value = map.get(key);
                    return value ? structuredClone(value) : undefined;
                  });
                },
                getAll() {
                  return schedule(() => Array.from(map.values(), (value) => structuredClone(value)));
                },
                delete(key: string) {
                  return schedule(() => {
                    map.delete(key);
                    return undefined;
                  });
                },
                index(indexName: string) {
                  return {
                    getAll(query: string) {
                      return schedule(() =>
                        Array.from(map.values())
                          .filter((item) => item[indexName] === query)
                          .map((item) => structuredClone(item)),
                      );
                    },
                  };
                },
              } as unknown as IDBObjectStore;
            },
          };

          queueMicrotask(() => {
            if (!aborted && !completed && pendingOps === 0) {
              completed = true;
              tx.oncomplete?.(new Event("complete"));
            }
          });

          return tx as unknown as IDBTransaction;
        },
        close() {},
      } as unknown as IDBDatabase;

      request.result = db;
      queueMicrotask(() => {
        if (isNew) {
          request.onupgradeneeded?.(new Event("upgradeneeded") as IDBVersionChangeEvent);
        }
        request.onsuccess?.(new Event("success"));
      });

      return request as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;
}

const samplePuzzles: Puzzle[] = [
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
  {
    id: "0008Q",
    fen: "8/4R3/1p2P3/p4r2/P6p/1P3Pk1/4K3/8 w - - 1 64",
    moves: ["e7f7", "f5e5", "e2f1", "e5e6"],
    rating: 1383,
    ratingDeviation: 81,
    popularity: 92,
    nbPlays: 771,
    themes: ["advantage", "endgame", "rookEndgame", "short"],
    gameUrl: "https://lichess.org/MQSyb3KW#127",
    openingTags: [],
    dailyDate: null,
  },
];

async function buildSampleSet(overrides: { id?: string; name?: string; seed?: string } = {}): Promise<PuzzleSet> {
  return createPuzzleSet({
    id: overrides.id ?? "handoff-set-1",
    name: overrides.name ?? "Tactical Sprint",
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
      count: 2,
      seed: overrides.seed ?? "woodpecker-2026",
    },
    puzzles: samplePuzzles,
  });
}

describe("Trainer Puzzle Set Handoff consumption", () => {
  const originalIndexedDB = globalThis.indexedDB;

  beforeEach(() => {
    globalThis.indexedDB = createMemoryIndexedDB();
  });

  afterEach(() => {
    globalThis.indexedDB = originalIndexedDB;
  });

  it("imports a new handed-off Puzzle Set, starts an active Run on Puzzle 1, and clears the handoff inbox", async () => {
    const set = await buildSampleSet();
    await enqueuePuzzleSetHandoff(set);

    const existing = await loadTrainerData();
    const result = await consumePendingPuzzleSetHandoff(existing);

    expect(result).not.toBeNull();
    expect(result?.run.status).toBe("active");
    expect(result?.run.currentPuzzleIndex).toBe(0);
    expect(result?.data.sets).toHaveLength(1);
    expect(result?.data.sets[0]?.set.contentHash).toBe(set.contentHash);
    expect(result?.data.sets[0]?.archived).toBe(false);
    expect(result?.data.runs).toHaveLength(1);
    expect(result?.data.runs[0]?.id).toBe(result?.run.id);

    // Inbox is cleared
    await expect(consumePuzzleSetHandoff()).resolves.toBeNull();

    // Persisted in Trainer IndexedDB
    const persisted = await loadTrainerData();
    expect(persisted.sets).toHaveLength(1);
    expect(persisted.runs).toHaveLength(1);
    expect(persisted.runs[0]?.status).toBe("active");
  });

  it("checkpoints active time without reviving a Run abandoned in another tab", async () => {
    const set = await buildSampleSet();
    await savePuzzleSet(set, false);
    const started = await startRunAtomically(set);

    const checkpoint = await saveActiveRunTime(started.run.id, 4_321);
    expect(checkpoint?.activeTimeMs).toBe(4_321);

    await startRunAtomically(set);
    await expect(saveActiveRunTime(started.run.id, 9_876)).resolves.toBeNull();

    const persisted = await loadTrainerData();
    expect(persisted.runs.find((run) => run.id === started.run.id)).toMatchObject({ status: "abandoned", activeTimeMs: 4_321 });
  });

  it("restores archived sets idempotently without changing identity, Runs, or backup compatibility", async () => {
    const set = await buildSampleSet();
    const neverPlayed = await buildSampleSet({ id: "never-played", name: "Never played", seed: "never-played" });
    await savePuzzleSet(set);
    await savePuzzleSet(neverPlayed, true);
    const first = await startRunAtomically(set);
    const advanced = completePuzzle(first.run);
    if (advanced.status !== "active") throw new Error("Expected Puzzle 2");
    const completed = completePuzzle(advanced);
    await saveRun(completed);
    const second = await startRunAtomically(set);
    await saveActiveRunTime(second.run.id, 12345);
    await startRunAtomically(set); // retains the second Run as abandoned
    await setArchived(set.id, true);
    const before = await loadTrainerData();
    expect(before.sets.every((record) => record.archived)).toBe(true);
    expect(before.runs.map((run) => run.status)).toEqual(["completed", "abandoned", "active"]);

    await setArchived(set.id, false);
    await setArchived(set.id, false);
    await setArchived(neverPlayed.id, false);
    const restored = await loadTrainerData();
    expect(restored.sets).toEqual([{ set, archived: false }, { set: neverPlayed, archived: false }]);
    expect(restored.runs).toEqual(before.runs);

    const backup = await exportTrainerBackup(restored);
    await deleteSetAndRuns(set.id);
    await deleteSetAndRuns(neverPlayed.id);
    expect(await loadTrainerData()).toEqual({ sets: [], runs: [] });
    await mergeTrainerBackup(backup, await loadTrainerData());
    const reimported = await loadTrainerData();
    expect(reimported.sets).toEqual(restored.sets);
    expect(reimported.runs).toEqual(before.runs);
  });

  it("rejects restoring a missing set without recreating it or changing saved Runs", async () => {
    const set = await buildSampleSet();
    await savePuzzleSet(set, true);
    await startRunAtomically(set);
    const before = await loadTrainerData();
    await expect(setArchived("missing-set", false)).rejects.toThrow("Puzzle Set not found");
    expect(await loadTrainerData()).toEqual(before);
  });

  it("resumes an existing active Run at its current puzzle without duplicating the Puzzle Set or abandoning the Run when handed off again", async () => {
    const initialSet = await buildSampleSet({ id: "original-id", name: "Original Sprint" });
    await savePuzzleSet(initialSet, false);
    const started = await startRunAtomically(initialSet);
    const advancedRun = completePuzzle(started.run, "2026-10-16T08:05:00.000Z");
    if (advancedRun.status !== "active") throw new Error("Expected active run after puzzle 1");
    await saveRun(advancedRun);

    // Generate again with same selection & puzzles (same contentHash, different id/name)
    const repeatedSet = await buildSampleSet({ id: "new-id", name: "Repeated Sprint" });
    expect(repeatedSet.contentHash).toBe(initialSet.contentHash);
    await enqueuePuzzleSetHandoff(repeatedSet);

    const existing = await loadTrainerData();
    const result = await consumePendingPuzzleSetHandoff(existing);

    expect(result).not.toBeNull();
    // Same active Run resumed at puzzle index 1 (Puzzle 2)
    expect(result?.run.id).toBe(advancedRun.id);
    expect(result?.run.currentPuzzleIndex).toBe(1);
    // Set not duplicated
    expect(result?.data.sets).toHaveLength(1);
    expect(result?.data.sets[0]?.set.id).toBe(initialSet.id);
    // No abandoned runs created
    expect(result?.data.runs).toHaveLength(1);
    expect(result?.data.runs.filter((run) => run.status === "abandoned")).toHaveLength(0);
  });

  it("unarchives an existing archived Puzzle Set and starts a new active Run when no active Run exists", async () => {
    const archivedSet = await buildSampleSet({ id: "archived-set-id", name: "Archived Sprint" });
    await savePuzzleSet(archivedSet, true);

    const repeatedSet = await buildSampleSet({ id: "repeated-archived-id", name: "Archived Sprint" });
    await enqueuePuzzleSetHandoff(repeatedSet);

    const existing = await loadTrainerData();
    expect(existing.sets[0]?.archived).toBe(true);

    const result = await consumePendingPuzzleSetHandoff(existing);

    expect(result).not.toBeNull();
    expect(result?.data.sets).toHaveLength(1);
    expect(result?.data.sets[0]?.set.id).toBe(archivedSet.id);
    expect(result?.data.sets[0]?.archived).toBe(false);
    expect(result?.run.status).toBe("active");
    expect(result?.run.setId).toBe(archivedSet.id);
    expect(result?.run.currentPuzzleIndex).toBe(0);

    const persisted = await loadTrainerData();
    expect(persisted.sets).toHaveLength(1);
    expect(persisted.sets[0]?.archived).toBe(false);
    expect(persisted.runs).toHaveLength(1);
    expect(persisted.runs[0]?.status).toBe("active");
  });
});
