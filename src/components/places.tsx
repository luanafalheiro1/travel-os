import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Globe, Loader2, MapPin, Navigation, Plus, Search, X, Bookmark, Check } from 'lucide-react';
import { EXPLORE_TYPES, locate, placeDetails, searchNearby, searchText, useMaps, type FoundPlace } from '../lib/gmaps';
import { getDB, update, updateTrip, useDB } from '../lib/store';
import { fmtShort, gmPlace, norm, uid } from '../lib/util';
import type { Category, Geo, Item, PlaceRef, SavedPlace } from '../types';
import { Rating } from './bits';

/* ---------- busca de lugares ---------- */
export function PlaceSearch({ bias, onPick, placeholder = 'Buscar lugar no Google Maps', allowText = true, autoFocus }: {
  bias?: Geo; onPick: (p: FoundPlace) => void; placeholder?: string; allowText?: boolean; autoFocus?: boolean;
}) {
  const { status } = useMaps();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<FoundPlace[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    if (status !== 'ready') { if (allowText) { onPick({ name: q.trim() }); setQ(''); } return; }
    setBusy(true); setErr('');
    try { setRes(await searchText(q.trim(), { bias, max: 6 })); }
    catch { setErr('A busca no Google falhou. Tente de novo.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="psearch">
      <form onSubmit={run} className="psearch-bar">
        <Search size={17} />
        <input type="text" value={q} onChange={e => { setQ(e.target.value); if (!e.target.value) setRes(null); }} placeholder={status === 'ready' ? placeholder : 'Adicionar lugar (nome)'} aria-label={placeholder} autoFocus={autoFocus} maxLength={160} />
        {q && <button type="button" className="icon-btn" onClick={() => { setQ(''); setRes(null); }} aria-label="Limpar"><X size={16} /></button>}
        <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? <Loader2 className="spin" size={15} /> : status === 'ready' ? 'Buscar' : 'Adicionar'}</button>
      </form>
      {err && <p className="err">{err}</p>}
      {res && (
        <div className="psearch-res">
          {res.length === 0 && <p className="muted small" style={{ padding: 10 }}>Nada encontrado para “{q}”.</p>}
          {res.map(p => (
            <button key={p.placeId} className="pres" onClick={() => { onPick(p); setRes(null); setQ(''); }}>
              {p.photo ? <img src={p.photo} alt="" referrerPolicy="no-referrer" /> : <span className="pres-ph"><MapPin size={18} /></span>}
              <span className="pres-t"><b>{p.name}</b><small>{p.address}</small></span>
              <Plus size={18} />
            </button>
          ))}
          {allowText && <button className="pres pres-text" onClick={() => { onPick({ name: q.trim() }); setRes(null); setQ(''); }}><span className="pres-t"><b>Adicionar só “{q.trim()}”</b><small>Sem localizar no mapa</small></span><Plus size={18} /></button>}
        </div>
      )}
    </div>
  );
}

/* ---------- salvar na biblioteca / adicionar a uma viagem ---------- */
export function savePlace(p: FoundPlace | SavedPlace | Item, list = 'Salvos no Travel OS') {
  const db = getDB();
  const dup = db.places.find(x => (p.placeId && x.placeId === p.placeId) || norm(x.name) === norm(p.name));
  if (dup) return false;
  update(d => d.places.unshift({ id: uid(), name: p.name, note: (p as any).note, list, source: 'google', placeId: p.placeId, geo: p.geo, address: p.address, mapsUrl: p.mapsUrl, city: p.city, country: p.country, addedAt: Date.now() }));
  return true;
}
export function isSaved(p: { placeId?: string; name: string }) {
  return getDB().places.some(x => (p.placeId && x.placeId === p.placeId) || norm(x.name) === norm(p.name));
}

export function guessCategory(type?: string): Category {
  const t = (type || '').toLowerCase();
  if (/restaurante|café|cafeteria|padaria|pizzaria|bar|sorvete|gelat|confeitaria|bistrô|pub|trattoria|osteria/.test(t)) return 'comida';
  if (/loja|shopping|mercado|compras/.test(t)) return 'compras';
  if (/parque|jardim|praia|mirante|bairro/.test(t)) return 'passeio';
  return 'atracao';
}

export function itemFrom(p: { name: string; note?: string; type?: string } & PlaceRef): Item {
  return { id: uid(), name: p.name, note: p.note, category: guessCategory(p.type), q: p.address ? `${p.name}, ${p.address}` : p.name,
    placeId: p.placeId, geo: p.geo, address: p.address, mapsUrl: p.mapsUrl, city: p.city, country: p.country };
}

export function AddToTrip({ place, onDone, compact }: { place: { name: string; note?: string; type?: string } & PlaceRef; onDone?: (msg: string) => void; compact?: boolean }) {
  const db = useDB();
  const trips = db.trips.filter(t => t.status !== 'Arquivada');
  const pref = trips.find(t => t.status !== 'Concluída') || trips[0];
  const [tripId, setTrip] = useState(pref?.id || '');
  const trip = db.trips.find(t => t.id === tripId);
  const guessDay = useMemo(() => trip?.days.find(d => place.city && d.city && norm(d.city) === norm(place.city!))?.date || '', [trip, place.city]);
  const [day, setDay] = useState(guessDay);
  useEffect(() => setDay(guessDay), [guessDay]);
  if (!trips.length) return null;
  return (
    <div className={compact ? 'addtrip compact' : 'addtrip'}>
      <select value={tripId} onChange={e => setTrip(e.target.value)} aria-label="Viagem">{trips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <select value={day} onChange={e => setDay(e.target.value)} aria-label="Dia">
        <option value="">Ideias (sem dia)</option>
        {trip?.days.map(d => <option key={d.date} value={d.date}>{fmtShort(d.date)}{d.city ? ' · ' + d.city : ''}</option>)}
      </select>
      <button className="btn btn-primary btn-sm" onClick={() => {
        if (!trip) return;
        const it = itemFrom(place);
        updateTrip(trip.id, t => {
          if (day) t.days.find(d => d.date === day)?.items.push(it);
          else { t.ideas = t.ideas || []; t.ideas.push(it); }
        });
        onDone?.(day ? `Adicionado em ${fmtShort(day)}` : `Adicionado às ideias da ${trip.name}`);
      }}><Plus size={15} />Adicionar</button>
    </div>
  );
}

/* ---------- painel de detalhes de um lugar ---------- */
export interface DrawerPlace extends PlaceRef { name: string; note?: string; q?: string | null; time?: string; cost?: string }

export function PlaceDrawer({ place, onClose, actions, onLocated, toast }: {
  place: DrawerPlace; onClose: () => void; actions?: React.ReactNode; onLocated?: (r: PlaceRef) => void; toast: (m: string) => void;
}) {
  const { status } = useMaps();
  const [d, setD] = useState<FoundPlace | null>(null);
  const [busy, setBusy] = useState(false);
  const [near, setNear] = useState<{ type: string; res: FoundPlace[] | null }>({ type: '', res: null });
  const [nearBusy, setNearBusy] = useState(false);
  const [saved, setSaved] = useState(isSaved(place));

  useEffect(() => {
    setD(null); setNear({ type: '', res: null }); setSaved(isSaved(place));
    if (status !== 'ready') return;
    let live = true;
    (async () => {
      setBusy(true);
      try {
        let pid = place.placeId;
        if (!pid && place.q !== null) {
          const r = await locate(place.q || place.name, place.geo);
          if (r) { pid = r.placeId; onLocated?.(r); }
        }
        if (pid) { const det = await placeDetails(pid); if (live) setD(det); }
      } catch { /* mostra o que tiver */ } finally { if (live) setBusy(false); }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.placeId, place.name, status]);

  const geo = d?.geo || place.geo;
  const mapsLink = d?.mapsUrl || place.mapsUrl || gmPlace(place.q || place.name, place.placeId);
  const dirLink = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(d?.address ? `${d.name}, ${d.address}` : place.q || place.name) + (d?.placeId || place.placeId ? '&destination_place_id=' + (d?.placeId || place.placeId) : '');

  const loadNear = async (type: string) => {
    if (!geo) return;
    setNearBusy(true); setNear({ type, res: null });
    try { setNear({ type, res: (await searchNearby(geo, type, 1500)).filter(x => x.placeId !== (d?.placeId || place.placeId)) }); }
    catch { toast('A busca de lugares próximos falhou.'); setNear({ type: '', res: null }); }
    finally { setNearBusy(false); }
  };

  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()} role="dialog" aria-label={place.name}>
        <div className="drawer-photo">
          {d?.photo ? <img src={d.photo} alt="" referrerPolicy="no-referrer" /> : <div className="drawer-ph">{busy ? <Loader2 className="spin" /> : <MapPin />}</div>}
          <button className="icon-btn drawer-x" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="drawer-body">
          <div>
            {d?.type && <span className="eyebrow">{d.type}</span>}
            <h2>{place.name}</h2>
            {d && d.name && norm(d.name) !== norm(place.name) && <p className="muted small">No Google: {d.name}</p>}
            <div className="row" style={{ marginTop: 6 }}><Rating v={d?.rating} n={d?.ratings} />{d?.rating != null && <small className="muted">avaliações do Google</small>}</div>
          </div>
          {(place.time || place.cost) && <div className="chips-row">{place.time && <span className="chip">{place.time}</span>}{place.cost && <span className="chip">{place.cost}</span>}</div>}
          {place.note && <p className="note-box">{place.note}</p>}
          {d?.summary && <p>{d.summary}</p>}
          {(d?.address || place.address) && <p className="row muted small"><MapPin size={15} />{d?.address || place.address}</p>}
          {d?.hours && <details className="hours"><summary>Horário de funcionamento</summary><ul>{d.hours.map(h => <li key={h}>{h}</li>)}</ul></details>}
          <div className="row wrap">
            <a className="btn btn-primary" href={mapsLink} target="_blank" rel="noopener"><ExternalLink size={15} />Abrir no Google Maps</a>
            <a className="btn" href={dirLink} target="_blank" rel="noopener"><Navigation size={15} />Como chegar</a>
            {d?.website && <a className="btn" href={d.website} target="_blank" rel="noopener"><Globe size={15} />Site</a>}
            <button className="btn" disabled={saved} onClick={() => { savePlace({ ...place, ...(d || {}), name: place.name } as any); setSaved(true); toast('Salvo nos seus lugares'); }}>
              {saved ? <><Check size={15} />Salvo</> : <><Bookmark size={15} />Salvar</>}
            </button>
          </div>
          {actions}
          {status === 'ready' && geo && (
            <div className="stack-sm">
              <h3>O que tem por perto</h3>
              <div className="chips-row">
                {EXPLORE_TYPES.filter(t => ['atracoes', 'restaurantes', 'cafes', 'parques', 'noite'].includes(t.id)).map(t => (
                  <button key={t.id} className={'chip-btn' + (near.type === t.id ? ' on' : '')} onClick={() => loadNear(t.id)}>{t.label}</button>
                ))}
              </div>
              {nearBusy && <p className="muted small row"><Loader2 className="spin" size={15} />Buscando no Google…</p>}
              {near.res && near.res.length === 0 && <p className="muted small">Nada encontrado a até 1,5 km.</p>}
              {near.res && near.res.map(p => <SuggestionRow key={p.placeId} p={p} toast={toast} />)}
            </div>
          )}
          {status !== 'ready' && <p className="muted small">Conecte o Google Maps nas configurações para ver fotos, avaliações e sugestões por perto.</p>}
        </div>
      </aside>
    </div>
  );
}

export function SuggestionRow({ p, toast }: { p: FoundPlace; toast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(isSaved(p));
  return (
    <div className="sugg">
      <div className="sugg-main">
        {p.photo ? <img src={p.photo} alt="" referrerPolicy="no-referrer" /> : <span className="pres-ph"><MapPin size={18} /></span>}
        <div className="sugg-t">
          <b>{p.name}</b>
          <span className="row small muted"><Rating v={p.rating} n={p.ratings} />{p.type && <span>{p.type}</span>}</span>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <a className="icon-btn" href={p.mapsUrl || gmPlace(p.name, p.placeId)} target="_blank" rel="noopener" aria-label="Abrir no Google Maps"><ExternalLink size={16} /></a>
          <button className="icon-btn" disabled={saved} onClick={() => { savePlace(p); setSaved(true); toast('Salvo nos seus lugares'); }} aria-label="Salvar">{saved ? <Check size={16} /> : <Bookmark size={16} />}</button>
          <button className="icon-btn" onClick={() => setOpen(!open)} aria-label="Adicionar à viagem"><Plus size={16} /></button>
        </div>
      </div>
      {open && <AddToTrip place={p} compact onDone={m => { toast(m); setOpen(false); }} />}
    </div>
  );
}
