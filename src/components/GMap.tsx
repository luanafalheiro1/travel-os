import { useEffect, useRef } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Link } from 'react-router-dom';
import { MapPinned } from 'lucide-react';
import { ensureMaps, mapId, useMaps } from '../lib/gmaps';
import type { Geo } from '../types';

export interface MapMarker {
  id: string;
  pos: Geo;
  title: string;
  label?: string;
  color?: string;
  small?: boolean;
}

interface Props {
  markers: MapMarker[];
  path?: Geo[];
  cluster?: boolean;
  height?: number | string;
  selected?: string | null;
  onSelect?: (id: string) => void;
  maxZoom?: number;
  className?: string;
}

export function MapGate({ height = 320, children }: { height?: number | string; children: React.ReactNode }) {
  const { status, error } = useMaps();
  if (status === 'error') return <div className="map-gate" style={{ height }}><MapPinned size={28} /><b>O Google Maps não carregou</b><p>{error}</p><Link className="btn" to="/config">Abrir configurações</Link></div>;
  return <>{children}</>;
}

export default function GMap({ markers, path, cluster, height = 360, selected, onSelect, maxZoom = 16, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const objs = useRef<{ markers: google.maps.marker.AdvancedMarkerElement[]; clusterer?: MarkerClusterer; line?: google.maps.Polyline }>({ markers: [] });
  const { status, error } = useMaps();
  const sig = markers.map(m => m.id + m.pos.lat.toFixed(5) + m.pos.lng.toFixed(5) + (m.label || '') + (m.color || '')).join('|') + '#' + (path || []).length;
  const onSel = useRef(onSelect); onSel.current = onSelect;

  useEffect(() => { ensureMaps().catch(() => { /* status já mostra o motivo */ }); }, []);

  // cria o mapa uma vez
  useEffect(() => {
    if (status !== 'ready' || !box.current || map.current) return;
    map.current = new google.maps.Map(box.current, {
      mapId: mapId(), center: { lat: 46, lng: 8 }, zoom: 4, gestureHandling: 'cooperative',
      mapTypeControl: false, streetViewControl: false, fullscreenControl: true, clickableIcons: true,
    });
  }, [status]);

  // marcadores
  useEffect(() => {
    const m = map.current;
    if (!m || status !== 'ready') return;
    const o = objs.current;
    o.clusterer?.clearMarkers(); o.markers.forEach(k => (k.map = null)); o.line?.setMap(null);
    o.markers = markers.map(mk => {
      const pin = new google.maps.marker.PinElement({
        background: mk.color || '#4F46E5', borderColor: '#ffffff', glyphColor: '#ffffff',
        glyph: mk.label || '', scale: mk.small ? 0.8 : (selected === mk.id ? 1.25 : 1),
      });
      const el = new google.maps.marker.AdvancedMarkerElement({ position: mk.pos, title: mk.title, content: pin.element, map: cluster ? null : m, gmpClickable: true });
      el.addListener('click', () => onSel.current?.(mk.id));
      return el;
    });
    if (cluster) o.clusterer = new MarkerClusterer({ map: m, markers: o.markers });
    if (path && path.length > 1) o.line = new google.maps.Polyline({ map: m, path, strokeColor: '#4F46E5', strokeOpacity: 0.85, strokeWeight: 3, geodesic: true });
    const pts = markers.map(k => k.pos).concat(path || []);
    if (pts.length === 1) { m.setCenter(pts[0]); m.setZoom(Math.min(14, maxZoom)); }
    else if (pts.length > 1) {
      const b = new google.maps.LatLngBounds(); pts.forEach(p => b.extend(p));
      m.fitBounds(b, 48);
      google.maps.event.addListenerOnce(m, 'idle', () => { if ((m.getZoom() || 0) > maxZoom) m.setZoom(maxZoom); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, status, cluster, selected]);

  // centraliza no selecionado
  useEffect(() => {
    const m = map.current; const mk = markers.find(x => x.id === selected);
    if (m && mk) { m.panTo(mk.pos); if ((m.getZoom() || 0) < 14) m.setZoom(15); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  if (status === 'nokey') return (
    <div className={'map-gate ' + (className || '')} style={{ height }}>
      <MapPinned size={28} />
      <b>Conecte o Google Maps</b>
      <p>Cole a sua chave do Google Maps nas configurações para ver o mapa real, com ruas, fotos e lugares.</p>
      <Link className="btn btn-primary" to="/config">Conectar agora</Link>
    </div>
  );
  if (status === 'error') return <div className={'map-gate ' + (className || '')} style={{ height }}><MapPinned size={28} /><b>O Google Maps não carregou</b><p>{error}</p><Link className="btn" to="/config">Abrir configurações</Link></div>;
  return <div ref={box} className={'gmap ' + (className || '')} style={{ height }} aria-label="Mapa" />;
}
