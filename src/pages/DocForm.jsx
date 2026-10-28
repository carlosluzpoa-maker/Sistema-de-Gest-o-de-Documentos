import React, { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useDados } from '../lib/dados.jsx';
import { enviarArquivo, idDoCodigo, proximoCodigo, registrarEvento } from '../lib/acoes.js';
import { PERIODICIDADES, TIPOS, addMeses, hoje, rotuloRev } from '../lib/util.js';
import { Campo, Erro } from '../components/ui.jsx';

// Novo documento (docId ausente) ou nova revisão (docId informado).
export default function DocForm({ docId, onAviso }) {
  const D = useDados();
  const base = docId ? D.docs.find((d) => d.id === docId) : null;
  const revisando = !!base;
  const areasAtivas = D.areas.filter((a) => a.ativo);

  const [area, setArea] = useState(base?.area || areasAtivas[0]?.id || '');
  const [codigo, setCodigo] = useState(base?.codigo || '');
  const [codigoEditado, setCodigoEditado] = useState(false);
  const [titulo, setTitulo] = useState(base?.titulo || '');
  const [tipo, setTipo] = useState(base?.tipo || TIPOS[0]);
  const [descricao, setDescricao] = useState(base?.descricao || '');
  const [elaborador, setElaborador] = useState(base?.elaborador || D.eu.nome);
  const [aprovador, setAprovador] = useState(base?.aprovador || '');
  const [periodicidade, setPeriodicidade] = useState(base?.periodicidade_meses || 12);
  const [data, setData] = useState(hoje());
  const [status, setStatus] = useState(revisando ? 'em_aprovacao' : 'rascunho');
  const [mudou, setMudou] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [extras, setExtras] = useState(new Set(base?.avisar_funcionarios || []));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const sugerido = useMemo(() => proximoCodigo(D.areas.find((a) => a.id === area), D.docs), [area, D.areas, D.docs]);
  const codigoFinal = revisando ? base.codigo : (codigoEditado ? codigo : sugerido);
  const proxima = addMeses(data, periodicidade);
  const outras = D.funcionarios.filter((f) => f.ativo && f.area !== area);

  const alternarExtra = (id) => setExtras((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (revisando && !mudou.trim()) { setErro('Informe o que mudou nesta revisão.'); return; }
    if (!revisando && !codigoFinal.trim()) { setErro('Informe o código do documento.'); return; }
    const id = revisando ? base.id : idDoCodigo(codigoFinal);
    if (!revisando && D.docs.some((d) => d.id === id)) { setErro(`Já existe um documento com o código ${codigoFinal}.`); return; }

    setSalvando(true);
    try {
      const novaRev = revisando ? base.revisao + 1 : 0;
      const arq = arquivo ? await enviarArquivo(id, novaRev, arquivo) : (revisando ? base.arquivo : null);
      const campos = {
        titulo: titulo.trim(), tipo, descricao: descricao.trim(), elaborador: elaborador.trim(), aprovador: aprovador.trim(),
        revisao: novaRev, status, alteracao: revisando ? mudou.trim() : '',
        publicado_em: data, proxima_revisao: proxima, periodicidade_meses: periodicidade,
        arquivo: arq, avisar_funcionarios: [...extras], atualizado_em: new Date().toISOString(),
      };
      let doc;
      if (revisando) {
        const { error } = await supabase.from('docs').update(campos).eq('id', id);
        if (error) throw error;
        doc = { ...base, ...campos };
      } else {
        doc = { id, codigo: codigoFinal.trim().toUpperCase(), area, anexos: [], ...campos };
        const { error } = await supabase.from('docs').insert(doc);
        if (error) throw error;
      }
      const resumo = revisando ? mudou.trim() : 'Emissão inicial';
      const { error: eRev } = await supabase.from('revisoes').insert({ doc_id: id, revisao: novaRev, autor_id: D.userId, resumo, arquivo: arq });
      if (eRev) throw eRev;
      const ev = await registrarEvento(doc, revisando ? 'revisao' : 'novo', { porId: D.userId, resumo });
      await D.recarregar();
      onAviso(doc, ev, `#/doc/${id}`);
    } catch (err) {
      setErro(`Não consegui salvar: ${err.message || err}`);
    }
    setSalvando(false);
  }

  if (docId && !base) return <p className="muted">Documento não encontrado.</p>;

  return (
    <>
      <p><a href={revisando ? `#/doc/${base.id}` : '#/lista'}>← Voltar</a></p>
      <h1>{revisando ? `Nova revisão: ${base.codigo} (${rotuloRev(base.revisao)} → ${rotuloRev(base.revisao + 1)})` : 'Novo documento'}</h1>
      <form className="card form" onSubmit={salvar}>
        {!revisando && (
          <div className="grade">
            <Campo rotulo="Departamento">
              <select value={area} onChange={(e) => setArea(e.target.value)} required>
                {areasAtivas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Código" dica="Sugerido pela sigla e pela sequência do departamento.">
              <input className="mono" value={codigoFinal} onChange={(e) => { setCodigo(e.target.value); setCodigoEditado(true); }} required />
            </Campo>
          </div>
        )}
        <Campo rotulo="Título"><input value={titulo} onChange={(e) => setTitulo(e.target.value)} required /></Campo>
        <div className="grade">
          <Campo rotulo="Tipo">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
          </Campo>
          <Campo rotulo="Periodicidade de revisão">
            <select value={periodicidade} onChange={(e) => setPeriodicidade(Number(e.target.value))}>
              {PERIODICIDADES.map((p) => <option key={p} value={p}>{p} meses</option>)}
            </select>
          </Campo>
          <Campo rotulo="Data de publicação" dica={`Próxima revisão: ${proxima.split('-').reverse().join('/')}`}>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Campo>
          <Campo rotulo="Status ao salvar">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="rascunho">Rascunho</option>
              <option value="em_aprovacao">Em aprovação</option>
              <option value="vigente">Vigente</option>
            </select>
          </Campo>
          <Campo rotulo="Elaborador"><input value={elaborador} onChange={(e) => setElaborador(e.target.value)} /></Campo>
          <Campo rotulo="Aprovador"><input value={aprovador} onChange={(e) => setAprovador(e.target.value)} /></Campo>
        </div>
        <Campo rotulo="Descrição"><textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Campo>
        {revisando && (
          <Campo rotulo="O que mudou (obrigatório)">
            <textarea rows={3} value={mudou} onChange={(e) => setMudou(e.target.value)} required />
          </Campo>
        )}
        <Campo rotulo={revisando ? 'Novo arquivo (opcional; sem arquivo, mantém o atual)' : 'Arquivo (PDF, planilha, documento...)'}>
          <input type="file" onChange={(e) => setArquivo(e.target.files[0] || null)} />
        </Campo>

        {outras.length > 0 && (
          <fieldset>
            <legend>Aplicar também a pessoas de outros departamentos</legend>
            <ul className="lista-check">
              {outras.map((f) => (
                <li key={f.id}>
                  <label><input type="checkbox" checked={extras.has(f.id)} onChange={() => alternarExtra(f.id)} /> {f.nome} <span className="muted">· {D.areaNome(f.area)}</span></label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        <Erro msg={erro} />
        <div className="botoes">
          <button disabled={salvando}>{salvando ? 'Salvando...' : revisando ? 'Salvar revisão' : 'Salvar documento'}</button>
          <a className="btn sec" href={revisando ? `#/doc/${base.id}` : '#/lista'}>Cancelar</a>
        </div>
      </form>
    </>
  );
}
