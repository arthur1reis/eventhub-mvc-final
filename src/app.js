const path = require('path');
const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const authRoutes = require('./routes/authRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const inscricaoRoutes = require('./routes/inscricaoRoutes');
const { flashMiddleware } = require('./utils/flash');

/**
 * Cria e configura a instância principal do Express, incluindo a camada de
 * apresentação Server-Side Rendered (EJS) implementada na Etapa 8.
 *
 * @function createApp
 * @returns {import('express').Express} Instância configurada do Express.
 */
function createApp() {
  const app = express();

  // ---- Views (EJS) ----
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // ---- Arquivos estáticos (CSS) ----
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const isProducao = process.env.NODE_ENV === 'production';

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessoes'
    }),
    cookie: {
      httpOnly: true,
      secure: isProducao,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 2 // 2 horas
    }
  }));

  // Disponibiliza `res.locals.usuarioLogado` e `res.locals.flash` para
  // todas as views (navbar, alertas de sucesso/erro etc.).
  app.use(flashMiddleware);

  /**
   * Rota de verificação de saúde da aplicação.
   * Útil para validar localmente e após o deploy no Render que o
   * servidor está no ar.
   */
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      app: 'EventHub',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Página inicial: participantes e organizadores autenticados são
   * direcionados para a listagem de eventos; visitantes, para o login.
   */
  app.get('/', (req, res) => {
    if (req.session && req.session.usuario) {
      return res.redirect('/eventos');
    }
    return res.redirect('/login');
  });

  // authRoutes expõe GET /login, GET /registro e as ações POST /auth/*.
  app.use('/', authRoutes);
  app.use('/eventos', eventoRoutes);
  app.use('/', inscricaoRoutes);

  // ---- 404: rota não encontrada ----
  app.use((req, res) => {
    res.status(404).render('erros/erro', {
      titulo: 'Página não encontrada',
      codigo: 404,
      mensagem: 'A página que você procura não existe.'
    });
  });

  // ---- Tratamento de erros não capturados ----
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[app] Erro não tratado:', err.message);
    res.status(500).render('erros/erro', {
      titulo: 'Erro interno',
      codigo: 500,
      mensagem: 'Ocorreu um erro inesperado. Tente novamente.'
    });
  });

  return app;
}

module.exports = createApp;
