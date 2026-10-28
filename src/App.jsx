import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';
import { CONFIGURADO } from './lib/config.js';
import { DadosProvider, useDados } from './lib/dados.jsx';
import { gravarPreferencia, lerPreferencia } from './lib/util.js';
import AvisoModal from './components/AvisoModal.jsx';
import { Campo, Erro } from './components/ui.jsx';
import Painel from './pages/Painel.jsx';
import Lista from './pages/Lista.jsx';
import Detalhe from './pages/Detalhe.jsx';
import DocForm from './pages/DocForm.jsx';
import Areas from './pages/Areas.jsx';
import Funcionarios from './pages/Funcionarios.jsx';
import Relatorios from './pages/Relatorios.jsx';

function aplicarTema(t) {
  if (t === 'claro' || t === 'escuro') document.documentElement.dataset.theme = t === 'claro' ? 'light' : 'dark';
  else delete document.documentElement.dataset.theme;
}
aplicarTema(lerPreferencia('sgi.tema', 'auto'));

function Centro({ children }) {
  return <div className="login"><div className="card">{children}</div></div>;
}

function NaoConfigurado() {
  return (
    <Centro>
      <h1>SGI Docs Faura</h1>
      <p>O sistema ainda não está ligado ao Supabase.</p>
      <p className="muted">
        Abra o arquivo <code>src/lib/config.js</code> no GitHub, cole a Project URL e a chave pública do projeto do SGI e salve (Commit). O site é atualizado sozinho em alguns minutos.
      </p>
    </Centro>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function entrar(e) {
    e.preventDefault();
    setErro(''); setOcupado(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setOcupado(false);
    if (error) setErro('E-mail ou senha incorretos.');
  }
  return (
    <div className="login">
      <form onSubmit={entrar} className="card form">
        <h1>SGI Docs Faura</h1>
        <p className="muted">Controle de documentos do Sistema de Gestão Integrada. Entre com seu e-mail e senha.</p>
        <Campo rotulo="E-mail"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Campo>
        <Campo rotulo="Senha"><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></Campo>
        <Erro msg={erro} />
        <button disabled={ocupado}>{ocupado ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </div>
  );
}

function PrimeiroAcesso({ sessao, onFeito }) {
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  async function criar(e) {
    e.preventDefault();
    const { error } = await supabase.rpc('primeiro_admin', { p_nome: nome.trim() });
    if (error) setErro(error.message); else onFeito();
  }
  return (
    <div className="login">
      <form onSubmit={criar} className="card form">
        <h1>Primeiro acesso</h1>
        <p className="muted">Nenhum funcionário cadastrado ainda. Você ({sessao.user.email}) será o administrador (editor) do sistema.</p>
        <Campo rotulo="Seu nome"><input value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus /></Campo>
        <Erro msg={erro} />
        <button>Tornar-me administrador</button>
        <button type="button" className="sec" onClick={() => supabase.auth.signOut()}>Sair</button>
      </form>
    </div>
  );
}

function useRota() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const f = () => setHash(window.location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const [pagina = '', id] = hash.replace(/^#\/?/, '').split('/');
  return { pagina: pagina || 'painel', id };
}

function Shell({ sessao }) {
  const D = useDados();
  const { pagina, id } = useRota();
  const [aviso, setAviso] = useState(null);
  const [tema, setTema] = useState(lerPreferencia('sgi.tema', 'auto'));

  const mudarTema = () => {
    const prox = { auto: 'claro', claro: 'escuro', escuro: 'auto' }[tema];
    setTema(prox); aplicarTema(prox); gravarPreferencia('sgi.tema', prox);
  };
  const abrirAviso = (doc, evento, destino) => setAviso({ doc, evento, destino });
  const fecharAviso = () => {
    const destino = aviso?.destino;
    setAviso(null);
    if (destino) window.location.hash = destino;
  };

  const itens = [['painel', 'Painel'], ['lista', 'Lista mestra']];
  if (D.ehEditor) itens.push(['novo', 'Novo documento'], ['areas', 'Departamentos'], ['funcionarios', 'Avisos'], ['relatorios', 'Relatórios']);

  const restrito = ['novo', 'revisao', 'areas', 'funcionarios', 'relatorios'].includes(pagina) && !D.ehEditor;
  let tela;
  if (D.carregando) tela = <p className="muted">Carregando...</p>;
  else if (D.erro) tela = <p className="erro">Erro ao carregar os dados: {D.erro}. Confira se o arquivo schema.sql foi executado no Supabase.</p>;
  else if (restrito) tela = <p className="muted">Esta área é só para editores.</p>;
  else if (pagina === 'lista') tela = <Lista />;
  else if (pagina === 'doc') tela = <Detalhe key={id} id={id} onAviso={abrirAviso} />;
  else if (pagina === 'novo') tela = <DocForm onAviso={abrirAviso} />;
  else if (pagina === 'revisao') tela = <DocForm key={id} docId={id} onAviso={abrirAviso} />;
  else if (pagina === 'areas') tela = <Areas />;
  else if (pagina === 'funcionarios') tela = <Funcionarios />;
  else if (pagina === 'relatorios') tela = <Relatorios />;
  else tela = <Painel />;

  return (
    <div className="app">
      <header>
        <b className="marca">SGI Docs <span>Faura</span></b>
        <nav>
          {itens.map(([rota, nome]) => (
            <a key={rota} href={`#/${rota}`} className={pagina === rota || (rota === 'lista' && pagina === 'doc') ? 'ativa' : ''}>{nome}</a>
          ))}
        </nav>
        <span className="muted usuario">{D.eu.nome}{D.ehEditor ? ' · Editor' : ' · Leitor'}</span>
        <button className="sec peq" onClick={mudarTema} title="Alternar tema">Tema: {tema}</button>
        <button className="sec peq" onClick={() => supabase.auth.signOut()}>Sair</button>
      </header>
      {!D.ehEditor && (
        <p className="aviso-leitor">
          Você tem acesso de leitor: pode consultar, abrir e baixar documentos e registrar “Li e compreendi”. Para editar, peça a um editor para mudar sua permissão em Avisos &gt; Funcionários.
        </p>
      )}
      <main>{tela}</main>
      {aviso && <AvisoModal doc={aviso.doc} evento={aviso.evento} onFechar={fecharAviso} />}
    </div>
  );
}

function Acesso({ sessao }) {
  const [estado, setEstado] = useState({ carregando: true });

  async function verificar() {
    setEstado({ carregando: true });
    await supabase.rpc('vincular_conta');
    const { data, error } = await supabase.rpc('meu_funcionario');
    if (error) { setEstado({ erro: error.message }); return; }
    if (data && data[0]) { setEstado({ eu: data[0] }); return; }
    const { data: existe } = await supabase.rpc('existe_funcionario');
    setEstado({ semCadastro: true, primeiro: existe === false });
  }
  useEffect(() => { verificar(); }, [sessao.user.id]);

  if (estado.carregando) return <p className="muted centro">Carregando...</p>;
  if (estado.erro) {
    return <Centro><p className="erro">Erro: {estado.erro}</p><p className="muted">Confira se o schema.sql foi executado no Supabase.</p>
      <button className="sec" onClick={() => supabase.auth.signOut()}>Sair</button></Centro>;
  }
  if (estado.primeiro) return <PrimeiroAcesso sessao={sessao} onFeito={verificar} />;
  if (estado.semCadastro) {
    return (
      <Centro>
        <h1>Sem acesso</h1>
        <p>O e-mail {sessao.user.email} não está cadastrado como funcionário ativo. Peça a um editor para cadastrá-lo em Avisos &gt; Funcionários.</p>
        <button className="sec" onClick={() => supabase.auth.signOut()}>Sair</button>
      </Centro>
    );
  }
  return (
    <DadosProvider eu={estado.eu} userId={sessao.user.id}>
      <Shell sessao={sessao} />
    </DadosProvider>
  );
}

export default function App() {
  const [sessao, setSessao] = useState(undefined);
  useEffect(() => {
    if (!CONFIGURADO) return undefined;
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!CONFIGURADO) return <NaoConfigurado />;
  if (sessao === undefined) return <p className="muted centro">Carregando...</p>;
  if (!sessao) return <Login />;
  return <Acesso sessao={sessao} />;
}
