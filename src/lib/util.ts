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
