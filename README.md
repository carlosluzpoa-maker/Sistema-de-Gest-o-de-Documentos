# SGI Docs

Sistema web de controle de documentos do Sistema de Gestão Integrada (requisito 7.5 "Informação documentada" das ISO 9001/14001/45001): lista mestra, revisões com histórico, aprovação, validade, evidência de leitura ("Li e compreendi"), relatórios e aviso por e-mail.

Feito com GitHub (código), Supabase (banco, login e arquivos) e Vercel (site no ar). Todo o texto da tela está em português do Brasil.

## O que o sistema faz

| Tela | Para quem | O que faz |
| --- | --- | --- |
| Painel | Todos | Vigentes, em aprovação, revisão vencida, vence em 30 dias, pendentes de leitura para mim, novidades desde a última visita |
| Lista mestra | Todos | Abas por departamento, filtros de status, tipo e busca, alerta de validade, exportar CSV |
| Detalhe do documento | Todos | Dados, abrir e baixar o arquivo, anexos, histórico de revisões, quem leu e quem está pendente, "Li e compreendi" |
| Novo documento e Nova revisão | Editores | Código sugerido, periodicidade calcula a próxima revisão, upload, "O que mudou" obrigatório na revisão |
| Departamentos | Editores | Cadastro com contagem de documentos e funcionários |
| Avisos | Editores | Funcionários (permissão, recebe avisos) e Configurações (endereço do sistema) |
| Relatórios | Editores | Por funcionário, por departamento e matriz documentos × funcionários, com CSV |

**Permissões:** Editor faz tudo. Leitor consulta, abre, baixa e registra a leitura. O acesso é decidido pelo e-mail cadastrado em Avisos > Funcionários.

## Diferenças em relação ao agente do Claude

A especificação original foi feita para rodar dentro do Claude (artefato). Aqui ela foi adaptada ao GitHub e ao Supabase:

- **Login:** e-mail e senha criados no Supabase. A conta é ligada ao funcionário pelo e-mail, sem seletor de usuário.
- **Arquivos:** ficam no Supabase Storage (qualquer formato: PDF, XLSX, DOCX). Não é preciso converter para base64.
- **Aviso por e-mail:** o Gmail do Claude não existe fora dele. O sistema monta a mensagem (destinatários, assunto `[SGI Faura] Nova revisão: LO 005 Rev. 01 – título`, texto e link) e abre o seu programa de e-mail; você confere e envia. Depois clica em "Já enviei" para registrar. Só aparecem pessoas cadastradas, sem campo de e-mail livre.
- **Dono do sistema:** o primeiro usuário que entrar vira administrador (editor).

## Passo a passo para colocar no ar

Reserve cerca de 30 minutos. Use um projeto novo no Supabase, separado dos outros projetos.

### 1. Criar o projeto no Supabase
1. Em supabase.com/dashboard, clique em **New project**.
2. Nome `sgi-docs`, região **South America (São Paulo)**, defina e anote a senha do banco. Aguarde a criação.

### 2. Criar as tabelas, o armazenamento e as regras de acesso
1. No projeto, abra **SQL Editor** > **New query**.
2. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o texto, cole e clique em **Run**. Deve aparecer "Success".

### 3. Criar usuários e fechar o cadastro público
1. **Authentication > Users > Add user > Create new user**: informe e-mail e senha e marque **Auto Confirm User**. Crie o seu primeiro.
2. Repita para cada pessoa que vai usar (o e-mail precisa ser o mesmo que será cadastrado em Funcionários).
3. Em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up** e salve.

### 4. Copiar a URL e a chave pública
1. Abra **Project Settings** (engrenagem) > **API Keys** (ou **API**).
2. Copie a **Project URL** e a chave **anon public** (ou **Publishable key**).
3. Não use a `service_role` / `secret` nem a senha do banco.

### 5. Enviar o código para o GitHub
1. Em github.com, clique em **New repository**, nome `sgi-docs-faura`, marque **Private** e crie.
2. Na tela do repositório vazio, clique em **uploading an existing file**.
3. Arraste o **conteúdo** da pasta extraída deste projeto (as pastas `src` e `supabase`, e os arquivos `index.html`, `package.json`, `vite.config.js`, `README.md` etc.). Se o `.gitignore` não aparecer, ative "Itens ocultos" no Explorer.
4. Clique em **Commit changes**.

### 6. Colocar a URL e a chave no código
1. No repositório, abra `src/lib/config.js` e clique no ícone de lápis (**Edit this file**).
2. Troque `COLE_AQUI_A_PROJECT_URL` pela Project URL e `COLE_AQUI_A_CHAVE_PUBLICA` pela chave pública, mantendo as aspas.
3. Clique em **Commit changes**.

### 7. Publicar com a Vercel
1. Em vercel.com, entre com sua conta do GitHub e clique em **Add New > Project**.
2. Escolha `sgi-docs-faura`, deixe o *Framework Preset* como **Vite** e clique em **Deploy**.
3. Ao terminar, clique em **Visit**. O endereço é algo como `sgi-docs-faura.vercel.app`. Salve nos favoritos.
4. Cada alteração feita no GitHub republica o site sozinha.

### 8. Primeiro acesso
1. Abra o site e entre com o e-mail e a senha do passo 3.
2. Na tela **Primeiro acesso**, digite seu nome e clique em **Tornar-me administrador**.
3. Vá em **Avisos > Configurações**, informe o endereço do site (da Vercel) e salve. Ele vai nos e-mails de aviso.
4. Em **Departamentos**, confira os quatro iniciais (Integração IN, Atendimento AT, Logística LO, Financeiro FI) e ajuste se precisar.
5. Em **Avisos > Funcionários**, cadastre as pessoas (e-mail igual ao do Supabase, departamento, permissão Editor ou Leitor, recebe avisos). A conta é vinculada no primeiro acesso de cada pessoa.

### 9. Usar no dia a dia
1. **Novo documento:** escolha o departamento, confira o código sugerido (ex.: LO 005), informe título, tipo, periodicidade e envie o arquivo.
2. Na tela do documento, use **Enviar para aprovação** e **Aprovar e publicar**. O documento fica vigente e a próxima revisão é calculada.
3. Ao salvar ou mudar o status, abre a caixa **Avisar por e-mail**: confira os destinatários, clique em **Abrir e-mail**, envie pelo seu programa de e-mail e confirme em **Já enviei**.
4. Cada pessoa abre o documento e clica em **Li e compreendi**. Uma nova revisão volta a deixar a leitura pendente para todos.
5. **Relatórios** mostram quem leu e quem está pendente, com exportação em CSV.

## Segurança

- O banco usa regras de acesso por linha (RLS): só funcionários ativos cadastrados leem os dados e só editores alteram.
- Os arquivos ficam em pasta privada; o sistema gera um link temporário (5 minutos) para abrir ou baixar.
- Quem tem conta no Supabase mas não está em Funcionários vê a tela "Sem acesso".
- Nunca coloque a chave `service_role` / `secret` no código.

## Limites do plano gratuito

O Supabase gratuito tem limites de armazenamento (arquivos e banco) e de tamanho por arquivo, e pode pausar projetos sem uso por um período. Confira os limites atuais no site antes de colocar toda a base de procedimentos.

## Rodar no computador (opcional)

```
npm install
npm run dev
```
