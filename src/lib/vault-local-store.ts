/**
 * Browser-side vault media (IndexedDB).
 * Used when the server has no disk (Vercel) so owner can still upload
 * IRL photos/videos and view them on this device.
 */

export type LocalVaultItem = {
  id: string;
  companionId: string;
  kind: "library" | "videos" | "generated";
  mediaType: "image" | "video";
  name: string;
  /** blob: or data: URL for display */
  url: string;
  size: number;
  mtime: number;
  /** source: local browser store */
  source: "local";
};

const DB_NAME = "kohar_vault_v1";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error || new Error("idb open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("companion", "companionId", { unique: false });
        os.createIndex("kind", "kind", { unique: false });
      }
    };
  });
}

function recordId(companionId: string, kind: string, name: string) {
  return `${companionId}:${kind}:${name}`;
}

type StoredRow = {
  id: string;
  companionId: string;
  kind: "library" | "videos" | "generated";
  mediaType: "image" | "video";
  name: string;
  size: number;
  mtime: number;
  blob: Blob;
};

export async function localVaultList(
  companionId: string,
  kind?: "library" | "videos" | "generated" | "all",
): Promise<LocalVaultItem[]> {
  if (typeof window === "undefined" || !window.indexedDB) return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const os = tx.objectStore(STORE);
    const req = os.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const rows = (req.result as StoredRow[]).filter((r) => {
        if (r.companionId !== companionId) return false;
        if (!kind || kind === "all") return true;
        return r.kind === kind;
      });
      const items: LocalVaultItem[] = rows
        .map((r) => ({
          id: r.id,
          companionId: r.companionId,
          kind: r.kind,
          mediaType: r.mediaType,
          name: r.name,
          url: URL.createObjectURL(r.blob),
          size: r.size,
          mtime: r.mtime,
          source: "local" as const,
        }))
        .sort((a, b) => b.mtime - a.mtime);
      resolve(items);
    };
  });
}

export async function localVaultSave(
  companionId: string,
  kind: "library" | "videos" | "generated",
  file: File,
): Promise<LocalVaultItem> {
  const isVideo = /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name) || file.type.startsWith("video/");
  let targetKind = kind;
  if (isVideo && kind === "library") targetKind = "videos";
  if (!isVideo && kind === "videos") targetKind = "library";

  const name = file.name.replace(/[^\w.\- ()[\]]+/g, "_") || `file-${Date.now()}`;
  const id = recordId(companionId, targetKind, name);
  const row: StoredRow = {
    id,
    companionId,
    kind: targetKind,
    mediaType: isVideo ? "video" : "image",
    name,
    size: file.size,
    mtime: Date.now(),
    blob: file,
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return {
    id,
    companionId,
    kind: targetKind,
    mediaType: row.mediaType,
    name,
    url: URL.createObjectURL(file),
    size: file.size,
    mtime: row.mtime,
    source: "local",
  };
}

export async function localVaultDelete(id: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function localVaultCounts(companionId: string) {
  const all = await localVaultList(companionId, "all");
  return {
    library: all.filter((i) => i.kind === "library").length,
    videos: all.filter((i) => i.kind === "videos").length,
    generated: all.filter((i) => i.kind === "generated").length,
  };
}
