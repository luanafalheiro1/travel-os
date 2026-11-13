import { useSyncExternalStore } from 'react';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { DB, Trip } from '../types';
import { seed } from '../data/seed';
import { patch2027 } from '../data/europa2027';

const KEY = 'travelos:db:v1';

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const db = JSON.parse(raw) as DB;
      if (db && db.version === 1 && Array.isArray(db.trips)) return patch2027({ ...seed(), ...db, settings: { ...seed().settings, ...db.settings } });
    }
  } catch { /* armazenamento indisponível */ }
  return seed();
}

let state: DB = load();
const subs = new Set<() => void>();
let saveTimer: number | undefined;
export let saveError = false;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); saveError = false; }
    catch { saveError = true; }
    subs.forEach(f => f());
  }, 250);
}

/** Altera o banco: recebe um rascunho clonado que pode ser modificado. */
export function update(fn: (draft: DB) => void) {
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  persist();
  subs.forEach(f => f());
}

export function updateTrip(id: string, fn: (t: Trip) => void) {
  update(db => { const t = db.trips.find(x => x.id === id); if (t) fn(t); });
}

export function getDB() { return state; }

export function useDB(): DB {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => state);
}

export function replaceDB(db: DB) { state = db; persist(); subs.forEach(f => f()); }
export function resetDB() { state = seed(); persist(); subs.forEach(f => f()); }

/* ---------- fotos (IndexedDB) ---------- */
const urlCache = new Map<string, string>();
export async function savePhotoBlob(id: string, blob: Blob) { await idbSet('photo:' + id, blob); }
export async function photoURL(id: string): Promise<string | null> {
  if (urlCache.has(id)) return urlCache.get(id)!;
  const b = await idbGet<Blob>('photo:' + id);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  urlCache.set(id, u);
  return u;
}
export async function deletePhotoBlob(id: string) { await idbDel('photo:' + id); urlCache.delete(id); }

export async function shrinkImage(file: File, max = 1800): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob(b => res(b || file), 'image/jpeg', 0.86));
  } catch { return file; }
}

/** Lê a data em que a foto foi tirada (EXIF DateTimeOriginal), se houver. */
export async function photoDate(file: File): Promise<string | null> {
  try {
    const buf = new Uint8Array(await file.slice(0, 128 * 1024).arrayBuffer());
    const txt = new TextDecoder('latin1').decode(buf);
    const m = txt.match(/(20\d\d):(\d\d):(\d\d) \d\d:\d\d:\d\d/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  } catch { return null; }
}

/* ---------- backup ---------- */
export function exportJSON(): string { return JSON.stringify({ ...state, settings: { ...state.settings, mapsKey: '' } }, null, 1); }
export function importJSON(text: string) {
  const db = JSON.parse(text) as DB;
  if (!db || db.version !== 1 || !Array.isArray(db.trips)) throw new Error('Arquivo de backup inválido.');
  replaceDB({ ...db, settings: { ...db.settings, mapsKey: state.settings.mapsKey } });
}
