import { useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BedDouble, CalendarDays, CheckCircle2, CircleDashed, ClipboardList, Copy, Lightbulb, Map as MapIcon, NotebookPen, Pencil, Plane, Route, Ticket, Users, X } from 'lucide-react';
import { update, updateTrip, useDB } from '../lib/store';
import { useMaps } from '../lib/gmaps';
import { cityInfo, flag } from '../data/cities';
import { diffDays, fmtDM, fmtRange, fmtShort, gmPlace, today } from '../lib/util';
import { STATUSES, type Status, type Trip } from '../types';
import { GPhoto, LiveTimes } from '../components/bits';
import Itinerary, { dayRouteLinks } from './trip/Itinerary';
import { Bookings, Checklist, ConfirmDelete, Journal, TripCalendar, TripMap, Tips } from './trip/Tabs';
import { STATUS_COLOR, nightsCovered, tripCountries } from './Home';
import { blankDays, resolveCities } from './Trips';
import { useToast } from '../App';

const TABS = [
  { id: 'geral', label: 'Visão geral', icon: ClipboardList },
  { id: 'roteiro', label: 'Roteiro', icon: Route },
  { id: 'calendario', label: 'Calendário', icon: CalendarDays },
  { id: 'mapa', label: 'Mapa', icon: MapIcon },
  { id: 'reservas', label: 'Reservas', icon: Ticket },
  { id: 'checklist', label: 'Checklist', icon: CheckCircle2 },
  { id: 'diario', label: 'Diário e fotos', icon: NotebookPen },
  { id: 'dicas', label: 'Dicas', icon: Lightbulb },
];

export default function TripPage() {
  const { id, tab = 'geral' } = useParams();
  const db = useDB();
  const t = db.trips.find(x => x.id === id);
  const [edit, setEdit] = useState(false);
  if (!t) return <div className="stack"><h1>Viagem não encontrada</h1><Link to="/viagens">Ver todas as viagens</Link></div>;
  const td = today();
  const live = t.start <= td && td <= t.end;
  const n = diffDays(td, t.start);
  return (
    <div className="stack-lg">
      <section className="trip-hero">
        <GPhoto q={t.coverQuery || cityInfo(t.cities[0])?.q || t.name} className="trip-hero-img" width={1600} />
        <div className="trip-hero-shade" />
        <div className="trip-hero-in">
          <Link to="/viagens" className="back"><ArrowLeft size={16} />Viagens</Link>
          <div className="trip-hero-b">
            <span className="status-pill" style={{ background: STATUS_COLOR[t.status] }}>{t.status}</span>
            <h1>{t.name}</h1>
            <p>{fmtRange(t.start, t.end)} · {diffDays(t.start, t.end) + 1} dias{t.travelers ? ` · ${t.travelers} viajantes` : ''}</p>
            <p className="trip-hero-cities">{t.cities.join(' · ')}</p>
          </div>
          <div className="trip-hero-side">
            {live ? <span className="pill-glass">Viagem em andamento</span> : n > 0 ? <span className="pill-glass"><b>{n}</b> dias para embarcar</span> : null}
            <button className="pill-glass btn-glass" onClick={() => setEdit(true)}><Pencil size={14} />Editar</button>
          </div>
        </div>
      </section>

      <nav className="tabs" aria-label="Seções da viagem">
        {TABS.map(x => <NavLink key={x.id} to={`/viagem/${t.id}/${x.id}`} className={() => (tab === x.id ? 'on' : '')}><x.icon size={16} />{x.label}</NavLink>)}
      </nav>

      {tab === 'geral' && <Overview t={t} />}
      {tab === 'roteiro' && <Itinerary t={t} />}
      {tab === 'calendario' && <TripCalendar t={t} />}
      {tab === 'mapa' && <TripMap t={t} />}
      {tab === 'reservas' && <Bookings t={t} />}
      {tab === 'checklist' && <Checklist t={t} />}
      {tab === 'diario' && <Journal t={t} />}
      {tab === 'dicas' && <Tips t={t} />}
      {edit && <EditTrip t={t} onClose={() => setEdit(false)} />}
    </div>
  );
}

function Overview({ t }: { t: Trip }) {
  const nav = useNavigate();
  const toast = useToast();
  const nights = nightsCovered(t);
  const acts = t.days.reduce((a, d) => a + d.items.length, 0);
  const doneActs = t.days.reduce((a, d) => a + d.items.filter(i => i.done).length, 0);
  const chk = t.checklist.flatMap(g => g.items);
  const td = today();
  const upcoming = t.days.filter(d => d.date >= td).flatMap(d => d.items.filter(i => !i.done).map(i => ({ d, i }))).slice(0, 5);
  const byCity = new Map<string, number>(); t.days.forEach(d => d.city && d.city !== 'Rio' && byCity.set(d.city, (byCity.get(d.city) || 0) + 1));
  const share = () => {
    let s = `*${t.name}* (${fmtRange(t.start, t.end)})\n`;
    t.days.forEach(d => { if (!d.items.length) return; s += `\n*${fmtShort(d.date)}${d.city ? ' · ' + d.city : ''}${d.title ? ' · ' + d.title : ''}*\n`; d.items.forEach(i => { s += `• ${i.time ? i.time + ' ' : ''}${i.name}${i.q !== null ? ' ' + (i.mapsUrl || gmPlace(i.q || i.name, i.placeId)) : ''}\n`; }); const r = dayRouteLinks(d.items); if (r.length) s += `Rota: ${r.join(' | ')}\n`; });
    navigator.clipboard.writeText(s).then(() => toast('Roteiro copiado com links do Google Maps. É só colar no WhatsApp.'), () => toast('Não consegui copiar. Tente pelo computador.'));
  };
  return (
    <div className="ov">
      <div className="ov-main stack">
        <div className="card pad">
          <div className="kv-status">
            <span className="row"><Plane size={16} />Transportes</span><span className={'tag ' + (t.legs.length && t.legs.every(l => l.booked) ? 'ok' : 'warn')}>{t.legs.filter(l => l.booked).length} de {t.legs.length} comprados</span>
            <span className="row"><BedDouble size={16} />Hospedagem</span>{nights.total && nights.covered >= nights.total ? <span className="tag ok"><CheckCircle2 size={14} />Todas as {nights.total} noites</span> : <span className="tag warn"><CircleDashed size={14} />{nights.total - nights.covered} de {nights.total} noites sem reserva</span>}
            <span className="row"><Route size={16} />Roteiro</span><span className={'tag ' + (acts ? 'ok' : 'warn')}>{acts ? `${acts} lugares${doneActs ? ` · ${doneActs} feitos` : ''}` : 'Ainda vazio'}</span>
            <span className="row"><ClipboardList size={16} />Checklist</span><span className={'tag ' + (chk.length && chk.every(i => i.done) ? 'ok' : 'warn')}>{chk.filter(i => i.done).length} de {chk.length}</span>
          </div>
          {t.planNote && <p className="note-box" style={{ marginTop: 12 }}>{t.planNote}</p>}
          {t.description && <p style={{ marginTop: 12 }}>{t.description}</p>}
          <div className="row wrap" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={() => nav(`/viagem/${t.id}/roteiro`)}><Route size={16} />Abrir roteiro</button>
            <button className="btn" onClick={share}><Copy size={16} />Copiar roteiro com links</button>
          </div>
        </div>

        <section className="card pad stack">
          <div className="row"><h2>Hospedagens</h2><span className="sp" /><Link className="btn btn-sm" to={`/viagem/${t.id}/reservas`}>Gerenciar</Link></div>
          <div className="stay-grid">
            {t.stays.map(s => (
              <div key={s.id} className="stay-mini">
                <GPhoto q={s.q || `${s.name}, ${s.city}`} className="stay-mini-img" width={500} />
                <div><b>{s.name}</b><small className="muted">{s.city}</small><small>{fmtDM(s.checkin)} → {fmtDM(s.checkout)}</small>
                  <span className={'tag ' + (s.booked ? 'ok' : 'warn')}>{s.booked ? 'Reservado' : 'A reservar'}</span></div>
              </div>
            ))}
          </div>
          {!t.stays.length && <p className="muted">Nenhuma hospedagem ainda. {nights.total} noites a reservar.</p>}
        </section>

        <section className="card pad stack">
          <div className="row"><h2>Transportes</h2><span className="sp" /><Link className="btn btn-sm" to={`/viagem/${t.id}/reservas`}>Gerenciar</Link></div>
          {t.legs.map(l => (
            <div key={l.id} className="leg static">
              <span className="leg-ic"><Plane size={18} /></span>
              <span className="leg-pt"><b>{l.dep || '—'}</b><small>{fmtShort(l.date)}</small><small>{l.from}</small></span>
              <span className="leg-line"><small>{l.mode}</small><i /></span>
              <span className="leg-pt right"><b>{l.arr || '—'}</b><small>{fmtShort(l.arrDate || l.date)}</small><small>{l.to}</small></span>
              <span className={'tag ' + (l.booked ? 'ok' : 'warn')}>{l.booked ? 'Comprado' : 'Pendente'}</span>
            </div>
          ))}
        </section>
      </div>

      <aside className="ov-side stack">
        <div className="card pad stack-sm"><h3>Horário agora</h3><LiveTimes cities={t.cities} /></div>
        <div className="card pad stack-sm">
          <h3>Cidades</h3>
          {t.cities.map(c => { const ci = cityInfo(c); return (
            <div key={c} className="city-row"><span className="flag">{ci ? flag(ci.country) : '📍'}</span><span>{c}<small className="muted">{ci?.country}</small></span><span className="sp" /><small className="muted">{byCity.get(c) ? `${byCity.get(c)} ${byCity.get(c) === 1 ? 'dia' : 'dias'}` : ''}</small></div>
          ); })}
          <small className="muted">{tripCountries(t).length} {tripCountries(t).length === 1 ? 'país' : 'países'}</small>
        </div>
        {upcoming.length > 0 && (
          <div className="card pad stack-sm">
            <h3>{t.start <= td && td <= t.end ? 'Próximas atividades' : 'Primeiras atividades'}</h3>
            {upcoming.map(({ d, i }) => <Link key={i.id} className="up-row" to={`/viagem/${t.id}/roteiro?dia=${d.date}`}><small>{fmtShort(d.date)}{i.time ? ' · ' + i.time : ''}</small><b>{i.name}</b></Link>)}
          </div>
        )}
      </aside>
    </div>
  );
}

function EditTrip({ t, onClose }: { t: Trip; onClose: () => void }) {
  const nav = useNavigate();
  const { status } = useMaps();
  const [f, setF] = useState({ name: t.name, start: t.start, end: t.end, status: t.status, cities: t.cities.join(', '), travelers: String(t.travelers || ''), budget: t.budget || '', description: t.description || '', coverQuery: t.coverQuery || '' });
  const [err, setErr] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.end < f.start) { setErr('A volta precisa ser depois da ida.'); return; }
    if (diffDays(f.start, f.end) > 180) { setErr('Use no máximo 180 dias.'); return; }
    const cities = f.cities.split(',').map(s => s.trim()).filter(Boolean);
    if (status === 'ready') await resolveCities(cities);
    updateTrip(t.id, tr => {
      Object.assign(tr, { name: f.name.trim(), status: f.status as Status, cities, travelers: +f.travelers || undefined, budget: f.budget || undefined, description: f.description || undefined, coverQuery: f.coverQuery || undefined });
      if (f.start !== tr.start || f.end !== tr.end) {
        const fresh = blankDays(f.start, f.end);
        const keep = new Map(tr.days.map(d => [d.date, d]));
        tr.ideas = tr.ideas || [];
        tr.days.forEach(d => { if (d.date < f.start || d.date > f.end) tr.ideas!.push(...d.items); });
        tr.days = fresh.map(d => keep.get(d.date) || d);
        tr.start = f.start; tr.end = f.end;
      }
    });
    onClose();
  };
  return (
    <div className="modal-wrap" onClick={onClose}><form className="modal card" onClick={e => e.stopPropagation()} onSubmit={save}>
      <div className="row"><h2>Editar viagem</h2><span className="sp" /><button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
      <label className="f">Nome<input id="et-name" required maxLength={60} value={f.name} onChange={set('name')} /></label>
      <div className="grid2"><label className="f">Ida<input id="et-start" type="date" required value={f.start} onChange={set('start')} /></label><label className="f">Volta<input id="et-end" type="date" required value={f.end} onChange={set('end')} /></label></div>
      <label className="f">Cidades (separe por vírgula)<input id="et-cities" maxLength={300} value={f.cities} onChange={set('cities')} /></label>
      <div className="grid2"><label className="f">Status<select id="et-status" value={f.status} onChange={set('status')}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="f"><span className="row"><Users size={14} />Viajantes</span><input id="et-trav" type="number" min={1} max={30} value={f.travelers} onChange={set('travelers')} /></label></div>
      <label className="f">Foto de capa (lugar buscado no Google)<input id="et-cover" maxLength={120} value={f.coverQuery} onChange={set('coverQuery')} placeholder="Ex.: Positano, Costa Amalfitana" /></label>
      <label className="f">Orçamento<input id="et-budget" maxLength={80} value={f.budget} onChange={set('budget')} /></label>
      <label className="f">Descrição<textarea id="et-desc" maxLength={500} value={f.description} onChange={set('description')} /></label>
      {(f.start !== t.start || f.end !== t.end) && <p className="muted small">Ao mudar as datas, lugares de dias que ficarem fora do período vão para “Ideias sem dia”.</p>}
      {err && <p className="err">{err}</p>}
      <div className="row"><ConfirmDelete label="Excluir viagem" onConfirm={() => { update(d => { d.trips = d.trips.filter(x => x.id !== t.id); d.photos = d.photos.filter(p => p.trip !== t.id); }); nav('/viagens'); }} /><span className="sp" /><button className="btn btn-primary">Salvar</button></div>
    </form></div>
  );
}

