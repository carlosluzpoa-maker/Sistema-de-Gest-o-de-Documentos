import React, { useState } from 'react';
import { useDados } from '../lib/dados.jsx';
import { STATUS, TIPOS, baixarCsv, fmtData, gravarPreferencia, lerPreferencia, rotuloRev } from '../lib/util.js';
import { Abas, Pill, Validade, Vazio } from '../components/ui.jsx';

export default function Lista() {
  const D = useDados();
  const [area, setArea] = useState(lerPreferencia('sgi.area', 'todas'));
  const [status, setStatus] = useState(lerPreferencia('sgi.status', ''));
  const [tipo, setTipo] = useState('');
  const [busca, setBusca] = useState('');

  const abas = [['todas', 'Todos'], ...D.areas.filter((a) => a.ativo).map((a) => [a.id, a.nome])];
  const q = busca.trim().toLowerCase();
  const docs = D.docs.filter((d) =>
    (area === 'todas' || d.area === area) &&
    (!status || d.status === status) &&
    (!tipo || d.tipo === tipo) &&
    (!q || `${d.codigo} ${d.titulo} ${d.descricao || ''}`.toLowerCase().includes(q)));

  const mudarArea = (a) => { setArea(a); gravarPreferencia('sgi.area', a); };
  const mudarStatus = (s) => { setStatus(s); gravarPreferencia('sgi.status', s); };

  function exportar() {
    baixarCsv('lista-mestra.csv', [
      ['Código', 'Título', 'Departamento', 'Tipo', 'Revisão', 'Status', 'Publicado em', 'Próxima revisão', 'Elaborador', 'Aprovador'],
      ...docs.map((d) => [d.codigo, d.titulo, D.areaNome(d.area), d.tipo, d.revisao, STATUS[d.status],
        fmtData(d.publicado_em), fmtData(d.proxima_revisao), d.elaborador, d.aprovador]),
    ]);
  }

  return (
    <>
      <div className="topo">
        <h1>Lista mestra</h1>
        <div className="botoes">
          {D.ehEditor && <a className="btn" href="#/novo">Novo documento</a>}
          <button className="sec" onClick={exportar} disabled={!docs.length}>Exportar CSV</button>
        </div>
      </div>
      <Abas itens={abas} atual={area} onMudar={mudarArea} />
      <div className="filtros">
        <input type="search" placeholder="Buscar por código ou título" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select value={status} onChange={(e) => mudarStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {docs.length === 0 ? <Vazio>Nenhum documento encontrado.</Vazio> : (
        <>
          <div className="tabela desktop">
            <table>
              <thead>
                <tr><th>Código</th><th>Título</th><th>Departamento</th><th>Tipo</th><th>Rev.</th><th>Status</th><th>Próxima revisão</th></tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td className="mono"><a href={`#/doc/${d.id}`}>{d.codigo}</a></td>
                    <td><a href={`#/doc/${d.id}`}>{d.titulo}</a></td>
                    <td>{D.areaNome(d.area)}</td>
                    <td>{d.tipo}</td>
                    <td className="mono">{String(d.revisao).padStart(2, '0')}</td>
                    <td><Pill status={d.status} /></td>
                    <td><Validade doc={d} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cartoes mobile">
            {docs.map((d) => (
              <a key={d.id} className="cartao" href={`#/doc/${d.id}`}>
                <div className="linha"><b className="mono">{d.codigo}</b><Pill status={d.status} /></div>
                <div>{d.titulo}</div>
                <div className="muted">{D.areaNome(d.area)} · {d.tipo} · {rotuloRev(d.revisao)}</div>
                <div><Validade doc={d} /></div>
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}
