// Pizzico — apps/web/src/storage.ts
// Riferimento manifesto: §3.1 (OPFS + IndexedDB), §10 Fase 1 Step H
// Licenza: MIT OR Apache-2.0

const OPFS_AUTOSAVE_FILE = 'autosave.pizzico';
const IDB_DATABASE = 'pizzico_storage';
const IDB_VERSION = 1;
const IDB_STORE = 'projects';
const IDB_AUTOSAVE_KEY = 'autosave';

/**
 * Salva i byte del progetto nell'Origin Private File System (OPFS) se supportato.
 */
async function saveToOpfs(bytes: Uint8Array): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(OPFS_AUTOSAVE_FILE, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(bytes as any);
      await writable.close();
      return true;
    } catch (err) {
      console.warn('[Storage] Scrittura OPFS fallita, fallback a IndexedDB:', err);
    }
  }
  return false;
}

/**
 * Legge i byte del progetto dall'Origin Private File System (OPFS).
 */
async function loadFromOpfs(): Promise<Uint8Array | null> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(OPFS_AUTOSAVE_FILE);
      const file = await fileHandle.getFile();
      if (file.size === 0) return null;
      const buffer = await file.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (_) {
      // File non presente in OPFS
    }
  }
  return null;
}

/**
 * Inizializza o apre il database IndexedDB per il fallback storage.
 */
function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB non disponibile'));
    }
    const request = indexedDB.open(IDB_DATABASE, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva i byte del progetto in IndexedDB.
 */
async function saveToIndexedDb(bytes: Uint8Array): Promise<boolean> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(bytes, IDB_AUTOSAVE_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[Storage] Scrittura IndexedDB fallita:', err);
    return false;
  }
}

/**
 * Legge i byte del progetto da IndexedDB.
 */
async function loadFromIndexedDb(): Promise<Uint8Array | null> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_AUTOSAVE_KEY);
      req.onsuccess = () => {
        const val = req.result;
        if (val instanceof Uint8Array) {
          resolve(val);
        } else if (val instanceof ArrayBuffer) {
          resolve(new Uint8Array(val));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}

/**
 * Salva una copia di sicurezza automatica del progetto.
 * Prova prima con OPFS ad alte prestazioni; se non disponibile o fallisce, usa IndexedDB.
 */
export async function saveAutosave(bytes: Uint8Array): Promise<'opfs' | 'indexeddb' | 'none'> {
  const opfsSuccess = await saveToOpfs(bytes);
  if (opfsSuccess) {
    return 'opfs';
  }
  const idbSuccess = await saveToIndexedDb(bytes);
  if (idbSuccess) {
    return 'indexeddb';
  }
  return 'none';
}

/**
 * Recupera l'ultimo salvataggio automatico (da OPFS o IndexedDB).
 */
export async function loadAutosave(): Promise<{ bytes: Uint8Array; source: 'opfs' | 'indexeddb' } | null> {
  const opfsData = await loadFromOpfs();
  if (opfsData && opfsData.length > 0) {
    return { bytes: opfsData, source: 'opfs' };
  }
  const idbData = await loadFromIndexedDb();
  if (idbData && idbData.length > 0) {
    return { bytes: idbData, source: 'indexeddb' };
  }
  return null;
}

/**
 * Cancella il salvataggio automatico.
 */
export async function clearAutosave(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(OPFS_AUTOSAVE_FILE);
    } catch (_) {}
  }
  try {
    const db = await openIndexedDb();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(IDB_AUTOSAVE_KEY);
  } catch (_) {}
}
