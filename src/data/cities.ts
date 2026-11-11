import { getDB } from '../lib/store';

/** Cidades conhecidas: coordenadas do centro, fuso horário e país. */
export interface CityInfo { lat: number; lng: number; tz: string; country: string; q: string }

export const CITIES: Record<string, CityInfo> = {
  'Rio': { lat: -22.91, lng: -43.17, tz: 'America/Sao_Paulo', country: 'Brasil', q: 'Rio de Janeiro' },
  'Madri': { lat: 40.4168, lng: -3.7038, tz: 'Europe/Madrid', country: 'Espanha', q: 'Madrid, Espanha' },
  'Londres': { lat: 51.5072, lng: -0.1276, tz: 'Europe/London', country: 'Reino Unido', q: 'London, UK' },
  'Paris': { lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris', country: 'França', q: 'Paris, França' },
  'Nápoles': { lat: 40.8518, lng: 14.2681, tz: 'Europe/Rome', country: 'Itália', q: 'Napoli, Itália' },
  'Sorrento': { lat: 40.6263, lng: 14.3758, tz: 'Europe/Rome', country: 'Itália', q: 'Sorrento, Itália' },
  'Costa Amalfitana': { lat: 40.6281, lng: 14.4850, tz: 'Europe/Rome', country: 'Itália', q: 'Positano, Costa Amalfitana' },
  'Positano': { lat: 40.6281, lng: 14.4850, tz: 'Europe/Rome', country: 'Itália', q: 'Positano, Itália' },
  'Capri': { lat: 40.5532, lng: 14.2222, tz: 'Europe/Rome', country: 'Itália', q: 'Capri, Itália' },
  'Roma': { lat: 41.9028, lng: 12.4964, tz: 'Europe/Rome', country: 'Itália', q: 'Roma, Itália' },
  'Florença': { lat: 43.7696, lng: 11.2558, tz: 'Europe/Rome', country: 'Itália', q: 'Firenze, Itália' },
  'Amsterdã': { lat: 52.3676, lng: 4.9041, tz: 'Europe/Amsterdam', country: 'Países Baixos', q: 'Amsterdam, Holanda' },
  'Bruxelas': { lat: 50.8503, lng: 4.3517, tz: 'Europe/Brussels', country: 'Bélgica', q: 'Bruxelles, Bélgica' },
  'Bruges': { lat: 51.2093, lng: 3.2247, tz: 'Europe/Brussels', country: 'Bélgica', q: 'Brugge, Bélgica' },
  'Milão': { lat: 45.4642, lng: 9.19, tz: 'Europe/Rome', country: 'Itália', q: 'Milano, Itália' },
  'Lago di Como': { lat: 45.9855, lng: 9.2601, tz: 'Europe/Rome', country: 'Itália', q: 'Bellagio, Lago di Como' },
  'St. Moritz': { lat: 46.4908, lng: 9.8355, tz: 'Europe/Zurich', country: 'Suíça', q: 'St. Moritz, Suíça' },
  'Veneza': { lat: 45.4408, lng: 12.3155, tz: 'Europe/Rome', country: 'Itália', q: 'Venezia, Itália' },
  'Manchester': { lat: 53.4808, lng: -2.2426, tz: 'Europe/London', country: 'Reino Unido', q: 'Manchester, UK' },
};

/** Fuso por país (países de fuso único ou com fuso principal). */
export const COUNTRY_TZ: Record<string, string> = {
  'Brasil': 'America/Sao_Paulo', 'Brazil': 'America/Sao_Paulo', 'Portugal': 'Europe/Lisbon', 'Espanha': 'Europe/Madrid', 'Spain': 'Europe/Madrid',
  'França': 'Europe/Paris', 'France': 'Europe/Paris', 'Itália': 'Europe/Rome', 'Italy': 'Europe/Rome', 'Reino Unido': 'Europe/London', 'United Kingdom': 'Europe/London',
  'Irlanda': 'Europe/Dublin', 'Ireland': 'Europe/Dublin', 'Alemanha': 'Europe/Berlin', 'Germany': 'Europe/Berlin', 'Países Baixos': 'Europe/Amsterdam', 'Netherlands': 'Europe/Amsterdam',
  'Bélgica': 'Europe/Brussels', 'Belgium': 'Europe/Brussels', 'Suíça': 'Europe/Zurich', 'Switzerland': 'Europe/Zurich', 'Áustria': 'Europe/Vienna', 'Austria': 'Europe/Vienna',
  'Tchéquia': 'Europe/Prague', 'Czechia': 'Europe/Prague', 'Hungria': 'Europe/Budapest', 'Hungary': 'Europe/Budapest', 'Croácia': 'Europe/Zagreb', 'Croatia': 'Europe/Zagreb',
  'Grécia': 'Europe/Athens', 'Greece': 'Europe/Athens', 'Albânia': 'Europe/Tirane', 'Albania': 'Europe/Tirane', 'Montenegro': 'Europe/Podgorica',
  'Polônia': 'Europe/Warsaw', 'Poland': 'Europe/Warsaw', 'Dinamarca': 'Europe/Copenhagen', 'Denmark': 'Europe/Copenhagen', 'Suécia': 'Europe/Stockholm', 'Sweden': 'Europe/Stockholm',
  'Noruega': 'Europe/Oslo', 'Norway': 'Europe/Oslo', 'Turquia': 'Europe/Istanbul', 'Turkey': 'Europe/Istanbul', 'Türkiye': 'Europe/Istanbul', 'Argentina': 'America/Argentina/Buenos_Aires',
  'Chile': 'America/Santiago', 'Uruguai': 'America/Montevideo', 'Uruguay': 'America/Montevideo', 'Peru': 'America/Lima', 'Colômbia': 'America/Bogota', 'Colombia': 'America/Bogota',
  'Japão': 'Asia/Tokyo', 'Japan': 'Asia/Tokyo', 'Egito': 'Africa/Cairo', 'Egypt': 'Africa/Cairo', 'Marrocos': 'Africa/Casablanca', 'Morocco': 'Africa/Casablanca',
  'Emirados Árabes Unidos': 'Asia/Dubai', 'United Arab Emirates': 'Asia/Dubai', 'Tailândia': 'Asia/Bangkok', 'Thailand': 'Asia/Bangkok',
};

export function cityInfo(name: string): CityInfo | undefined {
  return CITIES[name] || getDB().customCities?.[name];
}

/** Bandeira (emoji) pelo nome do país em português. */
const FLAGS: Record<string, string> = {
  'Brasil': 'BR', 'Espanha': 'ES', 'Reino Unido': 'GB', 'França': 'FR', 'Itália': 'IT', 'Países Baixos': 'NL', 'Bélgica': 'BE', 'Suíça': 'CH',
  'Portugal': 'PT', 'Alemanha': 'DE', 'Áustria': 'AT', 'Tchéquia': 'CZ', 'Hungria': 'HU', 'Croácia': 'HR', 'Grécia': 'GR', 'Albânia': 'AL', 'Montenegro': 'ME',
  'Irlanda': 'IE', 'Argentina': 'AR', 'Chile': 'CL', 'Uruguai': 'UY', 'Peru': 'PE', 'Estados Unidos': 'US', 'Japão': 'JP', 'Turquia': 'TR',
};
export function flag(country: string): string {
  const cc = FLAGS[country];
  if (!cc) return '';
  return String.fromCodePoint(...[...cc].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}
