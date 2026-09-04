# EventHub

Sistema de Gestão de Eventos e Inscrições — aplicação **monolítica MVC** com renderização no servidor (**Server-Side Rendering**), desenvolvida para a atividade *Sistema Integrado de Gestão Web (MVC & REST)*.

O EventHub permite que **organizadores** criem, editem e excluam seus próprios eventos, e que **participantes** naveguem pelos eventos disponíveis, se inscrevam e cancelem suas inscrições — tudo em páginas renderizadas pelo próprio servidor Express, sem front-end separado.

> Este repositório cobre apenas a **Aplicação 1 (EventHub)**. A **Aplicação 2 (HelpDesk API + front-end)** é um projeto separado, ainda não iniciado.

---

## Arquitetura

O projeto segue o padrão **MVC (Model-View-Controller)** com renderização server-side via **EJS**:

- **Model** — Schemas Mongoose (`Usuario`, `Evento`, `Inscricao`) responsáveis pela validação de dados e comunicação com o MongoDB.
- **View** — Templates EJS que renderizam HTML no servidor e são enviados prontos ao navegador. Não há SPA, React ou chamadas assíncronas de dados: cada ação do usuário é uma navegação de página (ou um `POST` seguido de `redirect`, padrão **Post/Redirect/Get**).
- **Controller** — Contém a lógica de negócio, validação de autorização e decide o que renderizar (`res.render`) ou para onde redirecionar (`res.redirect`) após cada ação.
- **Routes** — Mapeiam URLs e métodos HTTP para os controllers, aplicando os middlewares de autenticação/autorização e validação antes de chegar à lógica de negócio.
- **Middlewares** — `requireAuth` (exige sessão ativa) e `requireTipo` (exige um tipo específico de usuário: `organizador` ou `participante`).

Fluxo típico de uma ação que altera dados (ex.: criar evento):

```
Formulário HTML (view)
   → POST /eventos (route)
   → requireAuth + requireTipo('organizador') (middleware)
   → validação dos campos (express-validator)
   → eventoController.criar (lógica de negócio + Mongoose)
   → res.redirect('/eventos/:id') com mensagem flash de sucesso/erro
```

---

## Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js + Express |
| Views / SSR | EJS |
| Banco de dados | MongoDB Atlas (via Mongoose) |
| Autenticação | express-session + connect-mongo (sessão persistida no Mongo) |
| Hash de senha | bcryptjs |
| Validação de formulários | express-validator |
| Variáveis de ambiente | dotenv |
| Estilo | CSS próprio (`public/css/style.css`), sem frameworks de UI |
| Dev tooling | nodemon |

---

## Estrutura de pastas

```
eventhub-mvc/
├── public/
│   └── css/
│       └── style.css          # estilos globais (navbar, cards, formulários, tabelas)
├── src/
│   ├── config/
│   │   └── database.js        # conexão com MongoDB Atlas via Mongoose
│   ├── controllers/
│   │   ├── authController.js       # login, registro, logout
│   │   ├── eventoController.js     # CRUD de eventos
│   │   └── inscricaoController.js  # inscrição, cancelamento, "minhas inscrições"
│   ├── middlewares/
│   │   └── authMiddleware.js  # requireAuth / requireTipo
│   ├── models/
│   │   ├── Usuario.js
│   │   ├── Evento.js
│   │   └── Inscricao.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── eventoRoutes.js
│   │   └── inscricaoRoutes.js
│   ├── utils/
│   │   └── flash.js           # mensagens flash (sucesso/erro) entre redirects
│   ├── views/
│   │   ├── partials/          # header, navbar, footer, mensagens (componentes reutilizados)
│   │   ├── auth/               # login.ejs, registro.ejs
│   │   ├── eventos/            # lista.ejs, detalhes.ejs, form.ejs
│   │   ├── inscricoes/         # minhas.ejs
│   │   └── erros/              # erro.ejs (páginas 400/403/404/500)
│   └── app.js                 # configuração do Express (middlewares, view engine, rotas)
├── .env.example
├── .gitignore
├── package.json
└── server.js                  # ponto de entrada: conecta ao banco e sobe o servidor
```

---

## Requisitos

- Node.js 18 ou superior
- Uma conta e um cluster no [MongoDB Atlas](https://www.mongodb.com/atlas) (ou outra instância MongoDB acessível)

---

## Como executar localmente

1. Clone o repositório e acesse a pasta do projeto:
   ```bash
   git clone <url-do-repositorio>
   cd eventhub-mvc
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Copie o arquivo de exemplo de variáveis de ambiente e preencha com seus próprios valores:
   ```bash
   cp .env.example .env
   ```

4. Rode em modo desenvolvimento (reinicia automaticamente ao salvar arquivos, via `nodemon`):
   ```bash
   npm run dev
   ```

   Ou em modo produção:
   ```bash
   npm start
   ```

5. Acesse `http://localhost:3000` (ou a porta configurada em `PORT`).

---

## Variáveis de ambiente (`.env`)

Todas as variáveis abaixo são lidas via `process.env` e **nenhuma delas possui valor padrão sensível no código** — a aplicação falha explicitamente se `MONGODB_URI` não estiver definida.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | Não (padrão `3000`) | Porta em que o servidor Express é iniciado localmente. |
| `MONGODB_URI` | **Sim** | String de conexão do MongoDB Atlas. Formato: `mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/<banco>?retryWrites=true&w=majority`. |
| `NODE_ENV` | Não (padrão `development`) | `development` ou `production`. Em produção, o cookie de sessão exige HTTPS (`secure: true`). |
| `SESSION_SECRET` | **Sim** | Segredo usado para assinar o cookie de sessão. Deve ser uma string longa e aleatória, diferente entre ambientes. |

O arquivo `.env.example` já traz todas essas chaves, **sem nenhum valor real**, e serve apenas como referência — ele é seguro para ser versionado no Git.

> ⚠️ **O arquivo `.env` (com credenciais reais) nunca deve ser versionado.** Ele já está listado no `.gitignore` deste projeto.

---

## Principais rotas

### Públicas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/login` | Página de login |
| POST | `/auth/login` | Processa o login e cria a sessão |
| GET | `/registro` | Página de criação de conta (organizador ou participante) |
| POST | `/auth/registro` | Processa o cadastro do usuário |
| POST | `/auth/logout` | Encerra a sessão e limpa o cookie |

### Autenticadas (qualquer tipo de usuário)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/eventos` | Lista todos os eventos |
| GET | `/eventos/:id` | Detalhes de um evento |

### Organizador

| Método | Rota | Descrição |
|---|---|---|
| GET | `/eventos/novo` | Formulário de criação de evento |
| POST | `/eventos` | Cria um novo evento |
| GET | `/eventos/:id/editar` | Formulário de edição (somente o dono do evento) |
| POST | `/eventos/:id/editar` | Salva a edição (somente o dono do evento) |
| POST | `/eventos/:id/excluir` | Exclui o evento (somente o dono do evento) |

### Participante

| Método | Rota | Descrição |
|---|---|---|
| POST | `/eventos/:eventoId/inscrever` | Inscreve o participante no evento (respeita capacidade máxima e evita duplicidade) |
| POST | `/inscricoes/:id/cancelar` | Cancela uma inscrição do próprio participante |
| GET | `/inscricoes/minhas` | Lista as inscrições (confirmadas e canceladas) do participante autenticado |

### Diversos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Health check (usado para confirmar que o servidor está no ar após o deploy) |

Como a aplicação é totalmente SSR, `PUT`/`PATCH`/`DELETE` foram substituídos por rotas `POST` dedicadas (ex.: `/eventos/:id/editar`, `/eventos/:id/excluir`), já que formulários HTML não suportam esses métodos nativamente.

---

## Autenticação e sessão

- A autenticação é feita por **sessão**, usando `express-session` com armazenamento persistente no MongoDB (`connect-mongo`) — as sessões sobrevivem a reinícios do servidor.
- O cookie de sessão (`connect.sid`) é configurado com:
  - `httpOnly: true` — inacessível via JavaScript no navegador, mitigando roubo de sessão via XSS;
  - `secure: true` em produção (`NODE_ENV=production`) — o cookie só trafega em conexões HTTPS;
  - `sameSite: 'lax'`;
  - expiração de 2 horas.
- A sessão guarda **apenas** os dados mínimos do usuário: `{ id, nome, email, tipo }`. A senha (mesmo em hash) nunca é armazenada na sessão nem exposta em nenhuma view.
- As senhas são armazenadas com hash via **bcryptjs** (nunca em texto puro).
- Autorização por tipo de usuário é feita pelo middleware `requireTipo('organizador' | 'participante')`; a posse do recurso (ex.: "este evento é seu?") é verificada dentro do controller, comparando `evento.organizador_id` com `req.session.usuario.id`.
- Usuário não autenticado que tenta acessar uma página protegida é redirecionado para `/login`; usuário autenticado do tipo errado recebe uma página de erro 403.

---

## Deploy

O EventHub é um serviço Node.js único (sem build step) e pode ser publicado em qualquer plataforma de Web Service, como **Render**, **Railway** ou **Fly.io**. Passos gerais:

1. Suba o repositório para o GitHub (confirme que `.env` **não** foi commitado — veja o `.gitignore`).
2. Crie um cluster no MongoDB Atlas e libere o acesso de rede (ou `0.0.0.0/0` para simplificar, conforme a política da sua instituição).
3. Crie um novo Web Service na plataforma escolhida, apontando para o repositório.
4. Configure o **Build Command**: `npm install`.
5. Configure o **Start Command**: `npm start`.
6. Cadastre as variáveis de ambiente no painel da plataforma (nunca no código):
   - `MONGODB_URI`
   - `SESSION_SECRET`
   - `NODE_ENV=production`
   - `PORT` (algumas plataformas definem automaticamente; se não, defina `3000` ou a porta exigida pelo serviço)
7. Após o deploy, acesse `/health` para confirmar que o servidor subiu e, em seguida, teste o fluxo completo (registro, login, criação de evento, inscrição) na URL pública.

---

## Segurança — resumo

- ✅ Senhas com hash via `bcryptjs`, nunca em texto puro.
- ✅ Sessão com cookie `httpOnly`, `secure` em produção, e `SESSION_SECRET` fora do código-fonte.
- ✅ Autorização por tipo de usuário (`requireTipo`) e por posse do recurso (checada nos controllers).
- ✅ Validação/sanitização de entradas com `express-validator` (`trim`, `isEmail`, `isISO8601`, `isInt`, `normalizeEmail`) e normalização adicional nos controllers.
- ✅ Nenhuma credencial hardcoded — tudo lido via `process.env`, com `.env` fora do controle de versão.
- ✅ Erros inesperados são logados no servidor (`console.error`) mas nunca expõem stack trace ou detalhes internos ao usuário; a página de erro exibe apenas uma mensagem genérica.
- ✅ Views usam `<%= %>` (escapado) para qualquer dado vindo do usuário/banco, prevenindo XSS. O uso de `<%- %>` fica restrito a `include()` de partials confiáveis do próprio projeto.
- ✅ Prevenção de NoSQL Injection via Mongoose Schemas (sem concatenação de strings em queries).

---

## Licença

Projeto acadêmico, sem licença comercial associada.