// IndexedDB wrapper for image cache storage
// Much larger storage capacity than localStorage (typically 50MB+)
// Supports both vocab images (keyed by wordId) and collage images (keyed by "collage_0", etc)

const DB_NAME = 'VocabByPawDB';
const DB_VERSION = 2; // Bump version to support string keys
const STORE_NAME = 'imageCache';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Delete old store if exists (to migrate from number to string keys)
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        // Create new store with string key
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
    });
  }
  return dbPromise;
};

export interface ImageCacheEntry {
  id: string; // "vocab_123" for vocab, "collage_0" for collage
  imageData: string;
}

// Get all cached images (returns Record<string, string>)
export const getAllImages = async (): Promise<Record<string, string>> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const result: Record<string, string> = {};
        (request.result as ImageCacheEntry[]).forEach(entry => {
          result[entry.id] = entry.imageData;
        });
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB getAllImages error:', error);
    return {};
  }
};

// Get single image by string key
export const getImage = async (id: string): Promise<string | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const entry = request.result as ImageCacheEntry | undefined;
        resolve(entry?.imageData || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB getImage error:', error);
    return null;
  }
};

// Save single image
export const saveImage = async (id: string, imageData: string): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id, imageData });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB saveImage error:', error);
  }
};

// Save multiple images (batch) - accepts Record<string, string>
export const saveAllImages = async (cache: Record<string, string>): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      Object.entries(cache).forEach(([id, imageData]) => {
        store.put({ id, imageData });
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('IndexedDB saveAllImages error:', error);
  }
};

// Delete single image
export const deleteImage = async (id: string): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB deleteImage error:', error);
  }
};

// Clear all images
export const clearAllImages = async (): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB clearAllImages error:', error);
  }
};
