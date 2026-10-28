import React from 'react';
import { STATUS, validade, diasAte, fmtData } from '../lib/util.js';

export const Pill = ({ status }) => <span className={`pill st-${status}`}>{STATUS[status] || status}</span>;

export function Validade({ doc }) {
  const v = validade(doc);
  if (v === 'vencida') return <span className="pill st-vencida">Vencida há {Math.abs(diasAte(doc.proxima_revisao))} d</span>;
  if (v === 'vence30') return <span className="pill st-vence">Vence em {diasAte(doc.proxima_revisao)} d</span>;
  return <span className="mono">{doc.status === 'vigente' ? fmtData(doc.proxima_revisao) : '—'}</span>;
}

export const Vazio = ({ children }) => <p className="muted vazio">{children}</p>;

export function Campo({ rotulo, dica, children }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {dica && <small className="muted">{dica}</small>}
    </label>
  );
}

export const Erro = ({ msg }) => (msg ? <p className="erro">{msg}</p> : null);

export function Abas({ itens, atual, onMudar }) {
  return (
    <div className="abas" role="tablist">
      {itens.map(([id, nome]) => (
        <button key={id} role="tab" aria-selected={atual === id} className={atual === id ? 'ativa' : ''} onClick={() => onMudar(id)}>
          {nome}
        </button>
      ))}
    </div>
  );
}
