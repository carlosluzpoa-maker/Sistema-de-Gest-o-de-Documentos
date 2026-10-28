import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useDados } from '../lib/dados.jsx';
import { rotuloRev } from '../lib/util.js';
import { Erro } from './ui.jsx';

const ASSUNTO = {
  novo: 'Novo documento',
  revisao: 'Nova revisão',
  em_aprovacao: 'Documento em aprovação',
  aprovado: 'Documento aprovado',
  obsoleto: 'Documento obsoleto',
  arquivo: 'Arquivo atualizado',
};

// Aviso por e-mail: o sistema monta a mensagem e abre o programa de e-mail do usuário.
// Só aparecem pessoas cadastradas (sem campo de e-mail livre).
export default function AvisoModal({ doc, evento, onFechar }) {
  const D = useDados();
  const padrao = D.destinatariosPadrao(doc);
  const [marcados, setMarcados] = useState(() => new Set(padrao.map((f) => f.id)));
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const publico = D.publicoDoc(doc);
  const lista = publico.filter((f) => f.recebe_avisos || marcados.has(f.id));
  const escolhidos = lista.filter((f) => marcados.has(f.id));

  const assunto = `[SGI Faura] ${ASSUNTO[evento.tipo] || 'Atualização'}: ${doc.codigo} ${rotuloRev(doc.revisao)} – ${doc.titulo}`;
  const linhas = [
    `Olá,`,
    '',
    `${ASSUNTO[evento.tipo] || 'Atualização'} no SGI Docs:`,
    `${doc.codigo} ${rotuloRev(doc.revisao)} – ${doc.titulo}`,
    `Departamento: ${D.areaNome(doc.area)}`,
  ];
  if (evento.resumo) linhas.push(`O que mudou: ${evento.resumo}`);
  if (D.config.link_sgi) linhas.push('', `Acesse: ${D.config.link_sgi}#/doc/${doc.id}`);
  linhas.push('', 'Após ler, registre o "Li e compreendi" no sistema.');
  const corpo = linhas.join('\n');

  const href = `mailto:${escolhidos.map((f) => f.email).join(',')}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

  function alternar(id) {
    setMarcados((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function marcarEnviado() {
    setSalvando(true); setErro('');
    const { error } = await supabase.from('eventos')
      .update({ destinatarios: escolhidos.map((f) => f.email), email_enviado: true }).eq('id', evento.id);
    setSalvando(false);
    if (error) { setErro(`Não consegui registrar: ${error.message}`); return; }
    await D.recarregar();
    onFechar();
  }

  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Avisar por e-mail">
      <div className="modal">
        <h2>Avisar por e-mail</h2>
        <p className="muted">{assunto}</p>
        {lista.length === 0 ? (
          <p className="muted">Nenhum funcionário cadastrado recebe avisos para este documento. Cadastre em Funcionários.</p>
        ) : (
          <ul className="lista-check">
            {lista.map((f) => (
              <li key={f.id}>
                <label>
                  <input type="checkbox" checked={marcados.has(f.id)} onChange={() => alternar(f.id)} />
                  {f.nome} <span className="muted mono">{f.email}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          O botão abre o seu programa de e-mail com a mensagem pronta; você confere e envia. Depois, confirme aqui para registrar no histórico.
        </p>
        <Erro msg={erro} />
        <div className="botoes">
          <a className={`btn ${escolhidos.length === 0 ? 'desab' : ''}`} href={escolhidos.length ? href : undefined} onClick={() => setAberto(true)}>
            Abrir e-mail
          </a>
          <button className="sec" disabled={!aberto || salvando} onClick={marcarEnviado}>Já enviei</button>
          <button className="sec" onClick={onFechar}>Agora não</button>
        </div>
      </div>
    </div>
  );
}
