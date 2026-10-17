/**
 * Lightweight, zero-dependency IndexedDB storage wrapper.
 * Provides quota-free storage for local statuses, vitrines, and media attachments.
 */

const DB_NAME = 'vorcarozap_storage';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

let dbPromise = null;

function openDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[IndexedDB] Could not open database:', req.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('[IndexedDB] Exception opening database:', err);
        resolve(null);
      }
    });
  }

  return dbPromise;
}

export async function idbGet(key) {
  try {
    const db = await openDb();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSet(key, value) {
  try {
    const db = await openDb();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function idbDelete(key) {
  try {
    const db = await openDb();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
