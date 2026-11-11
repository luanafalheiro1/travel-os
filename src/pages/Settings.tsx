import { useRef, useState } from 'react';
import { CheckCircle2, Download, Eye, EyeOff, KeyRound, Loader2, Upload } from 'lucide-react';
import { exportJSON, importJSON, resetDB, update, useDB } from '../lib/store';
import { useMaps } from '../lib/gmaps';
import { ConfirmDelete } from './trip/Tabs';
import { useToast } from '../App';

export default function Settings() {
  const db = useDB();
  const toast = useToast();
  const { status, error } = useMaps();
  const [key, setKey] = useState(db.settings.mapsKey);
  const [mid, setMid] = useState(db.settings.mapId);
  const [show, setShow] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const origin = location.origin + location.pathname.replace(/[^/]*$/, '');
  const download = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `travel-os-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <div><span className="eyebrow">Configurações</span><h1>Ajustes</h1></div>

      <section className="card pad stack">
        <h2 className="row"><KeyRound size={20} />Google Maps</h2>
        <p className="muted">A chave fica salva só neste navegador. Cada aparelho (seu celular, o do seu noivo) precisa colar a chave uma vez.</p>
        <form className="stack-sm" onSubmit={e => { e.preventDefault(); update(d => { d.settings.mapsKey = key.trim(); d.settings.mapId = mid.trim(); }); toast('Chave salva. Carregando o Google Maps…'); if (db.settings.mapsKey && db.settings.mapsKey !== key.trim()) setTimeout(() => location.reload(), 600); }}>
          <label className="f">Chave da API (Maps JavaScript API + Places API New)
            <span className="row"><input id="cfg-key" type={show ? 'text' : 'password'} value={key} onChange={e => setKey(e.target.value)} placeholder="AIza…" autoComplete="off" spellCheck={false} />
              <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? 'Esconder chave' : 'Mostrar chave'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
          <label className="f">Map ID (opcional)<input id="cfg-mapid" value={mid} onChange={e => setMid(e.target.value)} placeholder="Deixe vazio para usar o padrão" /></label>
          <div className="row"><button className="btn btn-primary">Salvar chave</button>
            {status === 'ready' && <span className="tag ok"><CheckCircle2 size={14} />Google Maps conectado</span>}
            {status === 'loading' && <span className="tag"><Loader2 className="spin" size={14} />Conectando…</span>}
            {status === 'error' && <span className="tag bad">Erro</span>}</div>
          {status === 'error' && <p className="err">{error}</p>}
        </form>
        <details className="hours"><summary>Como criar a chave (passo a passo)</summary>
          <ol className="plain-ol">
            <li>Entre em console.cloud.google.com e crie um projeto chamado <b>travel-os</b>.</li>
            <li>Ative o faturamento com um cartão. O Google exige, mesmo com uso dentro da cota gratuita mensal.</li>
            <li>Em <i>APIs e serviços → Biblioteca</i>, ative <b>Maps JavaScript API</b> e <b>Places API (New)</b>.</li>
            <li>Em <i>Credenciais</i>, crie uma <b>Chave de API</b>.</li>
            <li>Restrinja a chave a <b>Referenciadores HTTP</b> e adicione <code>{origin}*</code>.</li>
            <li>Em <i>Restrições de API</i>, deixe só as duas APIs acima.</li>
            <li>Crie um alerta de orçamento em <i>Faturamento → Orçamentos e alertas</i>.</li>
          </ol>
          <p className="muted small">O que gasta cota: abrir mapas, buscar lugares, ver fotos e sugestões. As localizações encontradas ficam guardadas para não repetir buscas.</p>
        </details>
      </section>

      <section className="card pad stack">
        <h2>Seus dados</h2>
        <p className="muted">Por enquanto, viagens, marcações, diário e lugares ficam guardados neste navegador, e as fotos neste aparelho. Faça um backup de vez em quando, e sempre antes de trocar de celular ou limpar o navegador.</p>
        <div className="row wrap">
          <button className="btn btn-primary" onClick={download}><Download size={16} />Baixar backup</button>
          <button className="btn" onClick={() => file.current?.click()}><Upload size={16} />Restaurar backup</button>
          <input ref={file} id="cfg-restore" type="file" accept=".json" hidden onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
            try { importJSON(await f.text()); toast('Backup restaurado.'); } catch (err: any) { toast(err.message || 'Não foi possível restaurar.'); }
          }} />
        </div>
        <p className="muted small">O backup não inclui as fotos nem a chave do Google.</p>
        <div className="row"><span className="muted small">{db.trips.length} viagens · {db.places.length} lugares · {db.photos.length} fotos</span><span className="sp" />
          <ConfirmDelete label="Apagar tudo e recomeçar" onConfirm={() => { resetDB(); toast('Dados reiniciados com as viagens originais.'); }} /></div>
      </section>
    </div>
  );
}
