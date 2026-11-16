// Proof capture: shrink photos before upload, cap videos at 15 seconds,
// and keep files in IndexedDB while the app runs without a server.

export const MAX_VIDEO_SECONDS = 15;

export async function compressPhoto(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  return new Promise(res => canvas.toBlob(b => res(b ?? file), 'image/jpeg', quality));
}

export function videoDuration(file: File): Promise<number> {
  return new Promise(res => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); res(v.duration); };
    v.onerror = () => res(0);
    v.src = URL.createObjectURL(file);
  });
}

const DB = 'fe-proofs', STORE = 'files';
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const d = await db();
  await new Promise<void>((res, rej) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const d = await db();
  return new Promise((res, rej) => {
    const r = d.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => res(r.result as Blob | undefined); r.onerror = () => rej(r.error);
  });
}

export async function deleteBlobs(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const d = await db();
  await new Promise<void>(res => {
    const tx = d.transaction(STORE, 'readwrite');
    keys.forEach(k => tx.objectStore(STORE).delete(k));
    tx.oncomplete = () => res(); tx.onerror = () => res();
  });
}

/** Square, center-cropped profile picture as a small JPEG data URL. */
export async function avatarFromFile(file: File, size = 320): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.82);
}
