import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Star } from 'lucide-react';
import { cachedPhoto, photoFor, useMaps } from '../lib/gmaps';
import { photoURL } from '../lib/store';
import { cityInfo } from '../data/cities';
import { MO, MOL, WD, WDL, cls, iso, pd, timeIn, today, tzOffsetHours } from '../lib/util';
import type { Trip } from '../types';

/* ---------- foto vinda do Google, com fundo de reserva ---------- */
const GRADS = [['#4F46E5', '#0EA5E9'], ['#7C3AED', '#EC4899'], ['#0F766E', '#22C55E'], ['#B45309', '#F59E0B'], ['#1E3A8A', '#6366F1']];
function grad(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; const g = GRADS[h % GRADS.length]; return `linear-gradient(135deg, ${g[0]}, ${g[1]})`; }

export function GPhoto({ q, className, children, width = 1200, alt = '' }: { q?: string | null; className?: string; children?: React.ReactNode; width?: number; alt?: string }) {
  const { status } = useMaps();
  const [src, setSrc] = useState<string | null>(q ? cachedPhoto(q) : null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!q) { setSrc(null); return; }
    const c = cachedPhoto(q);
    if (c) { setSrc(c); return; }
    setSrc(null);
    if (status !== 'ready') return;
    let live = true;
    photoFor(q, width).then(u => { if (live) setSrc(u); });
    return () => { live = false; };
  }, [q, status, width]);
  return (
    <div className={cls('gphoto', className)} style={{ background: grad(q || 'x') }}>
      {src && !failed && <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} referrerPolicy="no-referrer" />}
      {children}
    </div>
  );
}

export function LocalPhoto({ id, alt, className, onClick }: { id: string; alt?: string; className?: string; onClick?: () => void }) {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => { let live = true; photoURL(id).then(x => live && setU(x)); return () => { live = false; }; }, [id]);
  const img = u ? <img src={u} alt={alt || 'Foto da viagem'} loading="lazy" /> : <span className="ph-missing">Foto indisponível neste aparelho</span>;
  return onClick ? <button className={cls('lphoto', className)} onClick={onClick}>{img}</button> : <div className={cls('lphoto', className)}>{img}</div>;
}

/* ---------- relógio ---------- */
export function useNow(ms = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export function Clock({ trip }: { trip?: Trip | null }) {
  const now = useNow();
  const dest = trip ? destCity(trip, iso(now)) : null;
  const info = dest ? cityInfo(dest) : null;
  return (
    <div className="clock" title="Data e hora agora">
      <CalendarDays size={15} />
      <span>{WD[now.getDay()]}, {now.getDate()} {MO[now.getMonth()]}</span>
      <span className="clock-sep" />
      <Clock3 size={15} />
      <b>{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</b>
      {info && dest && tzOffsetHours(info.tz) !== 0 && <span className="clock-dest">{dest} <b>{timeIn(info.tz, now)}</b></span>}
    </div>
  );
}

/** Cidade da viagem no dia (ou a primeira cidade, antes da viagem). */
export function destCity(t: Trip, date: string): string | null {
  const d = t.days.find(x => x.date === date);
  if (d?.city && d.city !== 'Rio') return d.city;
  if (date < t.start) return t.days.find(x => x.city && x.city !== 'Rio')?.city || t.cities[0] || null;
  return t.cities[0] || null;
}

export function LiveTimes({ cities }: { cities: string[] }) {
  const now = useNow();
  // agrupa cidades que estão no mesmo horário agora
  const groups = new Map<number, { tz: string; names: string[] }>();
  cities.forEach(c => { const tz = cityInfo(c)?.tz; if (!tz) return; const off = tzOffsetHours(tz); const g = groups.get(off); if (g) g.names.push(c); else groups.set(off, { tz, names: [c] }); });
  if (!groups.size) return null;
  const home = tzOffsetHours('America/Sao_Paulo');
  return (
    <div className="times">
      {!groups.has(home) && <span className="t"><small>Rio (aqui)</small><b>{timeIn('America/Sao_Paulo', now)}</b></span>}
      {[...groups.values()].map(g => (
        <span className="t" key={g.tz} title={g.names.join(', ')}>
          <small>{g.names.length > 2 ? `${g.names[0]} +${g.names.length - 1}` : g.names.join(', ')}</small>
          <b>{timeIn(g.tz, now)}</b>
        </span>
      ))}
    </div>
  );
}

/* ---------- calendário mensal ---------- */
export interface CalMark { date: string; color: string; label?: string; onClick?: () => void; dot?: boolean }

export function MonthCalendar({ month, onMonth, marks, compact }: { month: string; onMonth: (m: string) => void; marks: CalMark[]; compact?: boolean }) {
  const first = pd(month.slice(0, 7) + '-01');
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const cells: string[] = []; for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(iso(d)); }
  const byDate = new Map<string, CalMark[]>(); marks.forEach(m => byDate.set(m.date, [...(byDate.get(m.date) || []), m]));
  const td = today();
  const shift = (n: number) => { const d = new Date(first); d.setMonth(d.getMonth() + n); onMonth(iso(d)); };
  const rows = cells.slice(35).every(c => pd(c).getMonth() !== first.getMonth()) ? cells.slice(0, 35) : cells;
  return (
    <div className={cls('cal', compact && 'cal-compact')}>
      <div className="cal-head">
        <b>{MOL[first.getMonth()][0].toUpperCase() + MOL[first.getMonth()].slice(1)} {first.getFullYear()}</b>
        <span className="sp" />
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
        <button className="icon-btn" onClick={() => onMonth(today())} aria-label="Hoje" style={{ fontSize: 12, width: 'auto', padding: '0 8px' }}>Hoje</button>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight size={18} /></button>
      </div>
      <div className="cal-grid">
        {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(w => <span key={w} className="cal-wd">{w}</span>)}
        {rows.map(c => {
          const ms = byDate.get(c) || []; const m = ms[0]; const out = pd(c).getMonth() !== first.getMonth();
          const Tag = m?.onClick ? 'button' : 'span';
          return (
            <Tag key={c} className={cls('cal-day', out && 'out', c === td && 'today', m && !m.dot && 'marked')}
              style={m && !m.dot ? { background: m.color } : undefined} onClick={m?.onClick}
              title={ms.map(x => x.label).filter(Boolean).join(' · ') || undefined} aria-label={`${pd(c).getDate()} ${MOL[pd(c).getMonth()]}${m?.label ? ', ' + m.label : ''}`}>
              {pd(c).getDate()}
              {m?.dot && <i style={{ background: m.color }} />}
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

export function Rating({ v, n }: { v?: number; n?: number }) {
  if (v == null) return null;
  return <span className="rating"><Star size={13} fill="currentColor" />{v.toFixed(1)}{n ? <small>({n.toLocaleString('pt-BR')})</small> : null}</span>;
}

export function longDate(s: string) { const d = pd(s); const w = WDL[d.getDay()]; return `${w[0].toUpperCase() + w.slice(1)}, ${d.getDate()} de ${MOL[d.getMonth()]}`; }

export function Empty({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return <div className="empty">{icon}<b>{title}</b>{children && <div className="muted">{children}</div>}</div>;
}
