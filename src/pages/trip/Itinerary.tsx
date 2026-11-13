import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, pointerWithin, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, ArrowDownUp, Clock, ExternalLink, Footprints, TrainFront, GripVertical, Lightbulb, Loader2, LocateFixed, MoreHorizontal, Route, Star, Trash2, Train } from 'lucide-react';
import { updateTrip } from '../../lib/store';
import { locate, useMaps } from '../../lib/gmaps';
import { cityInfo } from '../../data/cities';
import { WD, MO, cls, fmtKm, fmtShort, gmPlace, hop, pd, toMin, fromMin, today } from '../../lib/util';
import { CATEGORIES, type Day, type Item, type Trip } from '../../types';
import { PlaceDrawer, PlaceSearch, itemFrom } from '../../components/places';
import GMap from '../../components/GMap';
import { GPhoto, longDate } from '../../components/bits';
import { useToast } from '../../App';

// Prioriza o que está embaixo do dedo/cursor (dias e caixa de ideias); senão, o item mais próximo.
const collide: CollisionDetection = args => { const hit = pointerWithin(args); return hit.length ? hit : closestCenter(args); };

export const coord = (i: Item) => i.geo || i.approx;

export const DAY_COLORS = ['#4F46E5', '#0EA5E9', '#16A34A', '#F59E0B', '#EC4899', '#7C3AED', '#0F766E', '#DC2626', '#2563EB', '#65A30D'];
const CAT_COLOR: Record<string, string> = { atracao: '#4F46E5', comida: '#F59E0B', passeio: '#16A34A', compras: '#EC4899', transporte: '#0EA5E9', outro: '#64748B', foto: '#0891B2' };

export function conflicts(items: Item[]) {
  const timed = items.filter(i => i.time).map(i => ({ i, s: toMin(i.time)!, e: toMin(i.time)! + (i.duration || 60) })).sort((a, b) => a.s - b.s);
  const bad = new Set<string>();
  for (let k = 1; k < timed.length; k++) if (timed[k].s < timed[k - 1].e) { bad.add(timed[k].i.id); bad.add(timed[k - 1].i.id); }
  return bad;
}

export function dayRouteLinks(items: Item[]) {
  const stops = items.filter(i => i.q !== null).map(i => i.geo ? `${i.geo.lat},${i.geo.lng}` : (i.q || i.name));
  const out: string[] = [];
  for (let s = 0; s < stops.length - 1; s += 9) {
    const c = stops.slice(s, s + 10); if (c.length < 2) break;
    out.push('https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=' + encodeURIComponent(c[0]) + '&destination=' + encodeURIComponent(c[c.length - 1]) +
      (c.length > 2 ? '&waypoints=' + encodeURIComponent(c.slice(1, -1).join('|')) : ''));
  }
  return out;
}

export async function locateItems(t: Trip, items: { day?: string; item: Item }[], onProgress: (n: number) => void) {
  let n = 0;
  for (const { day, item } of items) {
    const d = day ? t.days.find(x => x.date === day) : undefined;
    const ci = d?.city ? cityInfo(d.city) : undefined;
    try {
      const r = await locate(item.q || item.name, ci ? { lat: ci.lat, lng: ci.lng } : undefined);
      if (r) updateTrip(t.id, tr => {
        const pool = day ? tr.days.find(x => x.date === day)?.items : tr.ideas;
        const it = pool?.find(x => x.id === item.id); if (it) Object.assign(it, r);
      });
    } catch { /* segue para o próximo */ }
    onProgress(++n);
  }
}

/** Reordena os itens sem horário pelo vizinho mais próximo, mantendo os com horário. */
function byProximity(items: Item[]): Item[] {
  const fixed = items.filter(i => i.time || !coord(i));
  const free = items.filter(i => !i.time && coord(i));
  if (free.length < 3) return items;
  const out: Item[] = [free.shift()!];
  while (free.length) {
    const last = coord(out[out.length - 1])!;
    let best = 0, bd = Infinity;
    free.forEach((x, k) => { const g = coord(x)!; const d = (g.lat - last.lat) ** 2 + ((g.lng - last.lng) * Math.cos(last.lat * Math.PI / 180)) ** 2; if (d < bd) { bd = d; best = k; } });
    out.push(free.splice(best, 1)[0]);
  }
  return [...fixed.filter(i => i.time), ...out, ...fixed.filter(i => !i.time)];
}

function DayChip({ d, i, active, onClick, count }: { d: Day; i: number; active: boolean; onClick: () => void; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'day:' + d.date });
  const dt = pd(d.date);
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (active && ref.current) ref.current.scrollIntoView({ block: 'nearest', inline: 'center' }); }, [active]);
  return (
    <button ref={el => { setNodeRef(el); ref.current = el; }} className={cls('daychip', active && 'on', isOver && 'over', d.date === today() && 'is-today')} onClick={onClick}>
      <span className="daychip-n" style={{ background: active ? DAY_COLORS[i % DAY_COLORS.length] : undefined }}>{dt.getDate()}</span>
      <span className="daychip-t"><b>{WD[dt.getDay()]} · {MO[dt.getMonth()]}</b><small>{d.city || 'Cidade a definir'}</small></span>
      {count > 0 && <span className="daychip-c">{count}</span>}
    </button>
  );
}

function Row({ it, t, day, bad, onOpen, color, idx, photo }: { it: Item; t: Trip; day: string; bad: boolean; onOpen: () => void; color: string; idx: number; photo: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: it.id });
  const [menu, setMenu] = useState(false);
  const set = (fn: (x: Item) => void) => updateTrip(t.id, tr => { const x = tr.days.find(d => d.date === day)?.items.find(y => y.id === it.id); if (x) fn(x); });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cls('it', it.done && 'done', isDragging && 'dragging')}>
      <button className="grip" {...attributes} {...listeners} aria-label={`Arrastar ${it.name}`}><GripVertical size={18} /></button>
      <input type="checkbox" checked={!!it.done} onChange={e => set(x => { x.done = e.target.checked; })} aria-label={`Feito: ${it.name}`} />
      <div className="it-time">
        <input type="time" value={it.time || ''} onChange={e => set(x => { x.time = e.target.value || undefined; })} aria-label={`Horário de ${it.name}`} className={cls(bad && 'bad')} />
        {it.time && it.duration ? <small>até {fromMin(toMin(it.time)! + it.duration)}</small> : null}
      </div>
      <button className="it-main" onClick={onOpen}>
        <span className="it-name">{idx > 0 && <span className="it-num" style={{ background: color }}>{idx}</span>}{it.name}{it.fav && <Star size={13} fill="#F59E0B" color="#F59E0B" />}</span>
        {it.note && <span className="it-note">{it.note}</span>}
        <span className="it-meta">
          <span className="cat" style={{ color: CAT_COLOR[it.category], background: CAT_COLOR[it.category] + '14' }}>{CATEGORIES.find(c => c.id === it.category)?.label}</span>
          {bad && <span className="tag warn"><AlertTriangle size={12} />Conflito de horário</span>}
        </span>
      </button>
      {photo && it.q !== null && <GPhoto q={it.placeId ? `${it.name}, ${it.address || ''}` : (it.q || it.name)} className="it-photo" width={240} />}
      <div className="it-act">
        <a className="icon-btn" href={it.mapsUrl || gmPlace(it.q || it.name, it.placeId)} target="_blank" rel="noopener" aria-label="Abrir no Google Maps" title="Abrir no Google Maps"><ExternalLink size={16} /></a>
        <button className="icon-btn" onClick={() => setMenu(!menu)} aria-label="Mais opções"><MoreHorizontal size={16} /></button>
      </div>
      {menu && (
        <div className="it-menu" onMouseLeave={() => setMenu(false)}>
          <label className="f">Duração<select value={it.duration || ''} onChange={e => set(x => { x.duration = e.target.value ? +e.target.value : undefined; })}>
            <option value="">—</option>{[30, 45, 60, 90, 120, 180, 240, 300, 420].map(m => <option key={m} value={m}>{m < 60 ? m + ' min' : (m / 60) + ' h'}</option>)}</select></label>
          <label className="f">Categoria<select value={it.category} onChange={e => set(x => { x.category = e.target.value as any; })}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label className="f">Custo<input value={it.cost || ''} maxLength={40} onChange={e => set(x => { x.cost = e.target.value || undefined; })} placeholder="€ 12" /></label>
          <label className="f">Mover para<select value={day} onChange={e => {
            const to = e.target.value; setMenu(false);
            updateTrip(t.id, tr => { const from = tr.days.find(d => d.date === day)!; const k = from.items.findIndex(y => y.id === it.id); const [x] = from.items.splice(k, 1);
              if (to === 'ideas') { tr.ideas = tr.ideas || []; tr.ideas.push(x); } else tr.days.find(d => d.date === to)?.items.push(x); });
          }}>{t.days.map(d => <option key={d.date} value={d.date}>{fmtShort(d.date)}{d.city ? ' · ' + d.city : ''}</option>)}<option value="ideas">Ideias (sem dia)</option></select></label>
          <label className="f" style={{ gridColumn: '1/-1' }}>Observação<textarea value={it.note || ''} maxLength={1000} onChange={e => set(x => { x.note = e.target.value || undefined; })} /></label>
          <div className="row" style={{ gridColumn: '1/-1' }}>
            <button className="btn btn-sm" onClick={() => set(x => { x.fav = !x.fav; })}><Star size={14} />{it.fav ? 'Tirar dos favoritos' : 'Favorito'}</button>
            <span className="sp" />
            <button className="btn btn-sm danger" onClick={() => updateTrip(t.id, tr => { const d = tr.days.find(x => x.date === day)!; d.items = d.items.filter(y => y.id !== it.id); })}><Trash2 size={14} />Remover</button>
          </div>
        </div>
      )}
    </li>
  );
}

function IdeaRow({ it, onOpen }: { it: Item; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: 'idea:' + it.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="idea-row">
      <button className="grip" {...attributes} {...listeners} aria-label={`Arrastar ${it.name}`}><GripVertical size={16} /></button>
      <button className="it-main" onClick={onOpen}><span className="it-name">{it.name}</span>{it.address && <span className="it-note">{it.address}</span>}</button>
    </li>
  );
}

export default function Itinerary({ t }: { t: Trip }) {
  const toast = useToast();
  const { status } = useMaps();
  const [sp, setSp] = useSearchParams();
  const td = today();
  const initial = sp.get('dia') || (t.days.some(d => d.date === td) ? td : t.days[0]?.date);
  const [sel, setSel] = useState(initial);
  useEffect(() => { const d = sp.get('dia'); if (d && t.days.some(x => x.date === d)) setSel(d); }, [sp, t.days]);
  const dayIdx = Math.max(0, t.days.findIndex(d => d.date === sel));
  const day = t.days[dayIdx];
  const [open, setOpen] = useState<Item | null>(null);
  const [dragging, setDragging] = useState<Item | null>(null);
  const [loc, setLoc] = useState<{ n: number; total: number } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const bad = useMemo(() => day ? conflicts(day.items) : new Set<string>(), [day]);
  const ideas = t.ideas || [];
  const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
  const cities = [...new Set([...t.cities, ...t.days.map(d => d.city).filter(Boolean)])];
  const ci = day?.city ? cityInfo(day.city) : undefined;
  const legs = t.legs.filter(l => l.date === day?.date || l.arrDate === day?.date);
  const stay = t.stays.find(s => day && s.checkin <= day.date && day.date < s.checkout);

  if (!day) return <p className="muted">Esta viagem não tem dias. Ajuste as datas em Visão geral.</p>;

  const pick = (date: string) => { setSel(date); setSp({ dia: date }, { replace: true }); };
  const setDay = (fn: (d: Day) => void) => updateTrip(t.id, tr => { const d = tr.days.find(x => x.date === day.date); if (d) fn(d); });

  const onStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setDragging(id.startsWith('idea:') ? ideas.find(x => 'idea:' + x.id === id) || null : day.items.find(x => x.id === id) || null);
  };
  const onEnd = (e: DragEndEvent) => {
    setDragging(null);
    const a = String(e.active.id), o = e.over ? String(e.over.id) : '';
    if (!o || a === o) return;
    const fromIdea = a.startsWith('idea:');
    const aid = fromIdea ? a.slice(5) : a;
    updateTrip(t.id, tr => {
      const cur = tr.days.find(d => d.date === day.date)!;
      tr.ideas = tr.ideas || [];
      const take = () => { const pool = fromIdea ? tr.ideas! : cur.items; const k = pool.findIndex(x => x.id === aid); return k < 0 ? null : pool.splice(k, 1)[0]; };
      if (o.startsWith('day:')) {
        const target = tr.days.find(d => d.date === o.slice(4)); const x = take(); if (x && target) target.items.push(x);
        if (x && target) setTimeout(() => toast(`Movido para ${fmtShort(target.date)}`), 0);
      } else if (o === 'ideas-bin' || o.startsWith('idea:')) {
        if (fromIdea) { const from = tr.ideas.findIndex(x => x.id === aid), to = tr.ideas.findIndex(x => 'idea:' + x.id === o); if (from >= 0 && to >= 0) tr.ideas = arrayMove(tr.ideas, from, to); }
        else { const x = take(); if (x) tr.ideas.push(x); }
      } else {
        const to = cur.items.findIndex(x => x.id === o);
        if (fromIdea) { const x = take(); if (x) cur.items.splice(to < 0 ? cur.items.length : to, 0, x); }
        else { const from = cur.items.findIndex(x => x.id === aid); if (from >= 0 && to >= 0) cur.items = arrayMove(cur.items, from, to); }
      }
    });
  };

  let n = 0;
  const numbered = day.items.map(it => ({ it, num: coord(it) ? ++n : 0 }));
  const markers = numbered.filter(x => coord(x.it)).map(x => ({ id: x.it.id, pos: coord(x.it)!, title: `${x.num}. ${x.it.name}`, label: String(x.num), color: x.it.done ? '#94A3B8' : color }));
  const missing = day.items.filter(i => !i.geo && i.q !== null);
  const routes = dayRouteLinks(day.items);
  const pts = day.items.map(coord).filter(Boolean) as { lat: number; lng: number }[];
  let walkKm = 0, moveMin = 0;
  for (let k = 1; k < pts.length; k++) { const h = hop(pts[k - 1], pts[k]); moveMin += h.min; if (h.mode === 'walk') walkKm += h.km; }

  return (
    <DndContext sensors={sensors} collisionDetection={collide} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setDragging(null)}>
      <div className="itin">
        <aside className="days-col">
          <div className="days-list">
            {t.days.map((d, i) => <DayChip key={d.date} d={d} i={i} active={d.date === day.date} onClick={() => pick(d.date)} count={d.items.length} />)}
          </div>
          <IdeasBin ideas={ideas} onOpen={setOpen} />
        </aside>

        <section className="day-col card pad">
          <div className="day-head">
            <div>
              <span className="eyebrow">Dia {dayIdx + 1} de {t.days.length}</span>
              <h2>{longDate(day.date)}</h2>
            </div>
            <span className="sp" />
            <button className="btn btn-sm" disabled={dayIdx === 0} onClick={() => pick(t.days[dayIdx - 1].date)}>‹ Anterior</button>
            <button className="btn btn-sm" disabled={dayIdx === t.days.length - 1} onClick={() => pick(t.days[dayIdx + 1].date)}>Próximo ›</button>
          </div>
          <div className="grid2">
            <label className="f">Cidade<input list="trip-cities" value={day.city} maxLength={60} onChange={e => setDay(d => { d.city = e.target.value; })} placeholder="Escolha ou digite" id={'city-' + day.date} /></label>
            <label className="f">Título do dia<input value={day.title || ''} maxLength={80} onChange={e => setDay(d => { d.title = e.target.value || undefined; })} placeholder="Ex.: Museus e Montmartre" id={'title-' + day.date} /></label>
          </div>
          <datalist id="trip-cities">{cities.map(c => <option key={c} value={c} />)}</datalist>
          {legs.map(l => <div key={l.id} className="leg-row"><Train size={16} /><b>{l.mode}</b><span>{l.from} → {l.to}</span><span className="sp" /><span className="mono">{l.dep || '—'} → {l.arr || '—'}</span></div>)}
          {stay && <div className="leg-row soft">🛏 <span>Hospedagem: <b>{stay.name}</b></span></div>}
          {day.note && <p className="note-box">{day.note}</p>}

          <div className="row wrap" style={{ gap: 6 }}>
            <button className="btn btn-sm" onClick={() => setDay(d => { d.items = [...d.items].sort((a, b) => (a.time || '99').localeCompare(b.time || '99')); })}><Clock size={14} />Ordenar por horário</button>
            <button className="btn btn-sm" disabled={day.items.filter(i => !i.time && i.geo).length < 3} onClick={() => { setDay(d => { d.items = byProximity(d.items); }); toast('Reordenei os lugares sem horário pela proximidade.'); }}><ArrowDownUp size={14} />Otimizar trajeto</button>
            {routes.map((u, k) => <a key={u} className="btn btn-sm" href={u} target="_blank" rel="noopener"><Route size={14} />Rota no Google Maps{routes.length > 1 ? ` ${k + 1}/${routes.length}` : ''}</a>)}
          </div>
          {pts.length > 1 && <p className="muted small row"><Footprints size={14} />Neste dia: ≈ {fmtKm(walkKm)} a pé e ≈ {Math.round(moveMin / 5) * 5} min de deslocamento no total (estimativa).</p>}
          {bad.size > 0 && <p className="tag warn" style={{ alignSelf: 'start' }}><AlertTriangle size={14} />Há horários sobrepostos neste dia. Confira os itens marcados.</p>}

          <SortableContext items={day.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="items">
              {numbered.map(({ it, num }, k) => {
                const prev = k > 0 ? numbered.slice(0, k).reverse().find(x => coord(x.it))?.it : undefined;
                const a = prev && coord(prev), b = coord(it);
                const h = a && b ? hop(a, b) : null;
                const dir = prev && 'https://www.google.com/maps/dir/?api=1&travelmode=' + (h?.mode === 'walk' ? 'walking' : 'transit') +
                  '&origin=' + encodeURIComponent(prev.geo ? `${prev.geo.lat},${prev.geo.lng}` : (prev.q || prev.name)) + '&destination=' + encodeURIComponent(it.geo ? `${it.geo.lat},${it.geo.lng}` : (it.q || it.name));
                return (
                  <Fragment key={it.id}>
                    {h && <li className="hop"><span className="hop-line" /><span>{h.mode === 'walk' ? <Footprints size={14} /> : <TrainFront size={14} />}≈ {h.min} min {h.mode === 'walk' ? 'a pé' : 'de metrô ou ônibus'} · {fmtKm(h.km)}</span><a href={dir} target="_blank" rel="noopener">trajeto exato ↗</a></li>}
                    <Row it={it} t={t} day={day.date} bad={bad.has(it.id)} onOpen={() => setOpen(it)} color={color} idx={num} photo={status === 'ready'} />
                  </Fragment>
                );
              })}
            </ul>
          </SortableContext>
          {!day.items.length && <p className="muted center" style={{ padding: 16 }}>Nada planejado para este dia ainda. Busque um lugar abaixo ou arraste uma ideia para cá.</p>}
          <PlaceSearch bias={ci ? { lat: ci.lat, lng: ci.lng } : undefined} placeholder={`Adicionar lugar${day.city ? ' em ' + day.city : ''}`}
            onPick={p => { setDay(d => { d.items.push(itemFrom(p)); }); toast(`${p.name} adicionado`); }} />
        </section>

        <aside className="map-col">
          <div className="card map-sticky">
            <GMap markers={markers} path={markers.length > 1 ? markers.map(m => m.pos) : undefined} height={460} onSelect={id => { const it = day.items.find(x => x.id === id); if (it) setOpen(it); }} />
            <div className="pad-sm stack-sm">
              {missing.length > 0 && status === 'ready' && (
                <button className="btn btn-sm" disabled={!!loc} onClick={async () => {
                  setLoc({ n: 0, total: missing.length });
                  await locateItems(t, missing.map(item => ({ day: day.date, item })), k => setLoc({ n: k, total: missing.length }));
                  setLoc(null); toast('Lugares localizados no mapa.');
                }}>{loc ? <><Loader2 className="spin" size={14} />Localizando {loc.n} de {loc.total}…</> : <><LocateFixed size={14} />Localizar {missing.length} {missing.length === 1 ? 'lugar' : 'lugares'} no mapa</>}</button>
              )}
              <small className="muted">Arraste os itens para mudar a ordem, ou solte num dia da lista para mudar de dia.</small>
            </div>
          </div>
        </aside>
      </div>
      <DragOverlay>{dragging ? <div className="drag-ghost">{dragging.name}</div> : null}</DragOverlay>
      {open && <PlaceDrawer place={open} toast={toast} onClose={() => setOpen(null)}
        onLocated={r => updateTrip(t.id, tr => { const x = [...tr.days.flatMap(d => d.items), ...(tr.ideas || [])].find(y => y.id === open.id); if (x) Object.assign(x, r); })} />}
    </DndContext>
  );
}

function IdeasBin({ ideas, onOpen }: { ideas: Item[]; onOpen: (i: Item) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'ideas-bin' });
  return (
    <div ref={setNodeRef} className={cls('ideas-bin card', isOver && 'over')}>
      <b className="row"><Lightbulb size={16} />Ideias sem dia <small className="muted">({ideas.length})</small></b>
      <SortableContext items={ideas.map(i => 'idea:' + i.id)} strategy={verticalListSortingStrategy}>
        <ul>{ideas.map(i => <IdeaRow key={i.id} it={i} onOpen={() => onOpen(i)} />)}</ul>
      </SortableContext>
      {!ideas.length && <small className="muted">Solte aqui o que ainda não tem dia. Lugares salvos em Explorar também aparecem aqui.</small>}
    </div>
  );
}
