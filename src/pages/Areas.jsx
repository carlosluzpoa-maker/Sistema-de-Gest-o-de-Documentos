import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useDados } from '../lib/dados.jsx';
import { Campo, Erro } from '../components/ui.jsx';

const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const vazio = { id: '', nome: '', sigla: '', ordem: 0, responsavel: '', ativo: true };

export default function Areas() {
  const D = useDados();
  const [form, setForm] = useState(null); // null = fechado; { ...area, novo }
  const [erro, setErro] = useState('');

  const contagem = (id) => ({
    docs: D.docs.filter((d) => d.area === id).length,
    funcs: D.funcionarios.filter((f) => f.area === id).length,
  });

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    const reg = {
      id: form.novo ? slug(form.nome) : form.id,
      nome: form.nome.trim(), sigla: form.sigla.trim().toUpperCase(),
      ordem: Number(form.ordem) || 0, responsavel: form.responsavel.trim(), ativo: form.ativo,
    };
    if (!reg.id || !reg.sigla) { setErro('Informe nome e sigla.'); return; }
    if (form.novo && D.areas.some((a) => a.id === reg.id || a.sigla === reg.sigla)) { setErro('Já existe departamento com este nome ou sigla.'); return; }
    const { error } = form.novo ? await supabase.from('areas').insert(reg) : await supabase.from('areas').update(reg).eq('id', reg.id);
    if (error) { setErro(error.message); return; }
    await D.recarregar();
    setForm(null);
  }

  async function excluir(a) {
    const { error } = await supabase.from('areas').delete().eq('id', a.id);
    if (error) { setErro(error.message); return; }
    await D.recarregar();
  }

  const alternarAtivo = async (a) => {
    const { error } = await supabase.from('areas').update({ ativo: !a.ativo }).eq('id', a.id);
    if (error) setErro(error.message); else D.recarregar();
  };

  return (
    <>
      <div className="topo">
        <h1>Departamentos</h1>
        <button onClick={() => setForm({ ...vazio, novo: true, ordem: D.areas.length + 1 })}>Novo departamento</button>
      </div>
      <Erro msg={erro} />

      {form && (
        <form className="card form" onSubmit={salvar}>
          <h2>{form.novo ? 'Novo departamento' : `Editar ${form.nome}`}</h2>
          <div className="grade">
            <Campo rotulo="Nome"><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></Campo>
            <Campo rotulo="Sigla" dica="Usada no código dos documentos (ex.: LO 002)."><input className="mono" maxLength={4} value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value })} required /></Campo>
            <Campo rotulo="Ordem"><input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} /></Campo>
            <Campo rotulo="Responsável"><input value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></Campo>
          </div>
          <label className="check"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo</label>
          <div className="botoes">
            <button>Salvar</button>
            <button type="button" className="sec" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="tabela">
        <table>
          <thead><tr><th>Sigla</th><th>Nome</th><th>Responsável</th><th>Documentos</th><th>Funcionários</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {D.areas.map((a) => {
              const c = contagem(a.id);
              const vazia = c.docs === 0 && c.funcs === 0;
              return (
                <tr key={a.id}>
                  <td className="mono">{a.sigla}</td><td>{a.nome}</td><td>{a.responsavel || '—'}</td>
                  <td>{c.docs}</td><td>{c.funcs}</td>
                  <td>{a.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="botoes">
                    <button className="sec peq" onClick={() => setForm({ ...a, novo: false })}>Editar</button>
                    {vazia
                      ? <button className="sec peq" onClick={() => excluir(a)}>Excluir</button>
                      : <button className="sec peq" onClick={() => alternarAtivo(a)}>{a.ativo ? 'Desativar' : 'Ativar'}</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">Departamentos com documentos ou funcionários só podem ser desativados; a exclusão vale apenas para os vazios.</p>
    </>
  );
}
