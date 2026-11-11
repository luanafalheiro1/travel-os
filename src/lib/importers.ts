import JSZip from 'jszip';
import countries from '../data/countries.json';
import type { Geo, SavedPlace } from '../types';
import { uid } from './util';

/* Importação de lugares: Google My Maps (KML/KMZ) e Google Takeout (CSV das listas, GeoJSON dos favoritos). */

export interface ImportResult { places: SavedPlace[]; skipped: number; lines: number; lists: string[] }

function textOf(el: Element | null | undefined) { return (el?.textContent || '').trim(); }
function stripHtml(s: string) {
  const d = new DOMParser().parseFromString(s, 'text/html');
  return (d.body.textContent || '').replace(/\s+\n/g, '\n').trim();
}

export function parseKML(xml: string, fallbackList: string): ImportResult {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('O arquivo KML não pôde ser lido.');
  const docName = textOf(doc.querySelector('Document > name')) || fallbackList;
  const out: SavedPlace[] = [];
  let skipped = 0, lines = 0;
  const lists = new Set<string>();
  doc.querySelectorAll('Placemark').forEach(pm => {
    const folder = pm.parentElement?.tagName === 'Folder' ? textOf(pm.parentElement.querySelector(':scope > name')) : '';
    const list = folder ? `${docName} · ${folder}` : docName;
    const name = textOf(pm.querySelector(':scope > name')) || 'Sem nome';
    const point = pm.querySelector('Point > coordinates');
    if (!point) { if (pm.querySelector('LineString')) lines++; else skipped++; return; }
    const [lng, lat] = textOf(point).split(',').map(Number);
    if (!isFinite(lat) || !isFinite(lng)) { skipped++; return; }
    const desc = stripHtml(textOf(pm.querySelector(':scope > description')));
    lists.add(list);
    out.push({ id: uid(), name, note: desc || undefined, list, source: 'mymaps', geo: { lat, lng }, country: countryAt({ lat, lng }), addedAt: Date.now() });
  });
  return { places: out, skipped, lines, lists: [...lists] };
}

export async function parseKMZ(buf: ArrayBuffer, fallbackList: string): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(buf);
  const f = Object.values(zip.files).find(x => x.name.toLowerCase().endsWith('.kml'));
  if (!f) throw new Error('O arquivo KMZ não tem um mapa (KML) dentro.');
  return parseKML(await f.async('string'), fallbackList);
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}

/** Tenta tirar coordenadas do link do Google Maps (nem todos os links trazem). */
export function geoFromUrl(url: string): Geo | undefined {
  let m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return { lat: +m[1], lng: +m[2] };
  m = url.match(/[@/](-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/);
  if (m) return { lat: +m[1], lng: +m[2] };
  m = url.match(/[?&](?:q|query)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  if (m) return { lat: +m[1], lng: +m[2] };
  return undefined;
}

export function parseTakeoutCSV(text: string, list: string): ImportResult {
  const rows = parseCSV(text.replace(/^﻿/, ''));
  if (!rows.length) return { places: [], skipped: 0, lines: 0, lists: [] };
  const head = rows[0].map(h => h.trim().toLowerCase());
  const iT = head.findIndex(h => h === 'title' || h === 'título' || h === 'titulo');
  const iN = head.findIndex(h => h === 'note' || h === 'nota');
  const iU = head.findIndex(h => h === 'url');
  const iC = head.findIndex(h => h === 'comment' || h === 'comentário');
  if (iT < 0 && iU < 0) throw new Error('Este CSV não parece uma lista do Google Takeout (faltam as colunas Title e URL).');
  const out: SavedPlace[] = []; let skipped = 0;
  for (const r of rows.slice(1)) {
    const name = (r[iT] || '').trim(), url = (r[iU] || '').trim();
    if (!name && !url) { skipped++; continue; }
    const geo = url ? geoFromUrl(url) : undefined;
    const note = [r[iN], r[iC]].map(x => (x || '').trim()).filter(Boolean).join('\n');
    out.push({ id: uid(), name: name || 'Lugar sem nome', note: note || undefined, list, source: 'takeout', sourceUrl: url || undefined, mapsUrl: url || undefined, geo, country: geo ? countryAt(geo) : undefined, addedAt: Date.now() });
  }
  return { places: out, skipped, lines: 0, lists: [list] };
}

export function parseGeoJSON(text: string, list: string): ImportResult {
  const j = JSON.parse(text);
  const feats: any[] = j.type === 'FeatureCollection' ? j.features : Array.isArray(j) ? j : [];
  const out: SavedPlace[] = []; let skipped = 0;
  for (const f of feats) {
    const c = f?.geometry?.type === 'Point' ? f.geometry.coordinates : null;
    const p = f?.properties || {};
    const name = p.Title || p.name || p.Location?.['Business Name'] || p.location?.name || '';
    if (!c || (c[0] === 0 && c[1] === 0)) { if (!name) { skipped++; continue; } }
    const geo = c && !(c[0] === 0 && c[1] === 0) ? { lat: +c[1], lng: +c[0] } : undefined;
    const url = p['Google Maps URL'] || p.google_maps_url || undefined;
    out.push({ id: uid(), name: name || 'Lugar sem nome', list, source: 'takeout', sourceUrl: url, mapsUrl: url, geo,
      address: p.Location?.Address || p.location?.address || undefined, country: geo ? countryAt(geo) : undefined, addedAt: Date.now() });
  }
  return { places: out, skipped, lines: 0, lists: [list] };
}

export async function importFile(file: File): Promise<ImportResult> {
  const base = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'kmz') return parseKMZ(await file.arrayBuffer(), base);
  if (ext === 'kml') return parseKML(await file.text(), base);
  if (ext === 'csv') return parseTakeoutCSV(await file.text(), base);
  if (ext === 'json' || ext === 'geojson') return parseGeoJSON(await file.text(), base);
  if (ext === 'zip') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const res: ImportResult = { places: [], skipped: 0, lines: 0, lists: [] };
    for (const f of Object.values(zip.files)) {
      const n = f.name.toLowerCase(); const b = f.name.split('/').pop()!.replace(/\.[^.]+$/, '');
      let r: ImportResult | null = null;
      if (n.endsWith('.csv') && n.includes('saved')) r = parseTakeoutCSV(await f.async('string'), b);
      else if (n.endsWith('.json') && n.includes('saved')) r = parseGeoJSON(await f.async('string'), b);
      else if (n.endsWith('.kml')) r = parseKML(await f.async('string'), b);
      if (r) { res.places.push(...r.places); res.skipped += r.skipped; res.lines += r.lines; res.lists.push(...r.lists); }
    }
    if (!res.places.length) throw new Error('Não encontrei listas salvas dentro do .zip. No Takeout, elas ficam na pasta "Saved" (ou "Salvos").');
    return res;
  }
  throw new Error('Formato não suportado. Use KML ou KMZ (My Maps), CSV ou JSON (Google Takeout) ou o .zip do Takeout.');
}

/* ---------- país de uma coordenada, sem internet ---------- */
const PT_NAMES: Record<string, string> = {
  Spain: 'Espanha', 'United Kingdom': 'Reino Unido', France: 'França', Italy: 'Itália', Netherlands: 'Países Baixos', Belgium: 'Bélgica',
  Switzerland: 'Suíça', Portugal: 'Portugal', Germany: 'Alemanha', Austria: 'Áustria', Czechia: 'Tchéquia', Hungary: 'Hungria',
  Croatia: 'Croácia', Greece: 'Grécia', Albania: 'Albânia', Montenegro: 'Montenegro', Ireland: 'Irlanda', Brazil: 'Brasil',
  Argentina: 'Argentina', Chile: 'Chile', Uruguay: 'Uruguai', Peru: 'Peru', 'United States of America': 'Estados Unidos', Japan: 'Japão',
  Turkey: 'Turquia', Poland: 'Polônia', Denmark: 'Dinamarca', Sweden: 'Suécia', Norway: 'Noruega', Slovenia: 'Eslovênia', Slovakia: 'Eslováquia',
  Morocco: 'Marrocos', Egypt: 'Egito', Mexico: 'México', Canada: 'Canadá', Colombia: 'Colômbia', Iceland: 'Islândia', Finland: 'Finlândia',
};
type Ring = number[][];
function inRing(x: number, y: number, ring: Ring) {
  let ins = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
export function countryAt(g: Geo): string | undefined {
  for (const c of countries as { n: string; g: { type: string; coordinates: any } }[]) {
    const polys: Ring[][] = c.g.type === 'Polygon' ? [c.g.coordinates] : c.g.coordinates;
    for (const poly of polys) if (inRing(g.lng, g.lat, poly[0])) return PT_NAMES[c.n] || c.n;
  }
  return undefined;
}

/** Nome em português para um país vindo do Google (que já responde em pt-BR) ou do mapa offline. */
export function ptCountry(n?: string) { return n ? (PT_NAMES[n] || n) : n; }
