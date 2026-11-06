import type { PuzzleSet } from "./schemas";

const HANDOFF_DB_NAME = "offline-woodpecker-handoff";
const HANDOFF_DB_VERSION = 1;
const HANDOFF_STORE_NAME = "inbox";
const PENDING_HANDOFF_KEY = "pending";

type HandoffRecord = {
  id: string;
  set: unknown;
  queuedAt: string;
};

export function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openHandoffDatabase(factory: IDBFactory = globalThis.indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!factory) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = factory.open(HANDOFF_DB_NAME, HANDOFF_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(HANDOFF_STORE_NAME)) {
        database.createObjectStore(HANDOFF_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open handoff IndexedDB"));
  });
}

export async function enqueuePuzzleSetHandoff(
  set: PuzzleSet,
  factory: IDBFactory = globalThis.indexedDB,
): Promise<void> {
  const database = await openHandoffDatabase(factory);
  try {
    const transaction = database.transaction(HANDOFF_STORE_NAME, "readwrite");
    const record: HandoffRecord = {
      id: PENDING_HANDOFF_KEY,
      set,
      queuedAt: new Date().toISOString(),
    };
    transaction.objectStore(HANDOFF_STORE_NAME).put(record);
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

export async function consumePuzzleSetHandoff(
  factory: IDBFactory = globalThis.indexedDB,
): Promise<unknown | null> {
  if (!factory) return null;
  const database = await openHandoffDatabase(factory);
  try {
    const transaction = database.transaction(HANDOFF_STORE_NAME, "readwrite");
    const complete = transactionComplete(transaction);
    const store = transaction.objectStore(HANDOFF_STORE_NAME);
    const record = await requestValue<HandoffRecord | undefined>(store.get(PENDING_HANDOFF_KEY));
    if (record) {
      await requestValue(store.delete(PENDING_HANDOFF_KEY));
    }
    await complete;
    return record && "set" in record ? record.set : null;
  } finally {
    database.close();
  }
}
