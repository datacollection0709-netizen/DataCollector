// IndexedDB storage for audit proof files (photos & PDFs)
export interface StoredProof {
  id: string;
  userId?: string;
  fieldCode: string;
  yearCode?: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl?: string; // Base64 data URL for images/PDFs
  hyperlink?: string; // External URL / Drive link
  fileUrl?: string; // Public HTTPS direct link
  uploadedAt: string;
}

const DB_NAME = 'Attribute3_Proof_Storage';
const DB_VERSION = 1;
const STORE_NAME = 'proof_files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment.'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('fieldCode', 'fieldCode', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const proofStorage = {
  async saveProof(proof: StoredProof): Promise<void> {
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(proof);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      // Fallback to localStorage if IndexedDB fails
      try {
        const key = `proof_${proof.id}`;
        localStorage.setItem(key, JSON.stringify(proof));
      } catch (err) {
        console.warn('Proof fallback save warning:', err);
      }
    }
  },

  async getProof(id: string): Promise<StoredProof | null> {
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      const local = localStorage.getItem(`proof_${id}`);
      return local ? JSON.parse(local) : null;
    }
  },

  async getProofsByField(fieldCode: string): Promise<StoredProof[]> {
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('fieldCode');
        const req = index.getAll(fieldCode);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return [];
    }
  },

  async getAllProofs(): Promise<StoredProof[]> {
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return [];
    }
  },

  async deleteProof(id: string): Promise<void> {
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      localStorage.removeItem(`proof_${id}`);
    }
  },

  async clearAllProofs(): Promise<void> {
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      // ignore
    }
  },
};
