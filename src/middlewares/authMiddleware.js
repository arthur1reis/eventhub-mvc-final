const { setFlash } = require('../utils/flash');

/**
 * Middleware que garante que a requisição possui uma sessão autenticada.
 * Caso não exista `req.session.usuario`, redireciona para a página de login
 * com uma mensagem flash explicando o motivo (fluxo Server-Side Rendered).
 * Não expõe nenhuma informação sensível.
 *
 * @function requireAuth
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.usuario) {
    setFlash(req, 'erro', 'Você precisa fazer login para acessar esta página.');
    return res.redirect('/login');
  }

  return next();
}

/**
 * Cria um middleware que restringe o acesso a determinados tipos de usuário
 * (ex.: 'organizador', 'participante'). Deve ser usado depois de `requireAuth`,
 * ou em conjunto, pois também valida a existência da sessão.
 *
 * Em caso de acesso não autorizado, renderiza uma página de erro 403 em vez
 * de retornar JSON, mantendo o fluxo Server-Side Rendered.
 *
 * Uso: router.get('/rota', requireTipo('organizador'), controller.metodo)
 *
 * @function requireTipo
 * @param {...string} tiposPermitidos - Tipos de usuário autorizados a acessar a rota.
 * @returns {import('express').RequestHandler} Middleware do Express.
 */
function requireTipo(...tiposPermitidos) {
  return function (req, res, next) {
    if (!req.session || !req.session.usuario) {
      setFlash(req, 'erro', 'Você precisa fazer login para acessar esta página.');
      return res.redirect('/login');
    }

    if (!tiposPermitidos.includes(req.session.usuario.tipo)) {
      return res.status(403).render('erros/erro', {
        titulo: 'Acesso negado',
        codigo: 403,
        mensagem: 'Você não tem permissão para acessar esta página.'
      });
    }

    return next();
  };
}

module.exports = { requireAuth, requireTipo };
