import React, { useMemo, useState } from 'react';
import { useDados } from '../lib/dados.jsx';
import { baixarCsv } from '../lib/util.js';
import { Abas, Vazio } from '../components/ui.jsx';

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export default function Relatorios() {
  const D = useDados();
  const [aba, setAba] = useState('func');
  const [areaMatriz, setAreaMatriz] = useState(D.areas[0]?.id || '');

  const porFunc = useMemo(() => D.funcionarios.filter((f) => f.ativo).map((f) => {
    const apl = D.aplicaveis(f);
    const lidos = f.user_id ? apl.filter((d) => D.lido(d, f.user_id)).length : 0;
    return { f, aplicaveis: apl.length, lidos, pendentes: apl.length - lidos, semVinculo: !f.user_id, pct: pct(lidos, apl.length) };
  }), [D]);

  const porArea = useMemo(() => D.areas.filter((a) => a.ativo).map((a) => {
    const linhas = porFunc.filter((r) => r.f.area === a.id);
    const aplic = linhas.reduce((s, r) => s + r.aplicaveis, 0);
    const lidos = linhas.reduce((s, r) => s + r.lidos, 0);
    return { a, funcionarios: linhas.length, semVinculo: linhas.filter((r) => r.semVinculo).length, aplicaveis: aplic, lidos, pendentes: aplic - lidos, pct: pct(lidos, aplic) };
  }), [D, porFunc]);

  const docsMatriz = D.docs.filter((d) => d.status === 'vigente' && d.area === areaMatriz);
  const funcsMatriz = D.funcionarios.filter((f) => f.ativo && (f.area === areaMatriz || docsMatriz.some((d) => (d.avisar_funcionarios || []).includes(f.id))));
  const aplica = (d, f) => d.area === f.area || (d.avisar_funcionarios || []).includes(f.id);
  const celula = (d, f) => (!aplica(d, f) ? '' : !f.user_id ? '?' : D.lido(d, f.user_id) ? '✓' : '—');

  function csv() {
    if (aba === 'func') {
      baixarCsv('relatorio-por-funcionario.csv', [
        ['Funcionário', 'Departamento', 'Aplicáveis', 'Lidos', 'Pendentes', '% lido', 'Sem vínculo'],
        ...porFunc.map((r) => [r.f.nome, D.areaNome(r.f.area), r.aplicaveis, r.lidos, r.pendentes, `${r.pct}%`, r.semVinculo ? 'Sim' : 'Não']),
      ]);
    } else if (aba === 'area') {
      baixarCsv('relatorio-por-departamento.csv', [
        ['Departamento', 'Funcionários', 'Sem vínculo', 'Aplicáveis', 'Lidos', 'Pendentes', '% lido'],
        ...porArea.map((r) => [r.a.nome, r.funcionarios, r.semVinculo, r.aplicaveis, r.lidos, r.pendentes, `${r.pct}%`]),
      ]);
    } else {
      baixarCsv('matriz-leitura.csv', [
        ['Documento', ...funcsMatriz.map((f) => f.nome)],
        ...docsMatriz.map((d) => [`${d.codigo} ${d.titulo}`, ...funcsMatriz.map((f) => celula(d, f))]),
      ]);
    }
  }

  return (
    <>
      <div className="topo">
        <h1>Relatórios de leitura</h1>
        <button className="sec" onClick={csv}>Exportar CSV</button>
      </div>
      <Abas itens={[['func', 'Por funcionário'], ['area', 'Por departamento'], ['matriz', 'Matriz documentos × funcionários']]} atual={aba} onMudar={setAba} />

      {aba === 'func' && (
        <div className="tabela"><table>
          <thead><tr><th>Funcionário</th><th>Departamento</th><th>Aplicáveis</th><th>Lidos</th><th>Pendentes</th><th>% lido</th><th>Conta</th></tr></thead>
          <tbody>{porFunc.map((r) => (
            <tr key={r.f.id}><td>{r.f.nome}</td><td>{D.areaNome(r.f.area)}</td><td>{r.aplicaveis}</td><td>{r.lidos}</td><td>{r.pendentes}</td>
              <td className="mono">{r.pct}%</td><td>{r.semVinculo ? <span className="pill st-obsoleto">Sem vínculo</span> : 'Vinculada'}</td></tr>
          ))}</tbody>
        </table></div>
      )}

      {aba === 'area' && (
        <div className="tabela"><table>
          <thead><tr><th>Departamento</th><th>Funcionários</th><th>Sem vínculo</th><th>Aplicáveis</th><th>Lidos</th><th>Pendentes</th><th>% lido</th></tr></thead>
          <tbody>{porArea.map((r) => (
            <tr key={r.a.id}><td>{r.a.nome}</td><td>{r.funcionarios}</td><td>{r.semVinculo}</td><td>{r.aplicaveis}</td><td>{r.lidos}</td><td>{r.pendentes}</td><td className="mono">{r.pct}%</td></tr>
          ))}</tbody>
        </table></div>
      )}

      {aba === 'matriz' && (
        <>
          <div className="filtros">
            <select value={areaMatriz} onChange={(e) => setAreaMatriz(e.target.value)}>
              {D.areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <span className="muted">✓ leu · — pendente · ? sem vínculo</span>
          </div>
          {docsMatriz.length === 0 || funcsMatriz.length === 0 ? <Vazio>Sem documentos vigentes ou funcionários neste departamento.</Vazio> : (
            <div className="tabela"><table className="matriz">
              <thead><tr><th>Documento</th>{funcsMatriz.map((f) => <th key={f.id}>{f.nome}</th>)}</tr></thead>
              <tbody>{docsMatriz.map((d) => (
                <tr key={d.id}><td><a href={`#/doc/${d.id}`}><span className="mono">{d.codigo}</span> {d.titulo}</a></td>
                  {funcsMatriz.map((f) => <td key={f.id} className="centro">{celula(d, f)}</td>)}</tr>
              ))}</tbody>
            </table></div>
          )}
        </>
      )}
    </>
  );
}
