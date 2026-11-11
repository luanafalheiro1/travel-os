import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Compass, Loader2, MapPin } from 'lucide-react';
import { useDB } from '../lib/store';
import { EXPLORE_TYPES, searchNearby, useMaps, type FoundPlace } from '../lib/gmaps';
import { cityInfo, flag } from '../data/cities';
import { norm } from '../lib/util';
import type { Geo } from '../types';
import GMap from '../components/GMap';
import { PlaceSearch } from '../components/places';
import { IdeaCard, isDone } from './Home';
import { Empty } from '../components/bits';
import { useToast } from '../App';

interface Base { key: string; label: string; geo: Geo; sub?: string }

export default function Explore() {
  const db = useDB();
  const toast = useToast();
  const { status } = useMaps();
  const [sp] = useSearchParams();
  const tripId = sp.get('trip');
  const trips = [...db.trips].sort((a, b) => (isDone(a) ? 1 : 0) - (isDone(b) ? 1 : 0) || a.start.localeCompare(b.start));

  const bases = useMemo(() => {
    const out: Base[] = [];
    const seen = new Set<string>();
    const order = tripId ? [...trips].sort((a, b) => (a.id === tripId ? -1 : b.id === tripId ? 1 : 0)) : trips;
    order.forEach(t => t.cities.forEach(c => { const ci = cityInfo(c); if (ci && !seen.has(c)) { seen.add(c); out.push({ key: 'c:' + c, label: c, geo: { lat: ci.lat, lng: ci.lng }, sub: `${flag(ci.country)} ${t.name}` }); } }));
    return out;
  }, [trips, tripId]);

  const [base, setBase] = useState<Base | null>(null);
  const [type, setType] = useState('atracoes');
  const [res, setRes] = useState<FoundPlace[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const cur = base || bases[0] || null;

  const known = useMemo(() => new Set([...db.trips.flatMap(t => t.days.flatMap(d => d.items.map(i => i.placeId || norm(i.name)))), ...db.places.map(p => p.placeId || norm(p.name))]), [db]);

  // Lugares salvos perto da base escolhida
  const nearSaved = useMemo(() => cur ? db.places.filter(p => p.geo && Math.abs(p.geo.lat - cur.geo.lat) < 0.08 && Math.abs(p.geo.lng - cur.geo.lng) < 0.12) : [], [db.places, cur]);

  useEffect(() => {
    if (!cur || status !== 'ready') return;
    let live = true; setBusy(true); setErr(''); setRes(null);
    searchNearby(cur.geo, type, 3000).then(r => live && setRes(r)).catch(() => live && setErr('A busca no Google falhou. Tente de novo em instantes.')).finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [cur?.key, cur?.geo.lat, type, status]);

  return (
    <div className="stack-lg">
      <div><span className="eyebrow">Explorar</span><h1>Descobrir lugares</h1><p className="muted">Lugares populares no Google Maps perto das cidades das suas viagens. Os que você já tem no roteiro ou salvou aparecem marcados.</p></div>

      <div className="card pad stack-sm">
        <b>Perto de onde?</b>
        <div className="chips-row scroll">
          {bases.map(b => <button key={b.key} className={'chip-btn' + (cur?.key === b.key ? ' on' : '')} onClick={() => setBase(b)} title={b.sub}>{b.label}</button>)}
          {base && !bases.some(b => b.key === base.key) && <button className="chip-btn on">{base.label}</button>}
        </div>
        <div style={{ maxWidth: 520 }}>
          <PlaceSearch allowText={false} placeholder="Ou busque outra cidade ou lugar como ponto de partida"
            onPick={p => { if (p.geo) setBase({ key: 'g:' + (p.placeId || p.name), label: p.name, geo: p.geo }); }} />
        </div>
        <div className="chips-row scroll">{EXPLORE_TYPES.map(x => <button key={x.id} className={'chip-btn sm' + (x.id === type ? ' on' : '')} onClick={() => setType(x.id)}>{x.label}</button>)}</div>
      </div>

      {status !== 'ready' ? (
        <div className="card pad"><Empty icon={<Compass size={34} />} title="Conecte o Google Maps para explorar">As sugestões usam fotos, avaliações e popularidade reais do Google. <Link to="/config">Abrir configurações</Link></Empty></div>
      ) : (
        <div className="explore">
          <div className="stack">
            {busy && <p className="row muted"><Loader2 className="spin" size={16} />Buscando em {cur?.label}…</p>}
            {err && <p className="err">{err}</p>}
            {res && !busy && <div className="idea-grid">{res.map(p => (
              <div key={p.placeId} className="idea-wrap">{known.has(p.placeId || '') || known.has(norm(p.name)) ? <span className="known">Já está com você</span> : null}<IdeaCard p={p} toast={toast} /></div>
            ))}</div>}
            {res && !res.length && !busy && <p className="muted">Nada encontrado nessa categoria por perto.</p>}
          </div>
          <div className="stack">
            <div className="card"><GMap height={380} markers={(res || []).filter(p => p.geo).map((p, i) => ({ id: p.placeId || String(i), pos: p.geo!, title: p.name, label: String(i + 1) }))} /></div>
            {nearSaved.length > 0 && <div className="card pad stack-sm"><h3>Seus lugares salvos por aqui</h3>{nearSaved.slice(0, 12).map(p => <Link key={p.id} to={`/lugares?p=${p.id}`} className="up-row"><MapPin size={14} /><b>{p.name}</b></Link>)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
