export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WDL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const MO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MOL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const pd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => iso(new Date());
export const addDays = (s: string, n: number) => { const d = pd(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a: string, b: string) => Math.round((pd(b).getTime() - pd(a).getTime()) / 864e5);

export const fmtShort = (s: string) => { const d = pd(s); return `${WD[d.getDay()]}, ${d.getDate()} ${MO[d.getMonth()]}`; };
export const fmtDM = (s: string) => { const d = pd(s); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
export function fmtRange(a: string, b: string) {
  const x = pd(a), y = pd(b);
  const sameM = x.getMonth() === y.getMonth() && x.getFullYear() === y.getFullYear();
  return `${x.getDate()}${sameM ? '' : ' ' + MO[x.getMonth()]} – ${y.getDate()} ${MO[y.getMonth()]} ${y.getFullYear()}`;
}

export const toMin = (t?: string) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
export const fromMin = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

export const gmSearch = (q: string) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
export const gmPlace = (q: string, placeId?: string) =>
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) + (placeId ? '&query_place_id=' + placeId : '');

export function timeIn(tz: string, d = new Date()) {
  try { return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz }); } catch { return ''; }
}
/** Diferença em horas entre um fuso e o fuso local do aparelho. */
export function tzOffsetHours(tz: string) {
  try {
    const now = new Date();
    const a = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const b = new Date(now.toLocaleString('en-US'));
    return Math.round((a.getTime() - b.getTime()) / 36e5);
  } catch { return 0; }
}

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function cls(...a: (string | false | null | undefined)[]) { return a.filter(Boolean).join(' '); }

/* ---------- deslocamento estimado entre dois pontos ---------- */
export function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180, R = 6371;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Estimativa simples: a pé até ~2 km; acima disso, transporte público. */
export function hop(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const km = distKm(a, b) * 1.3; // ruas não são linha reta
  if (km < 0.08) return { mode: 'walk' as const, min: 1, km };
  if (km <= 2.2) return { mode: 'walk' as const, min: Math.max(1, Math.round(km / 4.8 * 60)), km };
  return { mode: 'transit' as const, min: Math.round(12 + km * 2.6), km };
}
export const fmtKm = (km: number) => km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1).replace('.', ',')} km`;
