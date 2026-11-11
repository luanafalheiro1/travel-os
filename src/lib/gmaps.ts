import { useSyncExternalStore } from 'react';
import { getDB } from './store';
import type { Geo, PlaceRef } from '../types';

/* Integração com o Google Maps (Maps JavaScript API + Places API New).
   A chave fica só no navegador, em Configurações. */

type MapsStatus = 'nokey' | 'loading' | 'ready' | 'error';
let status: MapsStatus = 'nokey';
let errorMsg = '';
let loadingKey = '';
let loadPromise: Promise<void> | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());

function setStatus(s: MapsStatus, msg = '') { status = s; errorMsg = msg; emit(); }

export function ensureMaps(): Promise<void> {
  const key = getDB().settings.mapsKey.trim();
  if (!key) { setStatus('nokey'); return Promise.reject(new Error('nokey')); }
  if (loadPromise && loadingKey === key) return loadPromise;
  if (loadPromise && loadingKey !== key) { location.reload(); return loadPromise; }
  loadingKey = key;
  setStatus('loading');
  loadPromise = new Promise<void>((resolve, reject) => {
    const w = window as any;
    w.__tosMapsReady = () => { setStatus('ready'); resolve(); };
    w.gm_authFailure = () => {
      setStatus('error', 'O Google recusou a chave. Confira se ela está correta, se as APIs "Maps JavaScript API" e "Places API (New)" estão ativadas e se o endereço deste site está liberado na restrição da chave.');
    };
    const s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) +
      '&v=weekly&loading=async&language=pt-BR&region=BR&libraries=places,marker&callback=__tosMapsReady';
    s.async = true;
    s.onerror = () => { setStatus('error', 'Não consegui carregar o Google Maps. Verifique sua conexão.'); reject(new Error('load')); };
    document.head.appendChild(s);
  });
  return loadPromise;
}

export function useMaps() {
  const snap = useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => status + '|' + errorMsg);
  const [s, e] = snap.split('|') as [MapsStatus, string];
  return { status: s, error: e };
}

export function mapId() { return getDB().settings.mapId.trim() || 'DEMO_MAP_ID'; }

/* ---------- fila simples para não disparar muitas chamadas de uma vez ---------- */
let running = 0;
const queue: (() => void)[] = [];
function limit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      running++;
      fn().then(resolve, reject).finally(() => { running--; const n = queue.shift(); if (n) setTimeout(n, 120); });
    };
    if (running < 2) run(); else queue.push(run);
  });
}

async function placesLib() {
  await ensureMaps();
  return await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
}

export interface FoundPlace extends PlaceRef {
  name: string;
  photo?: string;
  rating?: number;
  ratings?: number;
  type?: string;
  summary?: string;
  hours?: string[];
  website?: string;
}

const BASIC = ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI', 'addressComponents', 'photos', 'primaryTypeDisplayName'];
const RICH = [...BASIC, 'rating', 'userRatingCount'];

function comp(p: google.maps.places.Place, type: string) {
  return p.addressComponents?.find(c => c.types.includes(type))?.longText || undefined;
}

function toFound(p: google.maps.places.Place, photoWidth = 640): FoundPlace {
  let photo: string | undefined;
  try { photo = p.photos?.[0]?.getURI({ maxWidth: photoWidth }); } catch { /* sem foto */ }
  return {
    name: p.displayName || '',
    placeId: p.id,
    geo: p.location ? { lat: p.location.lat(), lng: p.location.lng() } : undefined,
    address: p.formattedAddress || undefined,
    mapsUrl: p.googleMapsURI || undefined,
    city: comp(p, 'locality') || comp(p, 'postal_town') || comp(p, 'administrative_area_level_2'),
    country: comp(p, 'country'),
    photo,
    rating: (p as any).rating ?? undefined,
    ratings: (p as any).userRatingCount ?? undefined,
    type: (p as any).primaryTypeDisplayName || undefined,
  };
}

export async function searchText(q: string, opts: { bias?: Geo; max?: number; rich?: boolean } = {}): Promise<FoundPlace[]> {
  const { Place } = await placesLib();
  return limit(async () => {
    const req: google.maps.places.SearchByTextRequest = {
      textQuery: q, fields: opts.rich ? RICH : BASIC, maxResultCount: opts.max ?? 5, language: 'pt-BR',
    };
    if (opts.bias) req.locationBias = opts.bias;
    const { places } = await Place.searchByText(req);
    return places.map(p => toFound(p));
  });
}

export const EXPLORE_TYPES: { id: string; label: string; types: string[] }[] = [
  { id: 'atracoes', label: 'Atrações', types: ['tourist_attraction', 'historical_landmark', 'monument'] },
  { id: 'museus', label: 'Museus', types: ['museum', 'art_gallery'] },
  { id: 'restaurantes', label: 'Restaurantes', types: ['restaurant'] },
  { id: 'cafes', label: 'Cafés e doces', types: ['cafe', 'bakery', 'ice_cream_shop', 'coffee_shop'] },
  { id: 'parques', label: 'Parques e mirantes', types: ['park', 'garden', 'observation_deck', 'national_park'] },
  { id: 'noite', label: 'Bares', types: ['bar', 'wine_bar', 'pub'] },
  { id: 'compras', label: 'Compras', types: ['shopping_mall', 'market', 'department_store', 'book_store'] },
];

const nearbyCache = new Map<string, { at: number; res: FoundPlace[] }>();
export async function searchNearby(center: Geo, typeId: string, radius = 2500): Promise<FoundPlace[]> {
  const key = `${center.lat.toFixed(3)},${center.lng.toFixed(3)}|${typeId}|${radius}`;
  const hit = nearbyCache.get(key);
  if (hit && Date.now() - hit.at < 30 * 60e3) return hit.res;
  const { Place, SearchNearbyRankPreference } = await placesLib();
  const t = EXPLORE_TYPES.find(x => x.id === typeId) || EXPLORE_TYPES[0];
  const res = await limit(async () => {
    const { places } = await Place.searchNearby({
      fields: RICH, locationRestriction: { center, radius }, includedPrimaryTypes: t.types,
      maxResultCount: 12, rankPreference: SearchNearbyRankPreference.POPULARITY, language: 'pt-BR',
    });
    return places.map(p => toFound(p));
  });
  nearbyCache.set(key, { at: Date.now(), res });
  return res;
}

export async function placeDetails(placeId: string): Promise<FoundPlace> {
  const { Place } = await placesLib();
  return limit(async () => {
    const p = new Place({ id: placeId });
    await p.fetchFields({ fields: [...RICH, 'regularOpeningHours', 'websiteURI', 'editorialSummary'] });
    const f = toFound(p, 900);
    f.hours = p.regularOpeningHours?.weekdayDescriptions;
    f.website = p.websiteURI || undefined;
    f.summary = p.editorialSummary || undefined;
    return f;
  });
}

/* ---------- foto de capa por busca, com cache curto ---------- */
const PHOTO_KEY = 'travelos:photos:v1';
type PhotoCache = Record<string, { uri: string; at: number; geo?: Geo }>;
let photoCache: PhotoCache = (() => { try { return JSON.parse(localStorage.getItem(PHOTO_KEY) || '{}'); } catch { return {}; } })();
const inflight = new Map<string, Promise<string | null>>();

export function cachedPhoto(q: string): string | null {
  const c = photoCache[q];
  return c && Date.now() - c.at < 3 * 864e5 ? c.uri : null;
}

export function photoFor(q: string, width = 1200): Promise<string | null> {
  const c = cachedPhoto(q);
  if (c) return Promise.resolve(c);
  if (inflight.has(q)) return inflight.get(q)!;
  const p = (async () => {
    try {
      const { Place } = await placesLib();
      const { places } = await limit(() => Place.searchByText({ textQuery: q, fields: ['id', 'photos', 'location'], maxResultCount: 1 }));
      const pl = places[0];
      const uri = pl?.photos?.[0]?.getURI({ maxWidth: width }) || null;
      if (uri) {
        photoCache[q] = { uri, at: Date.now(), geo: pl.location ? { lat: pl.location.lat(), lng: pl.location.lng() } : undefined };
        try { localStorage.setItem(PHOTO_KEY, JSON.stringify(photoCache)); } catch { /* cheio */ }
      }
      return uri;
    } catch { return null; } finally { inflight.delete(q); }
  })();
  inflight.set(q, p);
  return p;
}

/** Localiza um lugar pelo texto e devolve os dados para guardar. */
export async function locate(q: string, bias?: Geo): Promise<PlaceRef | null> {
  const r = await searchText(q, { bias, max: 1 });
  const f = r[0];
  if (!f || !f.geo) return null;
  return { placeId: f.placeId, geo: f.geo, address: f.address, mapsUrl: f.mapsUrl, city: f.city, country: f.country };
}
