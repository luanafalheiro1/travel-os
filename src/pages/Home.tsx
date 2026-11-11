import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BedDouble, CheckCircle2, ChevronRight, CircleDashed, Compass, Loader2, MapPin, Plane, Sparkles, Ticket } from 'lucide-react';
import { useDB } from '../lib/store';
import { EXPLORE_TYPES, searchNearby, useMaps, type FoundPlace } from '../lib/gmaps';
import { cityInfo, flag } from '../data/cities';
import { GPhoto, LiveTimes, MonthCalendar, type CalMark, longDate } from '../components/bits';
import GMap, { type MapMarker } from '../components/GMap';
import { SuggestionRow } from '../components/places';
import { useToast } from '../App';
import { addDays, diffDays, fmtRange, norm, toMin, today } from '../lib/util';
import type { Trip } from '../types';

export const TRIP_COLORS = ['#4F46E5', '#0EA5E9', '#16A34A', '#F59E0B', '#EC4899', '#7C3AED', '#0F766E'];
export const STATUS_COLOR: Record<string, string> = { 'Concluída': '#16A34A', 'Planejamento': '#4F46E5', 'Reservada': '#0EA5E9', 'Em andamento': '#F59E0B', 'Wishlist': '#EC4899', 'Arquivada': '#94A3B8' };

export function nightsCovered(t: Trip) {
  const total = Math.max(0, diffDays(t.start, t.end));
  let covered = 0;
  for (let i = 0; i < total; i++) { const n = addDays(t.start, i); if (t.stays.some(s => s.checkin <= n && n < s.checkout)) covered++; }
  return { total, covered };
}
export function tripCountries(t: Trip) { return [...new Set(t.cities.map(c => cityInfo(c)?.country).filter(Boolean) as string[])]; }
export const isDone = (t: Trip) => t.status === 'Concluída' || t.status === 'Arquivada';

function Countdown({ t }: { t: Trip }) {
  const n = diffDays(today(), t.start);
  return <div className="countdown"><b>{n}</b><span>{n === 1 ? 'dia para' : 'dias para'}<br />embarcar</span></div>;
}

function Hero({ t }: { t: Trip }) {
  const nav = useNavigate();
  const td = today();
  const live = t.start <= td && td <= t.end;
  const [i, setI] = useState(0);
  const shots = [t.coverQuery, ...t.cities.map(c => cityInfo(c)?.q || c)].filter(Boolean) as string[];
  useEffect(() => { const x = setInterval(() => setI(v => (v + 1) % shots.length), 6000); return () => clearInterval(x); }, [shots.length]);
  const nights = nightsCovered(t);
  const legsBooked = t.legs.filter(l => l.booked).length;
  const acts = t.days.reduce((a, d) => a + d.items.length, 0);
  const todayDay = t.days.find(d => d.date === td);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nextItem = todayDay?.items.filter(x => x.time && !x.done && (toMin(x.time)! >= nowMin - 30)).sort((a, b) => a.time!.localeCompare(b.time!))[0];
  return (
    <section className="card hero">
      <div className="hero-media">
        <GPhoto q={shots[i]} className="hero-photo" alt={shots[i]} />
        <div className="hero-dots">{shots.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Foto ${k + 1}`} />)}</div>
        <span className="hero-cap">{shots[i]}</span>
      </div>
      <div className="hero-body">
        <span className="eyebrow">{live ? 'Viagem em andamento' : 'Próxima viagem'}</span>
        <h1>{t.name}</h1>
        <p className="row muted"><MapPin size={16} />{t.cities.join(' · ')}</p>
        <p className="muted">{fmtRange(t.start, t.end)} · {diffDays(t.start, t.end) + 1} dias</p>
        {!live && <Countdown t={t} />}
        {live && todayDay && (
          <div className="today-box">
            <b>Hoje · {longDate(td)}{todayDay.city ? ' · ' + todayDay.city : ''}</b>
            {nextItem ? <span>Próxima: <b>{nextItem.time} {nextItem.name}</b></span> : <span>{todayDay.items.length} lugares no roteiro de hoje</span>}
          </div>
        )}
        <LiveTimes cities={t.cities} />
        <div className="kv-status">
          <span className="row"><Plane size={16} />Passagens</span>{legsBooked ? <span className="tag ok"><CheckCircle2 size={14} />{legsBooked} {legsBooked === 1 ? 'reservada' : 'reservadas'}</span> : <span className="tag warn"><CircleDashed size={14} />Pendente</span>}
          <span className="row"><BedDouble size={16} />Hospedagem</span>{nights.covered >= nights.total && nights.total ? <span className="tag ok"><CheckCircle2 size={14} />Todas as noites</span> : <span className="tag warn"><CircleDashed size={14} />{nights.total - nights.covered} de {nights.total} noites sem reserva</span>}
          <span className="row"><Ticket size={16} />Roteiro</span>{acts ? <span className="tag ok"><CheckCircle2 size={14} />{acts} lugares</span> : <Link className="tag link" to={`/viagem/${t.id}/roteiro`}><Sparkles size={14} />Começar a planejar</Link>}
        </div>
        <div className="row wrap">
          <button className="btn btn-primary" onClick={() => nav(`/viagem/${t.id}${live ? '/roteiro' : ''}`)}>{live ? 'Ver o dia de hoje' : 'Abrir planejamento'}<ArrowRight size={16} /></button>
          <Link className="btn" to={`/explorar?trip=${t.id}`}><Compass size={16} />Ideias de lugares</Link>
        </div>
      </div>
    </section>
  );
}

function Ideas({ t }: { t: Trip }) {
  const { status } = useMaps();
  const toast = useToast();
  const cities = t.cities.filter(c => cityInfo(c));
  const [city, setCity] = useState(cities[0] || '');
  const [type, setType] = useState('atracoes');
  const [res, setRes] = useState<FoundPlace[] | null>(null);
  const [busy, setBusy] = useState(false);
  const known = useMemo(() => new Set(t.days.flatMap(d => d.items.map(x => x.placeId || norm(x.name)))), [t]);
  useEffect(() => {
    const info = cityInfo(city);
    if (status !== 'ready' || !info) return;
    let live = true; setBusy(true); setRes(null);
    searchNearby({ lat: info.lat, lng: info.lng }, type, 4000)
      .then(r => { if (live) setRes(r.filter(p => !known.has(p.placeId || '') && !known.has(norm(p.name)))); })
      .catch(() => live && setRes([])).finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [city, type, status, known]);
  if (!cities.length) return null;
  return (
    <section className="card pad stack">
      <div className="row wrap">
        <div><span className="eyebrow">Sugestões do Google Maps</span><h2>Ideias para a {t.name}</h2></div>
        <span className="sp" />
        <Link to={`/explorar?trip=${t.id}`} className="btn btn-sm">Explorar mais<ChevronRight size={15} /></Link>
      </div>
      <div className="chips-row scroll">{cities.map(c => <button key={c} className={'chip-btn' + (c === city ? ' on' : '')} onClick={() => setCity(c)}>{flag(cityInfo(c)!.country)} {c}</button>)}</div>
      <div className="chips-row scroll">{EXPLORE_TYPES.map(x => <button key={x.id} className={'chip-btn sm' + (x.id === type ? ' on' : '')} onClick={() => setType(x.id)}>{x.label}</button>)}</div>
      {status !== 'ready' && <p className="muted">Conecte o Google Maps em <Link to="/config">Configurações</Link> para receber sugestões com fotos e avaliações reais.</p>}
      {busy && <p className="row muted"><Loader2 className="spin" size={16} />Buscando lugares populares em {city}…</p>}
      {res && res.length === 0 && !busy && <p className="muted">Nenhuma sugestão nova nesta categoria.</p>}
      {res && res.length > 0 && <div className="idea-grid">{res.slice(0, 9).map(p => <IdeaCard key={p.placeId} p={p} toast={toast} />)}</div>}
    </section>
  );
}

export function IdeaCard({ p, toast }: { p: FoundPlace; toast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="idea">
      <div className="idea-img">{p.photo ? <img src={p.photo} alt="" referrerPolicy="no-referrer" loading="lazy" /> : <MapPin />}
        {p.rating != null && <span className="idea-rate">★ {p.rating.toFixed(1)}</span>}
      </div>
      {!open ? (
        <div className="idea-b"><b>{p.name}</b><small className="muted">{p.type}{p.ratings ? ` · ${p.ratings.toLocaleString('pt-BR')} avaliações` : ''}</small>
          <button className="btn btn-sm" onClick={() => setOpen(true)}>Adicionar ou salvar</button></div>
      ) : <div className="idea-b"><SuggestionRow p={p} toast={toast} /></div>}
    </div>
  );
}

export default function Home() {
  const db = useDB();
  const nav = useNavigate();
  const td = today();
  const trips = [...db.trips].sort((a, b) => b.start.localeCompare(a.start));
  const focus = trips.find(t => t.start <= td && td <= t.end && !isDone(t)) || [...trips].filter(t => t.start > td && !isDone(t)).sort((a, b) => a.start.localeCompare(b.start))[0];
  const [month, setMonth] = useState(focus ? focus.start : td);

  const done = trips.filter(t => t.status === 'Concluída');
  const countries = new Map<string, Trip[]>();
  trips.forEach(t => tripCountries(t).forEach(c => countries.set(c, [...(countries.get(c) || []), t])));
  const visitedCountries = new Set(done.flatMap(tripCountries));
  const visitedCities = new Set(done.flatMap(t => t.cities));

  const marks: CalMark[] = [];
  trips.forEach((t, i) => { for (let d = t.start; d <= t.end; d = addDays(d, 1)) marks.push({ date: d, color: TRIP_COLORS[i % TRIP_COLORS.length] + '26', label: t.name, onClick: () => nav(`/viagem/${t.id}/roteiro?dia=${d}`) }); });

  const markers: MapMarker[] = [];
  const seenCity = new Set<string>();
  trips.forEach(t => t.cities.forEach(c => {
    const ci = cityInfo(c); if (!ci || seenCity.has(c)) return; seenCity.add(c);
    markers.push({ id: 'c:' + c, pos: { lat: ci.lat, lng: ci.lng }, title: `${c} · ${t.name}`, color: STATUS_COLOR[t.status] });
  }));
  db.places.filter(p => p.geo).forEach(p => markers.push({ id: 'p:' + p.id, pos: p.geo!, title: p.name, color: '#94A3B8', small: true }));

  return (
    <div className="stack-lg">
      <div className="dash">
        <div className="dash-main">{focus ? <Hero t={focus} /> : (
          <section className="card pad stack"><span className="eyebrow">My travel world</span><h1>Para onde vamos agora?</h1><Link to="/viagens?nova=1" className="btn btn-primary" style={{ alignSelf: 'start' }}>Criar viagem</Link></section>
        )}</div>
        <div className="dash-side">
          <div className="stats">
            <Link to="/viagens" className="card stat"><span>Viagens</span><b>{trips.length}</b><small>{trips.filter(t => !isDone(t)).length} em planejamento</small></Link>
            <div className="card stat"><span>Países visitados</span><b>{visitedCountries.size}</b><small>{[...visitedCountries].map(flag).join(' ')}</small></div>
            <div className="card stat"><span>Cidades visitadas</span><b>{visitedCities.size}</b><small>em {done.length} {done.length === 1 ? 'viagem' : 'viagens'}</small></div>
            <Link to="/lugares" className="card stat"><span>Lugares salvos</span><b>{db.places.length}</b><small>{db.places.length ? 'ver no mapa' : 'importar do Google'}</small></Link>
          </div>
          <div className="card pad"><MonthCalendar month={month} onMonth={setMonth} marks={marks} compact /></div>
        </div>
      </div>

      <div className="dash">
        <section className="card dash-main map-card">
          <div className="map-card-head"><div><span className="eyebrow">My travel map</span><h2>Onde já fomos e para onde vamos</h2></div>
            <div className="legend"><span><i style={{ background: STATUS_COLOR['Concluída'] }} />Visitado</span><span><i style={{ background: STATUS_COLOR['Planejamento'] }} />Planejado</span><span><i style={{ background: '#94A3B8' }} />Lugar salvo</span></div></div>
          <GMap markers={markers} cluster={db.places.length > 30} height={420} maxZoom={6} onSelect={id => {
            if (id.startsWith('c:')) { const c = id.slice(2); const t = trips.find(x => x.cities.includes(c)); if (t) nav(`/viagem/${t.id}/mapa`); }
            else nav('/lugares?p=' + id.slice(2));
          }} />
        </section>
        <section className="card dash-side pad">
          <h3>Países</h3>
          <div className="country-list">
            {[...countries.entries()].sort((a, b) => b[1].length - a[1].length).map(([c, ts]) => (
              <div key={c} className="country">
                <span className="flag">{flag(c) || '🏳️'}</span><span className="c-name">{c}<small>{visitedCountries.has(c) ? 'visitado' : 'planejado'}</small></span>
                <Link className="btn btn-sm" to={`/viagem/${ts[0].id}`}>{ts.length > 1 ? `${ts.length} viagens` : ts[0].name}<ChevronRight size={14} /></Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      {focus && <Ideas t={focus} />}

      <section className="stack">
        <div className="row"><h2>Minhas viagens</h2><span className="sp" /><Link className="btn btn-sm" to="/viagens?nova=1">+ Nova viagem</Link></div>
        <div className="trip-grid">{trips.map(t => <TripCard key={t.id} t={t} />)}</div>
      </section>
    </div>
  );
}

export function TripCard({ t }: { t: Trip }) {
  return (
    <Link to={`/viagem/${t.id}`} className="card trip-card">
      <GPhoto q={t.coverQuery || cityInfo(t.cities[0])?.q || t.cities[0] || t.name} className="trip-card-img" width={800}>
        <span className="status-pill" style={{ background: STATUS_COLOR[t.status] }}>{t.status}</span>
      </GPhoto>
      <div className="trip-card-b">
        <b>{t.name}</b>
        <small className="muted">{t.cities.slice(0, 5).join(' · ')}{t.cities.length > 5 ? ` +${t.cities.length - 5}` : ''}</small>
        <small className="muted">{fmtRange(t.start, t.end)}</small>
      </div>
    </Link>
  );
}
