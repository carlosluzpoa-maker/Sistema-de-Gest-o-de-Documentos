import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useDados } from '../lib/dados.jsx';
import { EVENTOS, fmtData, fmtDataHora, rotuloRev, validade } from '../lib/util.js';
import { Validade, Vazio } from '../components/ui.jsx';

export default function Painel() {
  const D = useDados();
  const [anterior, setAnterior] = useState(undefined);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('estado_usuario').select('ultima_visita').eq('user_id', D.userId).maybeSingle();
      setAnterior(data?.ultima_visita || null);
      await supabase.from('estado_usuario').upsert({ user_id: D.userId, ultima_visita: new Date().toISOString() });
    })();
  }, [D.userId]);

  const vigentes = D.docs.filter((d) => d.status === 'vigente');
  const emAprovacao = D.docs.filter((d) => d.status === 'em_aprovacao');
  const vencidas = vigentes.filter((d) => validade(d) === 'vencida');
  const vence30 = vigentes.filter((d) => validade(d) === 'vence30');
  const pendentes = D.aplicaveis(D.eu).filter((d) => !D.lido(d, D.userId));
  const novidades = D.eventos.filter((e) => anterior && new Date(e.em) > new Date(anterior));
  const recentes = novidades.length ? novidades : D.eventos.slice(0, 8);
  const atencao = [...vencidas, ...vence30].sort((a, b) => (a.proxima_revisao || '').localeCompare(b.proxima_revisao || ''));

  const Indicador = ({ valor, rotulo, tom, href }) => (
    <a className={`indicador ${tom || ''}`} href={href}>
      <b className="mono">{valor}</b>
      <span>{rotulo}</span>
    </a>
  );

  return (
    <>
      <h1>Painel</h1>
      <div className="indicadores">
        <Indicador valor={vigentes.length} rotulo="Vigentes" href="#/lista" />
        <Indicador valor={emAprovacao.length} rotulo="Em aprovação" href="#/lista" />
        <Indicador valor={vencidas.length} rotulo="Revisão vencida" tom={vencidas.length ? 'ruim' : ''} href="#/lista" />
        <Indicador valor={vence30.length} rotulo="Vence em 30 dias" tom={vence30.length ? 'aviso' : ''} href="#/lista" />
        <Indicador valor={pendentes.length} rotulo="Pendentes de leitura para mim" tom={pendentes.length ? 'aviso' : ''} href="#/lista" />
      </div>

      {pendentes.length > 0 && (
        <section className="card">
          <h2>Pendentes de leitura para mim</h2>
          <ul className="itens">
            {pendentes.map((d) => (
              <li key={d.id}>
                <a href={`#/doc/${d.id}`}><span className="mono">{d.codigo}</span> {d.titulo}</a>
                <span className="muted">{rotuloRev(d.revisao)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="duas">
        <section className="card">
          <h2>
            {novidades.length ? 'Novidades desde a última visita ' : 'Atividade recente '}
            {novidades.length > 0 && <span className="pill st-novo">{novidades.length}</span>}
          </h2>
          {recentes.length === 0 ? <Vazio>Nada por aqui ainda.</Vazio> : (
            <ul className="itens">
              {recentes.map((e) => (
                <li key={e.id}>
                  <a href={`#/doc/${e.doc_id}`}>
                    <span className="mono">{e.codigo}</span> {e.titulo} <span className="muted">· {EVENTOS[e.tipo]}{e.revisao != null ? ` ${rotuloRev(e.revisao)}` : ''}</span>
                  </a>
                  <span className="muted mono">{fmtDataHora(e.em)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Revisões vencidas e próximas</h2>
          {atencao.length === 0 ? <Vazio>Nenhuma revisão vencida ou a vencer em 30 dias.</Vazio> : (
            <ul className="itens">
              {atencao.map((d) => (
                <li key={d.id}>
                  <a href={`#/doc/${d.id}`}><span className="mono">{d.codigo}</span> {d.titulo}</a>
                  <span><Validade doc={d} /> <span className="muted mono">{fmtData(d.proxima_revisao)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
