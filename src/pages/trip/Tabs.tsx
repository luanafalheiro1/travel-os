import { Fragment, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, Camera, Check, ImagePlus, Loader2, LocateFixed, Plane, Plus, Trash2, X } from 'lucide-react';
import { deletePhotoBlob, photoDate, savePhotoBlob, shrinkImage, update, updateTrip, useDB } from '../../lib/store';
import { useMaps } from '../../lib/gmaps';
import { cityInfo } from '../../data/cities';
import { MO, addDays, cls, diffDays, fmtDM, fmtShort, gmPlace, pd, today, uid } from '../../lib/util';
import type { Item, Leg, Stay, Trip } from '../../types';
import GMap, { type MapMarker } from '../../components/GMap';
import { GPhoto, LocalPhoto, longDate } from '../../components/bits';
import { PlaceDrawer } from '../../components/places';
import { DAY_COLORS, conflicts, coord, locateItems } from './Itinerary';
import { useToast } from '../../App';

/* ================= Calendário da viagem ================= */
export function TripCalendar({ t }: { t: Trip }) {
  const nav = useNavigate();
  const startW = pd(t.start); startW.setDate(startW.getDate() - ((startW.getDay() + 6) % 7));
  const endW = pd(t.end); endW.setDate(endW.getDate() + (6 - ((endW.getDay() + 6) % 7)));
  const cells: string[] = []; for (let d = new Date(startW); d <= endW; d.setDate(d.getDate() + 1)) cells.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  const cityColor = new Map<string, string>(); t.days.forEach(d => { if (d.city && !cityColor.has(d.city)) cityColor.set(d.city, DAY_COLORS[cityColor.size % DAY_COLORS.length]); });
  return (
    <div className="stack">
      <div className="legend">{[...cityColor.entries()].map(([c, col]) => <span key={c}><i style={{ background: col }} />{c}</span>)}</div>
      <div className="tcal">
        {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(w => <span key={w} className="cal-wd">{w}</span>)}
        {cells.map(c => {
          const d = t.days.find(x => x.date === c);
          if (!d) return <div key={c} className="tcal-cell out"><span className="tcal-n">{pd(c).getDate()}</span></div>;
          const col = cityColor.get(d.city) || '#CBD5E1';
          const items = [...d.items].sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
          const bad = conflicts(d.items);
          const legs = t.legs.filter(l => l.date === c);
          return (
            <button key={c} className={cls('tcal-cell', c === today() && 'today')} style={{ borderTopColor: col }} onClick={() => nav(`/viagem/${t.id}/roteiro?dia=${c}`)}>
              <span className="tcal-top"><span className="tcal-n">{pd(c).getDate()} {MO[pd(c).getMonth()]}</span>{d.city && <span className="tcal-city" style={{ color: col }}>{d.city}</span>}</span>
              {legs.map(l => <span key={l.id} className="tcal-leg">✈ {l.dep ? l.dep + ' ' : ''}{l.from} → {l.to}</span>)}
              {items.slice(0, 4).map(i => <span key={i.id} className={cls('tcal-it', i.done && 'done', bad.has(i.id) && 'bad')}>{i.time && <b>{i.time}</b>}{i.name}</span>)}
              {items.length > 4 && <small className="muted">+{items.length - 4} lugares</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================= Mapa da viagem ================= */
export function TripMap({ t }: { t: Trip }) {
  const toast = useToast();
  const { status } = useMaps();
  const [city, setCity] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState<Item | null>(null);
  const [loc, setLoc] = useState<{ n: number; total: number } | null>(null);
  const cities = [...new Set(t.days.map(d => d.city).filter(c => c && c !== 'Rio'))];
  const days = t.days.map((d, i) => ({ d, i })).filter(({ d }) => !city || d.city === city);
  const markers: MapMarker[] = days.flatMap(({ d, i }) => d.items.filter(x => coord(x)).map(x => ({ id: x.id, pos: coord(x)!, title: `${fmtShort(d.date)} · ${x.name}`, label: String(pd(d.date).getDate()), color: x.done ? '#94A3B8' : DAY_COLORS[i % DAY_COLORS.length] })));
  if (!city) t.cities.forEach(c => { const ci = cityInfo(c); if (ci && !days.some(({ d }) => d.city === c && d.items.some(x => coord(x)))) markers.push({ id: 'city:' + c, pos: { lat: ci.lat, lng: ci.lng }, title: c, color: '#0F172A' }); });
  const missing = days.flatMap(({ d }) => d.items.filter(x => !x.geo && x.q !== null).map(item => ({ day: d.date, item })));
  const all = days.flatMap(({ d }) => d.items.map(x => ({ x, d })));
  return (
    <div className="tmap">
      <div className="card tmap-map">
        <div className="row wrap pad-sm">
          <div className="chips-row scroll">
            <button className={'chip-btn' + (!city ? ' on' : '')} onClick={() => setCity('')}>Viagem inteira</button>
            {cities.map(c => <button key={c} className={'chip-btn' + (city === c ? ' on' : '')} onClick={() => setCity(c)}>{c}</button>)}
          </div>
          <span className="sp" />
          {missing.length > 0 && status === 'ready' && (
            <button className="btn btn-sm btn-primary" disabled={!!loc} onClick={async () => {
              setLoc({ n: 0, total: missing.length });
              await locateItems(t, missing, k => setLoc({ n: k, total: missing.length }));
              setLoc(null); toast('Pronto: lugares localizados no mapa.');
            }}>{loc ? <><Loader2 className="spin" size={14} />{loc.n} de {loc.total}…</> : <><LocateFixed size={14} />Posição exata de {missing.length} lugares</>}</button>
          )}
        </div>
        <GMap markers={markers} cluster={markers.length > 60} height={560} selected={sel} onSelect={id => { setSel(id); const f = all.find(a => a.x.id === id); if (f) setOpen(f.x); }} />
        {missing.length > 0 && status === 'ready' && !loc && <p className="muted small pad-sm">Os pinos de alguns lugares estão em posição aproximada. O botão acima busca cada um no Google uma única vez, guarda a posição exata e libera fotos e avaliações.</p>}
      </div>
      <div className="card tmap-list">
        {days.filter(({ d }) => d.items.length).map(({ d, i }) => (
          <div key={d.date}>
            <div className="tmap-day"><span className="dot" style={{ background: DAY_COLORS[i % DAY_COLORS.length] }} />{fmtShort(d.date)}{d.city ? ' · ' + d.city : ''}</div>
            {d.items.map(x => <button key={x.id} className={cls('tmap-it', sel === x.id && 'on', !coord(x) && 'nogeo')} onClick={() => { setSel(x.id); setOpen(x); }}>{x.time && <b>{x.time}</b>}{x.name}</button>)}
          </div>
        ))}
        {!all.length && <p className="muted pad-sm">Nenhum lugar no roteiro ainda.</p>}
      </div>
      {open && <PlaceDrawer place={open} toast={toast} onClose={() => setOpen(null)}
        onLocated={r => updateTrip(t.id, tr => { const x = tr.days.flatMap(d => d.items).find(y => y.id === open.id); if (x) Object.assign(x, r); })} />}
    </div>
  );
}

/* ================= Reservas: hospedagens e transportes ================= */
export function Bookings({ t }: { t: Trip }) {
  const [editStay, setEditStay] = useState<Stay | null>(null);
  const [editLeg, setEditLeg] = useState<Leg | null>(null);
  const nights = Math.max(0, diffDays(t.start, t.end));
  const gaps: string[] = [];
  for (let i = 0; i < nights; i++) { const n = addDays(t.start, i); if (!t.stays.some(s => s.checkin <= n && n < s.checkout)) gaps.push(n); }
  return (
    <div className="stack-lg">
      <section className="stack">
        <div className="row"><h2>Hospedagens</h2><span className="sp" /><button className="btn btn-sm btn-primary" onClick={() => setEditStay({ id: uid(), city: '', name: '', checkin: t.start, checkout: addDays(t.start, 1), info: [] })}><Plus size={15} />Hospedagem</button></div>
        {gaps.length > 0 && <div className="tag warn" style={{ alignSelf: 'start', whiteSpace: 'normal' }}>{gaps.length} {gaps.length === 1 ? 'noite' : 'noites'} sem hospedagem: {compactDates(gaps)}</div>}
        <div className="stay-grid">
          {t.stays.map(s => (
            <div key={s.id} className="card stay">
              <GPhoto q={s.q || `${s.name}, ${s.city}`} className="stay-img" width={600} />
              <div className="stay-b">
                <b>{s.name}</b>
                <small className="muted">{s.city}</small>
                <small>{fmtDM(s.checkin)} → {fmtDM(s.checkout)} · {diffDays(s.checkin, s.checkout)} {diffDays(s.checkin, s.checkout) === 1 ? 'noite' : 'noites'}</small>
                <dl className="kv">{s.info.map(([k, v], n) => <Fragment key={n}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
                <div className="row">
                  <span className={'tag ' + (s.booked ? 'ok' : 'warn')}>{s.booked ? <><Check size={13} />Reservado</> : 'A reservar'}</span>
                  <span className="sp" />
                  <a className="btn btn-sm" href={gmPlace(s.q || `${s.name} ${s.city}`)} target="_blank" rel="noopener">Maps</a>
                  <button className="btn btn-sm" onClick={() => setEditStay(s)}>Editar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!t.stays.length && <p className="muted">Nenhuma hospedagem cadastrada.</p>}
      </section>

      <section className="card pad stack">
        <div className="row"><h2>Transportes</h2><span className="sp" /><button className="btn btn-sm btn-primary" onClick={() => setEditLeg({ id: uid(), date: t.start, from: '', to: '', mode: 'Avião' })}><Plus size={15} />Trajeto</button></div>
        {t.legs.map(l => (
          <button key={l.id} className="leg" onClick={() => setEditLeg(l)}>
            <span className="leg-ic"><Plane size={18} /></span>
            <span className="leg-pt"><b>{l.dep || '—'}</b><small>{fmtShort(l.date)}</small><small>{l.from}</small></span>
            <span className="leg-line"><small>{l.mode}</small><i /></span>
            <span className="leg-pt right"><b>{l.arr || '—'}</b><small>{fmtShort(l.arrDate || l.date)}</small><small>{l.to}</small></span>
            <span className={'tag ' + (l.booked ? 'ok' : 'warn')}>{l.booked ? 'Comprado' : 'Pendente'}</span>
          </button>
        ))}
        {!t.legs.length && <p className="muted">Nenhum trajeto cadastrado.</p>}
      </section>
      {editStay && <StayForm t={t} s={editStay} onClose={() => setEditStay(null)} />}
      {editLeg && <LegForm t={t} l={editLeg} onClose={() => setEditLeg(null)} />}
    </div>
  );
}

function compactDates(ds: string[]) {
  const out: string[] = []; let a = ds[0], b = ds[0];
  for (let i = 1; i <= ds.length; i++) {
    if (ds[i] && diffDays(b, ds[i]) === 1) { b = ds[i]; continue; }
    out.push(a === b ? fmtDM(a) : `${fmtDM(a)} a ${fmtDM(addDays(b, 1))}`); a = b = ds[i];
  }
  return out.join(', ');
}

function StayForm({ t, s, onClose }: { t: Trip; s: Stay; onClose: () => void }) {
  const [f, setF] = useState({ ...s, infoText: s.info.map(([k, v]) => `${k}: ${v}`).join('\n') });
  const exists = t.stays.some(x => x.id === s.id);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.checkout <= f.checkin) return;
    const info = f.infoText.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const k = l.indexOf(':'); return (k > 0 ? [l.slice(0, k).trim(), l.slice(k + 1).trim()] : ['Obs.', l]) as [string, string]; });
    const st: Stay = { id: s.id, city: f.city, name: f.name, checkin: f.checkin, checkout: f.checkout, q: f.q || undefined, booked: f.booked, info };
    updateTrip(t.id, tr => { const k = tr.stays.findIndex(x => x.id === s.id); if (k >= 0) tr.stays[k] = st; else tr.stays.push(st); tr.stays.sort((a, b) => a.checkin.localeCompare(b.checkin)); });
    onClose();
  };
  return (
    <div className="modal-wrap" onClick={onClose}><form className="modal card" onClick={e => e.stopPropagation()} onSubmit={save}>
      <div className="row"><h2><BedDouble size={20} /> Hospedagem</h2><span className="sp" /><button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
      <div className="grid2"><label className="f">Nome<input id="st-name" required maxLength={100} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className="f">Cidade<input id="st-city" required maxLength={60} value={f.city} onChange={e => setF({ ...f, city: e.target.value })} list="trip-cities-all" /></label></div>
      <datalist id="trip-cities-all">{t.cities.map(c => <option key={c} value={c} />)}</datalist>
      <div className="grid2"><label className="f">Check-in<input id="st-in" type="date" required value={f.checkin} onChange={e => setF({ ...f, checkin: e.target.value })} /></label>
        <label className="f">Check-out<input id="st-out" type="date" required value={f.checkout} min={addDays(f.checkin, 1)} onChange={e => setF({ ...f, checkout: e.target.value })} /></label></div>
      <label className="f">Endereço ou nome para o mapa<input id="st-q" maxLength={160} value={f.q || ''} onChange={e => setF({ ...f, q: e.target.value })} placeholder="Ex.: Hotel X, Rua Y 10, Roma" /></label>
      <label className="f">Detalhes (um por linha, “Rótulo: valor”)<textarea id="st-info" rows={5} maxLength={2000} value={f.infoText} onChange={e => setF({ ...f, infoText: e.target.value })} placeholder={'Check-in: 15h\nValor: € 420\nCancelamento: grátis até 10/04'} /></label>
      <p className="muted small">Não guarde aqui números de reserva ou dados de pagamento se for compartilhar a viagem.</p>
      <label className="row"><input type="checkbox" checked={!!f.booked} onChange={e => setF({ ...f, booked: e.target.checked })} /> Já está reservado</label>
      <div className="row">{exists && <button type="button" className="btn danger" onClick={() => { updateTrip(t.id, tr => { tr.stays = tr.stays.filter(x => x.id !== s.id); }); onClose(); }}><Trash2 size={15} />Excluir</button>}<span className="sp" /><button className="btn btn-primary">Salvar</button></div>
    </form></div>
  );
}

function LegForm({ t, l, onClose }: { t: Trip; l: Leg; onClose: () => void }) {
  const [f, setF] = useState({ ...l });
  const exists = t.legs.some(x => x.id === l.id);
  const set = (k: keyof Leg) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value || undefined });
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateTrip(t.id, tr => { const k = tr.legs.findIndex(x => x.id === l.id); if (k >= 0) tr.legs[k] = f; else tr.legs.push(f); tr.legs.sort((a, b) => (a.date + (a.dep || '')).localeCompare(b.date + (b.dep || ''))); });
    onClose();
  };
  return (
    <div className="modal-wrap" onClick={onClose}><form className="modal card" onClick={e => e.stopPropagation()} onSubmit={save}>
      <div className="row"><h2><Plane size={20} /> Trajeto</h2><span className="sp" /><button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
      <div className="grid2"><label className="f">De<input id="lg-from" required maxLength={60} value={f.from} onChange={set('from')} /></label><label className="f">Para<input id="lg-to" required maxLength={60} value={f.to} onChange={set('to')} /></label></div>
      <div className="grid2"><label className="f">Meio<select id="lg-mode" value={f.mode} onChange={set('mode')}>{['Avião', 'Trem', 'Eurostar', 'Ônibus', 'Ferry', 'Carro', 'Transfer', 'Outro'].map(m => <option key={m}>{m}</option>)}</select></label>
        <label className="f">Data<input id="lg-date" type="date" required value={f.date} onChange={set('date')} /></label></div>
      <div className="grid2"><label className="f">Saída<input id="lg-dep" type="time" value={f.dep || ''} onChange={set('dep')} /></label><label className="f">Chegada<input id="lg-arr" type="time" value={f.arr || ''} onChange={set('arr')} /></label></div>
      <label className="f">Chega em outro dia?<input id="lg-arrd" type="date" value={f.arrDate || ''} onChange={set('arrDate')} /></label>
      <label className="f">Observação<input id="lg-note" maxLength={200} value={f.note || ''} onChange={set('note')} /></label>
      <label className="row"><input type="checkbox" checked={!!f.booked} onChange={e => setF({ ...f, booked: e.target.checked })} /> Já está comprado</label>
      <div className="row">{exists && <button type="button" className="btn danger" onClick={() => { updateTrip(t.id, tr => { tr.legs = tr.legs.filter(x => x.id !== l.id); }); onClose(); }}><Trash2 size={15} />Excluir</button>}<span className="sp" /><button className="btn btn-primary">Salvar</button></div>
    </form></div>
  );
}

/* ================= Checklist ================= */
export function Checklist({ t }: { t: Trip }) {
  const [newGroup, setNewGroup] = useState('');
  const all = t.checklist.flatMap(g => g.items); const done = all.filter(i => i.done).length;
  return (
    <div className="stack">
      <div className="card pad stack-sm">
        <div className="row"><b>{done} de {all.length} resolvidos</b><span className="sp" /><span className="muted small">{all.length ? Math.round(done / all.length * 100) : 0}%</span></div>
        <div className="bar"><i style={{ width: `${all.length ? done / all.length * 100 : 0}%` }} /></div>
        {t.budget && <p className="muted small">Orçamento: {t.budget}</p>}
      </div>
      <div className="check-grid">
        {t.checklist.map(g => <CheckGroupCard key={g.id} t={t} gid={g.id} />)}
        <form className="card pad stack-sm" onSubmit={e => { e.preventDefault(); if (!newGroup.trim()) return; updateTrip(t.id, tr => tr.checklist.push({ id: uid(), title: newGroup.trim(), items: [] })); setNewGroup(''); }}>
          <b>Novo grupo</b>
          <input id="cg-new" value={newGroup} maxLength={60} onChange={e => setNewGroup(e.target.value)} placeholder="Ex.: Mala, Documentos" />
          <button className="btn btn-sm"><Plus size={14} />Criar grupo</button>
        </form>
      </div>
    </div>
  );
}

function CheckGroupCard({ t, gid }: { t: Trip; gid: string }) {
  const g = t.checklist.find(x => x.id === gid)!;
  const [txt, setTxt] = useState('');
  const set = (fn: (gg: typeof g) => void) => updateTrip(t.id, tr => { const x = tr.checklist.find(y => y.id === gid); if (x) fn(x); });
  return (
    <div className="card pad stack-sm">
      <div className="row"><b>{g.title}</b><small className="muted">{g.items.filter(i => i.done).length}/{g.items.length}</small><span className="sp" />
        {!g.items.length && <button className="icon-btn" aria-label="Excluir grupo" onClick={() => updateTrip(t.id, tr => { tr.checklist = tr.checklist.filter(x => x.id !== gid); })}><Trash2 size={15} /></button>}</div>
      <ul className="chk">
        {g.items.map(i => (
          <li key={i.id} className={i.done ? 'done' : ''}>
            <input type="checkbox" id={'ck-' + i.id} checked={i.done} onChange={e => set(x => { const y = x.items.find(z => z.id === i.id); if (y) y.done = e.target.checked; })} />
            <label htmlFor={'ck-' + i.id}>{i.text}</label>
            <button className="icon-btn sm" aria-label="Remover" onClick={() => set(x => { x.items = x.items.filter(z => z.id !== i.id); })}><X size={14} /></button>
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={e => { e.preventDefault(); if (!txt.trim()) return; set(x => { x.items.push({ id: uid(), text: txt.trim(), done: false }); }); setTxt(''); }}>
        <input id={'ci-' + gid} value={txt} maxLength={140} onChange={e => setTxt(e.target.value)} placeholder="Adicionar item" aria-label={`Adicionar item em ${g.title}`} />
        <button className="btn btn-sm" aria-label="Adicionar"><Plus size={14} /></button>
      </form>
    </div>
  );
}

/* ================= Diário e fotos ================= */
export function Journal({ t }: { t: Trip }) {
  const db = useDB();
  const toast = useToast();
  const photos = db.photos.filter(p => p.trip === t.id);
  const [day, setDay] = useState(t.days.find(d => d.date === today())?.date || t.days[0]?.date);
  const [busy, setBusy] = useState('');
  const [view, setView] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number>();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const text = draft[day] ?? t.journal[day] ?? '';
  const d = t.days.find(x => x.date === day);

  const upload = async (files: File[]) => {
    let ok = 0;
    for (const f of files) {
      setBusy(`Guardando foto ${ok + 1} de ${files.length}…`);
      try {
        const exif = await photoDate(f);
        const target = exif && t.days.some(x => x.date === exif) ? exif : day;
        const blob = await shrinkImage(f);
        const id = uid();
        await savePhotoBlob(id, blob);
        update(dd => dd.photos.push({ id, trip: t.id, day: target, caption: '', ts: Date.now() }));
        ok++;
      } catch { toast('Uma das fotos não pôde ser guardada.'); }
    }
    setBusy(''); if (ok) toast(`${ok} ${ok === 1 ? 'foto guardada' : 'fotos guardadas'} (pela data da foto, quando disponível)`);
  };
  const vp = photos.find(p => p.id === view);
  const dayPhotos = photos.filter(p => p.day === day);
  const fav = d?.items.filter(i => i.fav) || [];

  return (
    <div className="journal">
      <aside className="j-days card">
        {t.days.map(x => {
          const n = photos.filter(p => p.day === x.date).length; const has = !!t.journal[x.date];
          return <button key={x.date} className={cls('j-day', x.date === day && 'on')} onClick={() => setDay(x.date)}>
            <b>{fmtShort(x.date)}</b><small>{x.city || '—'}</small><span className="j-ind">{has && '✎'}{n > 0 && ` ${n}📷`}</span></button>;
        })}
      </aside>
      <section className="card pad stack">
        <div className="row wrap"><div><span className="eyebrow">{d?.city || 'Diário'}</span><h2>{longDate(day)}</h2></div><span className="sp" />
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={!!busy}>{busy ? <Loader2 className="spin" size={16} /> : <ImagePlus size={16} />}{busy || 'Adicionar fotos'}</button>
          <input ref={fileRef} id="j-up" type="file" accept="image/*" multiple hidden onChange={e => { const fs = [...(e.target.files || [])]; e.target.value = ''; upload(fs); }} /></div>
        {fav.length > 0 && <p className="muted small">Favoritos do dia: {fav.map(i => i.name).join(', ')}</p>}
        <textarea id={'j-' + day} className="j-text" rows={8} maxLength={20000} value={text} placeholder={`Como foi ${d?.city ? 'o dia em ' + d.city : 'esse dia'}? O que vocês mais gostaram, o que comeram, o que fariam diferente…`}
          onChange={e => { const v = e.target.value; setDraft({ ...draft, [day]: v }); clearTimeout(timer.current); timer.current = window.setTimeout(() => updateTrip(t.id, tr => { tr.journal[day] = v; }), 600); }} />
        <div className="gallery">
          {dayPhotos.map(p => <LocalPhoto key={p.id} id={p.id} alt={p.caption} onClick={() => setView(p.id)} />)}
          {!dayPhotos.length && <button className="gallery-add" onClick={() => fileRef.current?.click()}><Camera size={22} /><small>Fotos deste dia</small></button>}
        </div>
        <p className="muted small">As fotos ficam guardadas neste aparelho, em tamanho otimizado. Guarde os arquivos originais com você.</p>
      </section>
      {vp && (
        <div className="lightbox" onClick={() => setView(null)}>
          <div className="lb-in" onClick={e => e.stopPropagation()}>
            <LocalPhoto id={vp.id} alt={vp.caption} className="lb-img" />
            <input id="lb-cap" defaultValue={vp.caption} maxLength={300} placeholder="Legenda" onBlur={e => update(dd => { const p = dd.photos.find(x => x.id === vp.id); if (p) p.caption = e.target.value; })} />
            <div className="row">
              <select defaultValue={vp.day} onChange={e => update(dd => { const p = dd.photos.find(x => x.id === vp.id); if (p) p.day = e.target.value; })} aria-label="Dia da foto">{t.days.map(x => <option key={x.date} value={x.date}>{fmtShort(x.date)}</option>)}</select>
              <span className="sp" />
              <ConfirmDelete onConfirm={async () => { await deletePhotoBlob(vp.id); update(dd => { dd.photos = dd.photos.filter(x => x.id !== vp.id); }); setView(null); }} />
              <button className="btn" onClick={() => setView(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConfirmDelete({ onConfirm, label = 'Excluir' }: { onConfirm: () => void; label?: string }) {
  const [ask, setAsk] = useState(false);
  return ask ? <button className="btn danger" onClick={onConfirm} onBlur={() => setAsk(false)} autoFocus>Confirmar exclusão</button>
    : <button className="btn danger" onClick={() => setAsk(true)}><Trash2 size={15} />{label}</button>;
}

/* ================= Dicas ================= */
export function Tips({ t }: { t: Trip }) {
  const groups = useMemo(() => { const m = new Map<string, typeof t.tips>(); t.tips.forEach(g => m.set(g.city, [...(m.get(g.city) || []), g])); return [...m.entries()]; }, [t.tips]);
  return (
    <div className="stack">
      {t.apps.length > 0 && <div className="card pad"><h3>Aplicativos úteis</h3><div className="apps">{t.apps.map(([n, d]) => <div key={n} className="app"><b>{n}</b><small className="muted">{d}</small></div>)}</div></div>}
      <div className="tips-grid">
        {groups.map(([city, gs]) => gs.map(g => (
          <div key={city + g.title} className="card pad stack-sm"><span className="eyebrow">{city}</span><h3>{g.title}</h3><ul className="plain">{g.items.map(i => <li key={i}>{i}</li>)}</ul></div>
        )))}
      </div>
      {!t.tips.length && !t.apps.length && <p className="muted">Ainda não há dicas nesta viagem. <Link to="/explorar">Explore lugares</Link> para montar as suas.</p>}
    </div>
  );
}

