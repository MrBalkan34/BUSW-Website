const DB_NAME = "busw-website-builder";
const STORE = "projects";
const KEY = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser does not allow saving projects."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open storage."));
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? new Error("Storage failed."));
      tx.onabort = () => reject(tx.error ?? new Error("Storage is full or was blocked."));
    });
  } finally {
    db.close();
  }
}

/** Stores the current project in this browser. Resolves once the write is durable. */
export function saveDraft(project: unknown): Promise<unknown> {
  return run("readwrite", (store) => store.put(project, KEY));
}

/** Returns the stored (unvalidated) project, or undefined if there is none. */
export function loadDraft(): Promise<unknown> {
  return run("readonly", (store) => store.get(KEY));
}

export function clearDraft(): Promise<unknown> {
  return run("readwrite", (store) => store.delete(KEY));
}
