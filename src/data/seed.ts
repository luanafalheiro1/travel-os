import legacy from './legacy.json';
import type { Category, DB, Day, Item, Leg, Stay, Trip } from '../types';
import { uid } from '../lib/util';
import { april2027Days, checklist2027, legs2027, PLAN_NOTE, stays2027 } from './europa2027';
import { LONDON_CHECK, london2027Days, london2027Ideas, london2027Legs } from './london2027';

/* Converte o roteiro importado do documento (primeira versão) para o modelo atual. */

type LegacyPlace = [string, string, (string | 0)?];
interface LegacyDay { d: string; city: string; q?: string; title?: string; note?: string; places: LegacyPlace[]; eat?: LegacyPlace[] }

// Horários e durações escritos no roteiro original
const TIMES: Record<string, [string, number?]> = {
  'Tour Santiago Bernabéu': ['10:00', 90],
  'Warner Bros. Studio Tour (Harry Potter)': ['09:00', 420],
  'Jantar no Bouillon Julien': ['19:00', 90],
  'Passeio de barco': ['10:00'],
  'Coliseu e Fórum Romano': ['08:45', 180],
  'Cooking class': ['10:30'],
  'Vaticano e Capela Sistina': ['08:00', 180],
};
const SHOPPING = /Gran Vía|Corte Inglés|Harrods|Kiko|Lojas|Via dei Condotti|Via del Corso|Via Camerelle|M&M|Galeries/i;
const WALK = /Soho|Notting Hill|Little Venice|Montmartre|Trastevere|Quartier|Passeio|Hyde Park|Jardim|Jardins|Villa|Ponte|Piquenique|Canary/i;

function cat(name: string): Category {
  if (SHOPPING.test(name)) return 'compras';
  if (WALK.test(name)) return 'passeio';
  return 'atracao';
}

function item(day: LegacyDay, p: LegacyPlace, category?: Category): Item {
  const [name, note, q] = p;
  const t = TIMES[name];
  return {
    id: uid(), name, note: note || undefined, category: category || cat(name),
    q: q === 0 ? null : (q || `${name}${day.q ? ', ' + day.q : ''}`),
    time: t?.[0], duration: t?.[1],
  };
}

function legFrom(l: { d: string; a: string; b: string; mode: string; t: string }): Leg {
  const m = l.t.match(/(\d{1,2}:\d{2})\s*→\s*(\d{1,2}:\d{2})(?:\s*\((\d{2})\/(\d{2})\))?/);
  return {
    id: uid(), date: l.d, from: l.a, to: l.b, mode: l.mode, booked: true,
    dep: m?.[1], arr: m?.[2], arrDate: m?.[3] ? `${l.d.slice(0, 4)}-${m[4]}-${m[3]}` : undefined,
    note: m ? undefined : (l.t || undefined),
  };
}

function stayFrom(s: { city: string; dates: string; name: string; q?: string; info: [string, string][] }, year: string): Stay {
  const m = s.dates.match(/(\d+)\s*a\s*(\d+)\/(\d+)/)!;
  const mm = m[3].padStart(2, '0');
  return {
    id: uid(), city: s.city, name: s.name, q: s.q, info: s.info, booked: true,
    checkin: `${year}-${mm}-${m[1].padStart(2, '0')}`, checkout: `${year}-${mm}-${m[2].padStart(2, '0')}`,
  };
}

function checklist(groups: { g: string; items: [string, number?][] }[]) {
  return groups.map(g => ({ id: uid(), title: g.g, items: g.items.map(([text, done]) => ({ id: uid(), text, done: !!done })) }));
}

function eurotrip2026(): Trip {
  const E = legacy.E26 as any;
  const days: Day[] = (E.days as LegacyDay[]).map(d => ({
    date: d.d, city: d.city, title: d.title, note: d.note,
    items: [...d.places.map(p => item(d, p)), ...(d.eat || []).map(p => item(d, p, 'comida'))],
  }));
  return {
    id: 'eurotrip-2026', name: 'Eurotrip 2026', status: 'Concluída', start: E.start, end: E.end,
    cities: ['Madri', 'Londres', 'Paris', 'Nápoles', 'Sorrento', 'Positano', 'Capri', 'Roma', 'Florença'],
    travelers: 2, budget: '€ 100 por dia para gastar', coverQuery: 'Positano, Costa Amalfitana',
    days, legs: E.transport.map(legFrom), stays: E.stays.map((s: any) => stayFrom(s, '2026')),
    checklist: checklist(E.checklist), tips: E.tips.map((t: any) => ({ city: t.city, title: t.t, items: t.items })),
    apps: E.apps, journal: {},
  };
}

function eurotrip2027(): Trip {
  const days: Day[] = [];
  for (let d = new Date(2027, 3, 22); d <= new Date(2027, 4, 9); d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: iso, city: '', items: [] });
  }
  const ld = [...april2027Days(), ...london2027Days()];
  for (const d of ld) { const k = days.findIndex(x => x.date === d.date); if (k >= 0) days[k] = d; }
  return {
    id: 'eurotrip-2027', name: 'Eurotrip 2027', status: 'Planejamento', start: '2027-04-22', end: '2027-05-09',
    cities: ['Londres', 'Amsterdã', 'Bruxelas', 'Bruges', 'Milão', 'Lago di Como', 'St. Moritz', 'Veneza', 'Manchester'],
    travelers: 2, coverQuery: 'Lago di Como, Bellagio',
    days,
    legs: legs2027(london2027Legs()),
    ideas: london2027Ideas(),
    stays: stays2027(),
    checklist: [checklist2027(), ...checklist([
      { g: 'Passagens', items: [['Passagens internacionais (ida e volta por Londres)', 1]] },
      { g: 'Hospedagens', items: [] }, { g: 'Transportes internos', items: [] }, { g: 'Ingressos', items: [] },
      { g: 'Londres e Manchester: reservar antes', items: LONDON_CHECK },
    ])],
    tips: [], apps: [], journal: {},
    planNote: PLAN_NOTE,
  };
}

export function seed(): DB {
  return {
    version: 1,
    patches: ['2027-reservas'],
    trips: [eurotrip2027(), eurotrip2026()],
    places: [],
    photos: [],
    settings: { mapsKey: '', mapId: '', homeCity: 'Rio', homeTz: 'America/Sao_Paulo' },
  };
}
