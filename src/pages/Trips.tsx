import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { getDB, update, useDB } from '../lib/store';
import { searchText, useMaps } from '../lib/gmaps';
import { COUNTRY_TZ, CITIES } from '../data/cities';
import { ptCountry } from '../lib/importers';
import { addDays, diffDays, norm, uid } from '../lib/util';
import { STATUSES, type Day, type Status, type Trip } from '../types';
import { TripCard, isDone } from './Home';
import { useToast } from '../App';

/** Garante coordenadas e fuso das cidades novas, usando o Google quando conectado. */
export async function resolveCities(names: string[]) {
  const missing = names.filter(n => !CITIES[n] && !getDB().customCities?.[n]);
  const found: Record<string, any> = {};
  for (const n of missing) {
    try {
      const r = (await searchText(n, { max: 1 }))[0];
      if (r?.geo) { const country = ptCountry(r.country) || ''; found[n] = { lat: r.geo.lat, lng: r.geo.lng, country, tz: COUNTRY_TZ[country] || COUNTRY_TZ[r.country || ''] || '', q: r.address || n }; }
    } catch { /* sem conexão: segue sem coordenadas */ }
  }
  if (Object.keys(found).length) update(d => { d.customCities = { ...(d.customCities || {}), ...found }; });
}

export function blankDays(start: string, end: string, firstCity = ''): Day[] {
  const n = diffDays(start, end);
  return Array.from({ length: n + 1 }, (_, i) => ({ date: addDays(start, i), city: firstCity, items: [] }));
}

function NewTrip({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const { status } = useMaps();
  const [f, setF] = useState({ name: '', start: '', end: '', cities: '', status: 'Planejamento' as Status, travelers: '2', budget: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.end < f.start) { setErr('A data de volta precisa ser depois da ida.'); return; }
    if (diffDays(f.start, f.end) > 180) { setErr('Use no máximo 180 dias por viagem.'); return; }
    const cities = f.cities.split(',').map(s => s.trim()).filter(Boolean);
    setBusy(true);
    if (status === 'ready') await resolveCities(cities);
    const t: Trip = { id: uid(), name: f.name.trim(), status: f.status, start: f.start, end: f.end, cities, travelers: +f.travelers || undefined,
      budget: f.budget || undefined, description: f.description || undefined, days: blankDays(f.start, f.end, cities.length === 1 ? cities[0] : ''),
      legs: [], stays: [], tips: [], apps: [], journal: {},
      checklist: [{ id: uid(), title: 'Antes da viagem', items: ['Passagens', 'Hospedagens', 'Seguro viagem', 'Documentos e vistos', 'Chip ou eSIM'].map(text => ({ id: uid(), text, done: false })) }] };
    update(d => d.trips.push(t));
    setBusy(false);
    nav(`/viagem/${t.id}`);
  };
  return (
    <div className="modal-wrap" onClick={onClose}>
      <form className="modal card" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="row"><h2>Nova viagem</h2><span className="sp" /><button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
        <label className="f">Nome da viagem<input id="nt-name" required maxLength={60} value={f.name} onChange={set('name')} placeholder="Ex.: Toscana 2028" /></label>
        <div className="grid2">
          <label className="f">Ida<input id="nt-start" type="date" required value={f.start} onChange={set('start')} /></label>
          <label className="f">Volta<input id="nt-end" type="date" required value={f.end} onChange={set('end')} /></label>
        </div>
        <label className="f">Cidades (separe por vírgula)<input id="nt-cities" maxLength={300} value={f.cities} onChange={set('cities')} placeholder="Florença, Siena, San Gimignano" /></label>
        <div className="grid2">
          <label className="f">Status<select id="nt-status" value={f.status} onChange={set('status')}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>
          <label className="f">Viajantes<input id="nt-trav" type="number" min={1} max={30} value={f.travelers} onChange={set('travelers')} /></label>
        </div>
        <label className="f">Orçamento estimado<input id="nt-budget" maxLength={80} value={f.budget} onChange={set('budget')} placeholder="Ex.: € 120 por dia" /></label>
        <label className="f">Descrição<textarea id="nt-desc" maxLength={500} value={f.description} onChange={set('description')} /></label>
        {err && <p className="err">{err}</p>}
        {status !== 'ready' && <p className="muted small">Com o Google Maps conectado, as cidades novas entram no mapa e no relógio automaticamente.</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}Criar viagem</button>
      </form>
    </div>
  );
}

export default function Trips() {
  const db = useDB();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const [st, setSt] = useState<string>('');
  const trips = [...db.trips].sort((a, b) => b.start.localeCompare(a.start))
    .filter(t => !st || t.status === st)
    .filter(t => !q || norm([t.name, ...t.cities, ...t.days.flatMap(d => d.items.map(i => i.name))].join(' ')).includes(norm(q)));
  const open = sp.get('nova') === '1';
  return (
    <div className="stack-lg">
      <div className="row wrap">
        <div><span className="eyebrow">My travel collection</span><h1>Viagens</h1></div>
        <span className="sp" />
        <button className="btn btn-primary" onClick={() => setSp({ nova: '1' })}><Plus size={16} />Nova viagem</button>
      </div>
      <div className="row wrap">
        <div className="psearch-bar" style={{ flex: '1 1 260px' }}><Search size={17} /><input id="trip-q" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar viagem, cidade ou lugar" aria-label="Buscar viagens" /></div>
        <div className="chips-row scroll">
          <button className={'chip-btn' + (!st ? ' on' : '')} onClick={() => setSt('')}>Todas</button>
          {STATUSES.map(s => <button key={s} className={'chip-btn' + (st === s ? ' on' : '')} onClick={() => setSt(s)}>{s}</button>)}
        </div>
      </div>
      <div className="trip-grid">
        {trips.map(t => (
          <div key={t.id} className="stack-sm">
            <TripCard t={t} />
            <button className="btn btn-sm btn-ghost" onClick={() => {
              const copy: Trip = structuredClone(t);
              copy.id = uid(); copy.name = t.name + ' (cópia)'; copy.status = 'Planejamento'; copy.journal = {};
              copy.days.forEach(d => d.items.forEach(i => { i.id = uid(); i.done = false; }));
              copy.checklist.forEach(g => g.items.forEach(i => (i.done = false)));
              update(d => d.trips.push(copy)); toast('Viagem duplicada. Ajuste as datas na cópia.');
            }}>Duplicar como modelo</button>
          </div>
        ))}
        <button className="card trip-new" onClick={() => setSp({ nova: '1' })}><Plus size={28} /><b>Next adventure</b><small className="muted">Criar nova viagem</small></button>
      </div>
      {!trips.length && <p className="muted">Nenhuma viagem encontrada.</p>}
      {open && <NewTrip onClose={() => setSp({})} />}
      <p className="muted small">{db.trips.filter(t => !isDone(t)).length} em planejamento · {db.trips.filter(isDone).length} concluídas</p>
    </div>
  );
}
