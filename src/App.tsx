import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation, useMatch } from 'react-router-dom';
import { Compass, Home as HomeIcon, Luggage, MapPinned, Settings as Cog } from 'lucide-react';
import { useDB } from './lib/store';
import { ensureMaps } from './lib/gmaps';
import { Clock } from './components/bits';
import { today } from './lib/util';
import Home from './pages/Home';
import Trips from './pages/Trips';
import TripPage from './pages/TripPage';
import Places from './pages/Places';
import Explore from './pages/Explore';
import Settings from './pages/Settings';

const ToastCtx = createContext<(m: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const NAV = [
  { to: '/', label: 'Início', icon: HomeIcon, end: true },
  { to: '/viagens', label: 'Viagens', icon: Luggage },
  { to: '/lugares', label: 'Meus lugares', icon: MapPinned },
  { to: '/explorar', label: 'Explorar', icon: Compass },
];

function Shell() {
  const db = useDB();
  const loc = useLocation();
  const m = useMatch('/viagem/:id/*');
  const td = today();
  const ctxTrip = m ? db.trips.find(t => t.id === m.params.id)
    : db.trips.find(t => t.start <= td && td <= t.end) || [...db.trips].filter(t => t.start > td).sort((a, b) => a.start.localeCompare(b.start))[0];
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <NavLink to="/" className="brand"><span className="brand-mark">T</span>Travel OS</NavLink>
          <nav className="topnav">
            {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>)}
          </nav>
          <span className="sp" />
          <Clock trip={ctxTrip} />
          <NavLink to="/config" className="icon-btn" aria-label="Configurações"><Cog size={18} /></NavLink>
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/viagens" element={<Trips />} />
          <Route path="/viagem/:id" element={<TripPage />} />
          <Route path="/viagem/:id/:tab" element={<TripPage />} />
          <Route path="/lugares" element={<Places />} />
          <Route path="/explorar" element={<Explore />} />
          <Route path="/config" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <nav className="bottomnav">
        {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end}><n.icon size={21} /><span>{n.label}</span></NavLink>)}
        <NavLink to="/config"><Cog size={21} /><span>Ajustes</span></NavLink>
      </nav>
    </>
  );
}

export default function App() {
  const [msg, setMsg] = useState('');
  const toast = useCallback((m: string) => { setMsg(m); window.clearTimeout((toast as any).t); (toast as any).t = window.setTimeout(() => setMsg(''), 3200); }, []);
  const db = useDB();
  useEffect(() => { if (db.settings.mapsKey) ensureMaps().catch(() => {}); }, [db.settings.mapsKey]);
  return (
    <ToastCtx.Provider value={toast}>
      <HashRouter><Shell /></HashRouter>
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastCtx.Provider>
  );
}
