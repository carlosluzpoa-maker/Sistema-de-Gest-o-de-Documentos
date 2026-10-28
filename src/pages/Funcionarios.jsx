import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useDados } from '../lib/dados.jsx';
import { Abas, Campo, Erro } from '../components/ui.jsx';

const vazio = { nome: '', email: '', area: '', permissao: 'leitura', recebe_avisos: true, ativo: true };

function Config() {
  const D = useDados();
  const [link, setLink] = useState(D.config.link_sgi || '');
  const [msg, setMsg] = useState('');
  async function salvar(e) {
    e.preventDefault();
    const { error } = await supabase.from('config').upsert({ chave: 'link_sgi', valor: link.trim() });
    if (error) { setMsg(error.message); return; }
    await D.recarregar();
    setMsg('Salvo.');
  }
  return (
    <form className="card form" onSubmit={salvar}>
      <h2>Configurações</h2>
      <Campo rotulo="Endereço do sistema" dica="Usado nos e-mails de aviso (ex.: https://sgi-docs.vercel.app/).">
        <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
      </Campo>
      <div className="botoes"><button>Salvar</button><span className="muted">{msg}</span></div>
    </form>
  );
}

export default function Funcionarios() {
  const D = useDados();
  const [aba, setAba] = useState('lista');
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState('');

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    const reg = {
      nome: form.nome.trim(), email: form.email.trim().toLowerCase(), area: form.area || null,
      permissao: form.permissao, recebe_avisos: form.recebe_avisos, ativo: form.ativo,
    };
    const { error } = form.id ? await supabase.from('funcionarios').update(reg).eq('id', form.id) : await supabase.from('funcionarios').insert(reg);
    if (error) { setErro(error.code === '23505' ? 'Já existe funcionário com este e-mail.' : error.message); return; }
    await D.recarregar();
    setForm(null);
  }

  return (
    <>
      <div className="topo">
        <h1>Avisos e funcionários</h1>
        {aba === 'lista' && <button onClick={() => setForm({ ...vazio, area: D.areas[0]?.id || '' })}>Novo funcionário</button>}
      </div>
      <Abas itens={[['lista', 'Funcionários'], ['config', 'Configurações']]} atual={aba} onMudar={setAba} />
      {aba === 'config' ? <Config /> : (
        <>
          <Erro msg={erro} />
          {form && (
            <form className="card form" onSubmit={salvar}>
              <h2>{form.id ? 'Editar funcionário' : 'Novo funcionário'}</h2>
              <div className="grade">
                <Campo rotulo="Nome"><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></Campo>
                <Campo rotulo="E-mail de login" dica="Deve ser o mesmo e-mail do usuário criado no Supabase (Authentication > Users).">
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </Campo>
                <Campo rotulo="Departamento">
                  <select value={form.area || ''} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                    <option value="">Sem departamento</option>
                    {D.areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Permissão">
                  <select value={form.permissao} onChange={(e) => setForm({ ...form, permissao: e.target.value })}>
                    <option value="leitura">Leitor</option>
                    <option value="editar">Editor</option>
                  </select>
                </Campo>
              </div>
              <label className="check"><input type="checkbox" checked={form.recebe_avisos} onChange={(e) => setForm({ ...form, recebe_avisos: e.target.checked })} /> Recebe avisos por e-mail</label>
              <label className="check"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo</label>
              <div className="botoes">
                <button>Salvar</button>
                <button type="button" className="sec" onClick={() => setForm(null)}>Cancelar</button>
              </div>
            </form>
          )}
          <div className="tabela">
            <table>
              <thead><tr><th>Nome</th><th>E-mail</th><th>Departamento</th><th>Permissão</th><th>Avisos</th><th>Conta</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                {D.funcionarios.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nome}</td><td className="mono">{f.email}</td><td>{D.areaNome(f.area)}</td>
                    <td>{f.permissao === 'editar' ? 'Editor' : 'Leitor'}</td>
                    <td>{f.recebe_avisos ? 'Sim' : 'Não'}</td>
                    <td>{f.user_id ? 'Vinculada' : 'Ainda não entrou'}</td>
                    <td>{f.ativo ? 'Ativo' : 'Inativo'}</td>
                    <td><button className="sec peq" onClick={() => setForm({ ...f })}>Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Para cada pessoa, crie também o usuário no Supabase (Authentication &gt; Users) com o mesmo e-mail. A conta é vinculada automaticamente no primeiro acesso.
          </p>
        </>
      )}
    </>
  );
}
