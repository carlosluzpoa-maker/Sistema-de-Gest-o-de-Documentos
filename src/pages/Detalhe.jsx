import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useDados } from '../lib/dados.jsx';
import { abrirArquivo, enviarArquivo, registrarEvento } from '../lib/acoes.js';
import { EVENTOS, addMeses, fmtData, fmtDataHora, hoje, rotuloRev, validade } from '../lib/util.js';
import { Erro, Pill, Validade, Vazio } from '../components/ui.jsx';

const tamanho = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function ArquivoLinha({ arq, onRemover }) {
  const [erro, setErro] = useState('');
  const abrir = (baixar) => abrirArquivo(arq, baixar).catch((e) => setErro(e.message));
  return (
    <li>
      <span>{arq.nome} <span className="muted mono">{tamanho(arq.tamanho)}</span></span>
      <span className="botoes">
        <button className="sec peq" onClick={() => abrir(false)}>Abrir</button>
        <button className="sec peq" onClick={() => abrir(true)}>Baixar</button>
        {onRemover && <button className="sec peq" onClick={onRemover}>Remover</button>}
        <Erro msg={erro} />
      </span>
    </li>
  );
}

export default function Detalhe({ id, onAviso }) {
  const D = useDados();
  const doc = D.docs.find((d) => d.id === id);
  const [revisoes, setRevisoes] = useState([]);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [confirmaObsoleto, setConfirmaObsoleto] = useState(false);

  useEffect(() => {
    supabase.from('revisoes').select('*').eq('doc_id', id).order('revisao', { ascending: false })
      .then(({ data }) => setRevisoes(data || []));
  }, [id, doc?.revisao, doc?.atualizado_em]);

  if (!doc) return <Vazio>Documento não encontrado. <a href="#/lista">Voltar à lista</a></Vazio>;

  const publico = D.publicoDoc(doc);
  const euAplico = publico.some((f) => f.id === D.eu.id);
  const jaLi = D.lido(doc, D.userId);
  const eventos = D.eventos.filter((e) => e.doc_id === doc.id);

  async function executar(fn) {
    setOcupado(true); setErro('');
    try { await fn(); } catch (e) { setErro(e.message || String(e)); }
    setOcupado(false);
  }

  const mudarStatus = (novo, tipo) => executar(async () => {
    const patch = { status: novo, atualizado_em: new Date().toISOString() };
    if (novo === 'vigente') {
      patch.publicado_em = hoje();
      patch.proxima_revisao = addMeses(hoje(), doc.periodicidade_meses);
    }
    const { error } = await supabase.from('docs').update(patch).eq('id', doc.id);
    if (error) throw error;
    const ev = await registrarEvento({ ...doc, ...patch }, tipo, { porId: D.userId });
    await D.recarregar();
    setConfirmaObsoleto(false);
    onAviso({ ...doc, ...patch }, ev);
  });

  const substituirArquivo = (file) => executar(async () => {
    const arq = await enviarArquivo(doc.id, doc.revisao, file);
    const { error } = await supabase.from('docs').update({ arquivo: arq, atualizado_em: new Date().toISOString() }).eq('id', doc.id);
    if (error) throw error;
    await supabase.from('revisoes').update({ arquivo: arq }).eq('doc_id', doc.id).eq('revisao', doc.revisao);
    const ev = await registrarEvento(doc, 'arquivo', { porId: D.userId, resumo: `Arquivo substituído: ${arq.nome}` });
    await D.recarregar();
    onAviso({ ...doc, arquivo: arq }, ev);
  });

  const adicionarAnexo = (file) => executar(async () => {
    const arq = await enviarArquivo(doc.id, doc.revisao, file);
    const { error } = await supabase.from('docs').update({ anexos: [...(doc.anexos || []), arq] }).eq('id', doc.id);
    if (error) throw error;
    await D.recarregar();
  });

  const removerAnexo = (arq) => executar(async () => {
    const { error } = await supabase.from('docs').update({ anexos: (doc.anexos || []).filter((a) => a.path !== arq.path) }).eq('id', doc.id);
    if (error) throw error;
    await supabase.storage.from('documentos').remove([arq.path]);
    await D.recarregar();
  });

  const registrarLeitura = () => executar(async () => {
    const { error } = await supabase.from('leituras').upsert({
      user_id: D.userId, doc_id: doc.id, revisao: doc.revisao, em: new Date().toISOString(),
    });
    if (error) throw error;
    await D.recarregar();
  });

  const avisarAgora = () => {
    const ultimo = eventos[0];
    if (ultimo) onAviso(doc, ultimo);
    else setErro('Ainda não há evento deste documento para avisar.');
  };

  return (
    <>
      <p><a href="#/lista">← Lista mestra</a></p>
      <div className="topo">
        <div>
          <h1><span className="mono">{doc.codigo}</span> {doc.titulo}</h1>
          <p className="muted">{D.areaNome(doc.area)} · {doc.tipo} · {rotuloRev(doc.revisao)}</p>
        </div>
        <div className="botoes">
          <Pill status={doc.status} />
          <Validade doc={doc} />
        </div>
      </div>
      <Erro msg={erro} />

      {D.ehEditor && (
        <section className="card acoes">
          <h2>Ações</h2>
          <div className="botoes">
            <a className="btn" href={`#/revisao/${doc.id}`}>Nova revisão</a>
            {doc.status === 'rascunho' && <button disabled={ocupado} onClick={() => mudarStatus('em_aprovacao', 'em_aprovacao')}>Enviar para aprovação</button>}
            {(doc.status === 'rascunho' || doc.status === 'em_aprovacao') && <button disabled={ocupado} onClick={() => mudarStatus('vigente', 'aprovado')}>Aprovar e publicar</button>}
            {doc.status !== 'obsoleto' && !confirmaObsoleto && <button className="sec" onClick={() => setConfirmaObsoleto(true)}>Tornar obsoleto</button>}
            {confirmaObsoleto && (
              <>
                <button className="perigo" disabled={ocupado} onClick={() => mudarStatus('obsoleto', 'obsoleto')}>Confirmar: tornar obsoleto</button>
                <button className="sec" onClick={() => setConfirmaObsoleto(false)}>Cancelar</button>
              </>
            )}
            <label className="btn sec arquivo">
              Substituir arquivo
              <input type="file" hidden disabled={ocupado} onChange={(e) => e.target.files[0] && substituirArquivo(e.target.files[0])} />
            </label>
            <button className="sec" onClick={avisarAgora}>Avisar por e-mail</button>
          </div>
        </section>
      )}

      <div className="duas">
        <section className="card">
          <h2>Dados</h2>
          <dl className="meta">
            <dt>Elaborador</dt><dd>{doc.elaborador || '—'}</dd>
            <dt>Aprovador</dt><dd>{doc.aprovador || '—'}</dd>
            <dt>Publicado em</dt><dd className="mono">{fmtData(doc.publicado_em)}</dd>
            <dt>Próxima revisão</dt><dd className="mono">{fmtData(doc.proxima_revisao)}</dd>
            <dt>Periodicidade</dt><dd>{doc.periodicidade_meses} meses</dd>
            <dt>Descrição</dt><dd>{doc.descricao || '—'}</dd>
            {doc.alteracao && <><dt>Última alteração</dt><dd>{doc.alteracao}</dd></>}
          </dl>
        </section>

        <section className="card">
          <h2>Arquivo e anexos</h2>
          {doc.arquivo ? <ul className="itens"><ArquivoLinha arq={doc.arquivo} /></ul> : <Vazio>Sem arquivo principal.</Vazio>}
          <h3>Anexos</h3>
          {(doc.anexos || []).length === 0 ? <Vazio>Nenhum anexo.</Vazio> : (
            <ul className="itens">
              {doc.anexos.map((a) => <ArquivoLinha key={a.path} arq={a} onRemover={D.ehEditor ? () => removerAnexo(a) : null} />)}
            </ul>
          )}
          {D.ehEditor && (
            <label className="btn sec arquivo">
              Adicionar anexo
              <input type="file" hidden disabled={ocupado} onChange={(e) => e.target.files[0] && adicionarAnexo(e.target.files[0])} />
            </label>
          )}
        </section>
      </div>

      <section className="card">
        <div className="topo">
          <h2>Leitura da {rotuloRev(doc.revisao)}</h2>
          {doc.status === 'vigente' && (jaLi
            ? <span className="ok">Você já registrou a leitura</span>
            : <button disabled={ocupado} onClick={registrarLeitura}>Li e compreendi</button>)}
        </div>
        {doc.status !== 'vigente' && <p className="muted">A leitura é registrada quando o documento está vigente.</p>}
        {!euAplico && doc.status === 'vigente' && <p className="muted">Este documento não é obrigatório para o seu departamento, mas você pode registrar a leitura.</p>}
        {publico.length === 0 ? <Vazio>Nenhum funcionário cadastrado se aplica a este documento.</Vazio> : (
          <div className="tabela">
            <table>
              <thead><tr><th>Funcionário</th><th>Situação</th><th>Em</th></tr></thead>
              <tbody>
                {publico.map((f) => {
                  const leitura = f.user_id && D.leituras.find((l) => l.user_id === f.user_id && l.doc_id === doc.id && l.revisao === doc.revisao);
                  return (
                    <tr key={f.id}>
                      <td>{f.nome}</td>
                      <td>{leitura ? <span className="pill st-vigente">Leu</span> : f.user_id ? <span className="pill st-em_aprovacao">Pendente</span> : <span className="pill st-obsoleto">Sem vínculo</span>}</td>
                      <td className="mono">{leitura ? fmtDataHora(leitura.em) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">“Sem vínculo” = a pessoa ainda não entrou no sistema com o e-mail cadastrado.</p>
      </section>

      <div className="duas">
        <section className="card">
          <h2>Histórico de revisões</h2>
          {revisoes.length === 0 ? <Vazio>Sem revisões registradas.</Vazio> : (
            <ul className="itens">
              {revisoes.map((r) => (
                <li key={r.id}>
                  <span><b className="mono">{rotuloRev(r.revisao)}</b> {r.resumo || '—'}</span>
                  <span className="muted mono">{fmtDataHora(r.data)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2>Eventos</h2>
          {eventos.length === 0 ? <Vazio>Sem eventos.</Vazio> : (
            <ul className="itens">
              {eventos.map((e) => (
                <li key={e.id}>
                  <span>{EVENTOS[e.tipo]} {e.revisao != null && rotuloRev(e.revisao)} {e.email_enviado && <span className="pill st-vigente">e-mail enviado</span>}</span>
                  <span className="muted mono">{fmtDataHora(e.em)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {validade(doc) === 'vencida' && <p className="erro">A revisão deste documento está vencida.</p>}
    </>
  );
}
