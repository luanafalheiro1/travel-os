export type Status = 'Wishlist' | 'Planejamento' | 'Reservada' | 'Em andamento' | 'Concluída' | 'Arquivada';
export const STATUSES: Status[] = ['Wishlist', 'Planejamento', 'Reservada', 'Em andamento', 'Concluída', 'Arquivada'];

export type Category = 'atracao' | 'comida' | 'compras' | 'passeio' | 'transporte' | 'outro';
export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'atracao', label: 'Atração' },
  { id: 'comida', label: 'Comida' },
  { id: 'passeio', label: 'Passeio' },
  { id: 'compras', label: 'Compras' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'outro', label: 'Outro' },
];

export interface Geo { lat: number; lng: number }

/** Dados vindos do Google Places, guardados quando o lugar é localizado. */
export interface PlaceRef {
  placeId?: string;
  geo?: Geo;
  address?: string;
  mapsUrl?: string;
  /** cidade e país, para organizar a biblioteca */
  city?: string;
  country?: string;
}

export interface Item extends PlaceRef {
  id: string;
  name: string;
  note?: string;
  /** texto usado para localizar no Google Maps; null = não é um lugar */
  q?: string | null;
  time?: string;      // HH:MM
  duration?: number;  // minutos
  cost?: string;
  category: Category;
  done?: boolean;
  fav?: boolean;
}

export interface Day {
  date: string; // AAAA-MM-DD
  city: string;
  title?: string;
  note?: string;
  items: Item[];
}

export interface Leg {
  id: string;
  date: string;
  from: string;
  to: string;
  mode: string;
  dep?: string;
  arr?: string;
  arrDate?: string;
  note?: string;
  booked?: boolean;
}

export interface Stay {
  id: string;
  city: string;
  name: string;
  checkin: string;   // AAAA-MM-DD
  checkout: string;
  q?: string;
  info: [string, string][];
  booked?: boolean;
}

export interface CheckItem { id: string; text: string; done: boolean }
export interface CheckGroup { id: string; title: string; items: CheckItem[] }

export interface TipGroup { city: string; title: string; items: string[] }

export interface Trip {
  id: string;
  name: string;
  status: Status;
  start: string;
  end: string;
  cities: string[];
  travelers?: number;
  budget?: string;
  description?: string;
  coverQuery?: string;
  days: Day[];
  legs: Leg[];
  stays: Stay[];
  checklist: CheckGroup[];
  tips: TipGroup[];
  apps: [string, string][];
  journal: Record<string, string>;
  /** lugares guardados para a viagem, ainda sem dia */
  ideas?: Item[];
  planNote?: string;
}

export interface SavedPlace extends PlaceRef {
  id: string;
  name: string;
  note?: string;
  list: string;
  source: 'mymaps' | 'takeout' | 'manual' | 'google';
  sourceUrl?: string;
  addedAt: number;
}

export interface Photo { id: string; trip: string; day: string; caption: string; ts: number }

export interface Settings { mapsKey: string; mapId: string; homeCity: string; homeTz: string }

export interface DB {
  version: 1;
  trips: Trip[];
  places: SavedPlace[];
  photos: Photo[];
  settings: Settings;
  /** cidades localizadas pelo Google ao criar viagens */
  customCities?: Record<string, { lat: number; lng: number; tz: string; country: string; q: string }>;
}
