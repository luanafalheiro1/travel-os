import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileUp, Loader2, LocateFixed, MapPinned, Search, Upload, X } from 'lucide-react';
import { getDB, update, useDB } from '../lib/store';
import { locate, useMaps } from '../lib/gmaps';
import { importFile, ptCountry, type ImportResult } from '../lib/importers';
import { flag } from '../data/cities';
import { cls, norm } from '../lib/util';
import type { SavedPlace } from '../types';
import GMap from '../components/GMap';
import { AddToTrip, PlaceDrawer, PlaceSearch, savePlace } from '../components/places';
import { Empty } from '../components/bits';
import { ConfirmDelete } from './trip/Tabs';
import { useToast } from '../App';

function dist(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3, r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos((a.lat + b.lat) / 2 * r), y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * R;
}
function isDup(p: SavedPlace, pool: SavedPlace[]) {
  return pool.some(x => x.id !== p.id && ((p.placeId && x.placeId === p.placeId) || (norm(x.name) === norm(p.name) && (!x.geo || !p.geo || dist(x.geo, p.geo) < 300))));
}

function ImportPanel({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [res, setRes] = useState<ImportResult | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [skipDup, setSkipDup] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const read = async (files: File[]) => {
    setBusy(true); setErr('');
    const all: ImportResult = { places: [], skipped: 0, lines: 0, lists: [] };
    for (const f of files) {
      try { const r = await importFile(f); all.places.push(...r.places); all.skipped += r.skipped; all.lines += r.lines; all.lists.push(...r.lists); }
      catch (e: any) { setErr(`${f.name}: ${e.message || 'não foi possível ler.'}`); }
    }
    setRes(all.places.length ? all : null); setBusy(false);
  };
  const existing = getDB().places;
  const dups = res ? res.places.filter(p => isDup(p, existing) || isDup(p, res.places.filter(x => x.id < p.id))) : [];
  const toAdd = res ? res.places.filter(p => !skipDup || !dups.includes(p)) : [];
  const noGeo = toAdd.filter(p => !p.geo).length;
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal card wide" onClick={e => e.stopPropagation()}>
        <div className="row"><h2>Importar do Google Maps</h2><span className="sp" /><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
        {!res && (
          <>
            <div className="import-grid">
              <div className="import-how">
                <b>Google My Maps</b>
                <ol><li>Abra o mapa em mymaps.google.com, no computador.</li><li>Clique nos três pontinhos ao lado do nome do mapa.</li><li>Escolha <i>Exportar para KML/KMZ</i> e baixe o arquivo.</li></ol>
                <small className="muted">Traz nomes, descrições, coordenadas e camadas (viram listas).</small>
              </div>
              <div className="import-how">
                <b>Listas do app Google Maps</b>
                <ol><li>Acesse takeout.google.com.</li><li>Clique em <i>Desmarcar tudo</i> e marque só <i>Salvos</i>.</li><li>Crie a exportação e baixe o .zip que chega por e-mail.</li></ol>
                <small className="muted">Cada lista vira uma lista aqui. O Google não manda coordenadas nesse arquivo: depois eu localizo cada lugar pelo nome.</small>
              </div>
            </div>
            <button className="dropzone" onClick={() => input.current?.click()} disabled={busy}
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); read([...e.dataTransfer.files]); }}>
              {busy ? <Loader2 className="spin" /> : <FileUp size={28} />}
              <b>{busy ? 'Lendo arquivos…' : 'Escolher arquivos'}</b>
              <small className="muted">KML, KMZ, CSV, JSON ou o .zip do Takeout. Pode enviar vários de uma vez.</small>
            </button>
            <input ref={input} id="imp-files" type="file" multiple hidden accept=".kml,.kmz,.csv,.json,.geojson,.zip" onChange={e => { const f = [...(e.target.files || [])]; e.target.value = ''; read(f); }} />
            {err && <p className="err">{err}</p>}
          </>
        )}
        {res && (
          <div className="stack">
            <div className="review">
              <div><b>{res.places.length}</b><small>lugares encontrados</small></div>
              <div><b>{new Set(res.lists).size}</b><small>listas</small></div>
              <div><b>{dups.length}</b><small>possíveis duplicados</small></div>
              <div><b>{res.places.filter(p => !p.geo).length}</b><small>sem coordenadas</small></div>
            </div>
            {res.lines > 0 && <p className="muted small">{res.lines} rotas desenhadas no My Maps não foram importadas: por enquanto entram só os marcadores.</p>}
            {dups.length > 0 && <label className="row"><input type="checkbox" checked={skipDup} onChange={e => setSkipDup(e.target.checked)} />Pular os {dups.length} que parecem repetidos</label>}
            <div className="review-list">
              {res.places.slice(0, 200).map(p => (
                <div key={p.id} className={cls('review-row', skipDup && dups.includes(p) && 'skip')}>
                  <b>{p.name}</b><small className="muted">{p.list}{p.country ? ' · ' + p.country : ''}{!p.geo ? ' · sem coordenadas' : ''}{dups.includes(p) ? ' · repetido' : ''}</small>
                </div>
              ))}
              {res.places.length > 200 && <small className="muted">e mais {res.places.length - 200}…</small>}
            </div>
            <div className="row"><button className="btn" onClick={() => setRes(null)}>Escolher outros arquivos</button><span className="sp" />
              <button className="btn btn-primary" onClick={() => { update(d => { d.places.unshift(...toAdd); }); toast(`${toAdd.length} ${toAdd.length === 1 ? 'lugar importado' : 'lugares importados'}${noGeo ? `. ${noGeo} ${noGeo === 1 ? 'precisa' : 'precisam'} ser localizado${noGeo === 1 ? '' : 's'} no mapa` : ''}.`); onClose(); }}>
                <Upload size={16} />Importar {toAdd.length} lugares</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Places() {
  const db = useDB();
  const toast = useToast();
  const { status } = useMaps();
  const [sp, setSp] = useSearchParams();
  const [imp, setImp] = useState(false);
  const [q, setQ] = useState('');
  const [list, setList] = useState('');
  const [country, setCountry] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [open, setOpen] = useState<SavedPlace | null>(null);
  const [loc, setLoc] = useState<{ n: number; total: number } | null>(null);
  useEffect(() => { const p = sp.get('p'); if (p) { const x = db.places.find(y => y.id === p); if (x) setOpen(x); } }, [sp, db.places]);

  const lists = useMemo(() => [...new Set(db.places.map(p => p.list))].sort(), [db.places]);
  const countries = useMemo(() => { const m = new Map<string, number>(); db.places.forEach(p => { const c = ptCountry(p.country) || 'Sem país'; m.set(c, (m.get(c) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [db.places]);
  const shown = db.places.filter(p => (!list || p.list === list) && (!country || (ptCountry(p.country) || 'Sem país') === country) && (!onlyMissing || !p.geo) && (!q || norm(`${p.name} ${p.note || ''} ${p.address || ''} ${p.city || ''}`).includes(norm(q))));
  const missing = shown.filter(p => !p.geo);
  const dupCount = db.places.filter(p => isDup(p, db.places)).length;

  const byCity = useMemo(() => { const m = new Map<string, SavedPlace[]>(); shown.forEach(p => { const k = p.city || p.list; m.set(k, [...(m.get(k) || []), p]); }); return [...m.entries()].sort((a, b) => b[1].length - a[1].length); }, [shown]);

  return (
    <div className="stack-lg">
      <div className="row wrap">
        <div><span className="eyebrow">Biblioteca global</span><h1>Meus lugares</h1><p className="muted">{db.places.length} lugares em {lists.length} {lists.length === 1 ? 'lista' : 'listas'}, para usar em qualquer viagem.</p></div>
        <span className="sp" />
        <button className="btn btn-primary" onClick={() => setImp(true)}><FileUp size={16} />Importar do Google Maps</button>
      </div>

      {!db.places.length ? (
        <div className="card pad">
          <Empty icon={<MapPinned size={34} />} title="Traga seus lugares salvos do Google Maps">
            Importe os mapas do My Maps (KML/KMZ) e as listas do app (Google Takeout). Eles aparecem aqui organizados por país e cidade, prontos para entrar nas viagens.
            <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}><button className="btn btn-primary" onClick={() => setImp(true)}><FileUp size={16} />Importar agora</button></div>
          </Empty>
          <div style={{ maxWidth: 560, margin: '16px auto 0' }}><PlaceSearch allowText={false} placeholder="Ou busque e salve um lugar" onPick={p => { savePlace(p); toast('Lugar salvo'); }} /></div>
        </div>
      ) : (
        <>
          <div className="card pad stack-sm">
            <div className="row wrap">
              <div className="psearch-bar" style={{ flex: '1 1 240px' }}><Search size={17} /><input id="pl-q" value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar seus lugares" aria-label="Filtrar lugares" /></div>
              <select id="pl-list" value={list} onChange={e => setList(e.target.value)} style={{ width: 'auto', maxWidth: '100%' }} aria-label="Lista"><option value="">Todas as listas</option>{lists.map(l => <option key={l}>{l}</option>)}</select>
              <label className="row small"><input type="checkbox" checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} />Só sem localização</label>
            </div>
            <div className="chips-row scroll">
              <button className={'chip-btn' + (!country ? ' on' : '')} onClick={() => setCountry('')}>Todos os países</button>
              {countries.map(([c, n]) => <button key={c} className={'chip-btn' + (country === c ? ' on' : '')} onClick={() => setCountry(c)}>{flag(c)} {c} <small>{n}</small></button>)}
            </div>
            <div className="row wrap">
              {missing.length > 0 && status === 'ready' && (
                <button className="btn btn-sm btn-primary" disabled={!!loc} onClick={async () => {
                  setLoc({ n: 0, total: missing.length }); let k = 0;
                  for (const p of missing) {
                    try { const r = await locate(p.name + (p.address ? ', ' + p.address : '')); if (r) update(d => { const x = d.places.find(y => y.id === p.id); if (x) Object.assign(x, r, { country: ptCountry(r.country) }); }); } catch { /* segue */ }
                    setLoc({ n: ++k, total: missing.length });
                  }
                  setLoc(null); toast('Localização concluída. Confira os lugares com nomes ambíguos.');
                }}>{loc ? <><Loader2 className="spin" size={14} />Localizando {loc.n} de {loc.total}…</> : <><LocateFixed size={14} />Localizar {missing.length} no mapa</>}</button>
              )}
              {dupCount > 0 && <span className="tag warn">{dupCount} lugares parecem repetidos (marcados na lista)</span>}
              <span className="sp" />
              <div style={{ flex: '1 1 280px' }}><PlaceSearch allowText={false} placeholder="Buscar e salvar um lugar novo" onPick={p => { savePlace(p) ? toast('Lugar salvo') : toast('Esse lugar já está salvo'); }} /></div>
            </div>
          </div>

          <div className="lib">
            <div className="card lib-map">
              <GMap cluster={shown.length > 40} height={560} selected={open?.id} onSelect={id => { const p = db.places.find(x => x.id === id); if (p) { setOpen(p); setSp({ p: p.id }, { replace: true }); } }}
                markers={shown.filter(p => p.geo).map(p => ({ id: p.id, pos: p.geo!, title: p.name, color: '#4F46E5' }))} />
            </div>
            <div className="card lib-list">
              {byCity.map(([k, ps]) => (
                <div key={k}>
                  <div className="lib-group">{k} <small>{ps.length}</small></div>
                  {ps.map(p => (
                    <button key={p.id} className={cls('lib-row', open?.id === p.id && 'on')} onClick={() => { setOpen(p); setSp({ p: p.id }, { replace: true }); }}>
                      <b>{p.name}</b>
                      <small className="muted">{[p.address || p.note, !p.geo && 'sem localização', isDup(p, db.places) && 'repetido?'].filter(Boolean).join(' · ')}</small>
                    </button>
                  ))}
                </div>
              ))}
              {!shown.length && <p className="muted pad-sm">Nenhum lugar com esses filtros.</p>}
            </div>
          </div>
        </>
      )}
      {imp && <ImportPanel onClose={() => setImp(false)} />}
      {open && (
        <PlaceDrawer place={open} toast={toast} onClose={() => { setOpen(null); setSp({}, { replace: true }); }}
          onLocated={r => update(d => { const x = d.places.find(y => y.id === open.id); if (x && !x.placeId) Object.assign(x, r, { country: ptCountry(r.country) }); })}
          actions={<div className="stack-sm">
            <h3>Adicionar a uma viagem</h3>
            <AddToTrip place={open} onDone={m => toast(m)} />
            <div className="row"><span className="muted small">Lista: {open.list}{open.source === 'mymaps' ? ' (My Maps)' : open.source === 'takeout' ? ' (Google Takeout)' : ''}</span><span className="sp" />
              <ConfirmDelete label="Remover" onConfirm={() => { update(d => { d.places = d.places.filter(x => x.id !== open.id); }); setOpen(null); toast('Lugar removido da biblioteca'); }} /></div>
            {open.source === 'takeout' && open.placeId && <p className="muted small row"><CheckCircle2 size={14} />Localizado pelo nome. Se o pin estiver errado, remova e busque o lugar certo.</p>}
          </div>} />
      )}
    </div>
  );
}
