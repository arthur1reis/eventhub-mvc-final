/**
 * Utilitário simples de mensagens "flash" (uma única exibição) para o
 * fluxo Server-Side Rendered do EventHub.
 *
 * Como as views são renderizadas após um redirect (padrão Post/Redirect/Get),
 * usamos a própria sessão (já configurada com express-session/connect-mongo)
 * para guardar a mensagem por uma única requisição, evitando a necessidade
 * de uma dependência extra como connect-flash.
 */

/**
 * Grava uma mensagem flash na sessão, para ser exibida na próxima página
 * renderizada após um redirect.
 *
 * @function setFlash
 * @param {import('express').Request} req
 * @param {'sucesso'|'erro'} tipo - Categoria da mensagem (define o estilo do alerta).
 * @param {string} mensagem - Texto a ser exibido ao usuário.
 * @returns {void}
 */
function setFlash(req, tipo, mensagem) {
  if (!req.session) return;
  req.session.flash = { tipo, mensagem };
}

/**
 * Middleware global: lê a mensagem flash gravada na sessão (se existir),
 * disponibiliza em `res.locals.flash` para as views e a remove da sessão
 * em seguida, garantindo que apareça apenas uma vez.
 * Também disponibiliza `res.locals.usuarioLogado` com os dados mínimos do
 * usuário autenticado (ou `null`), para uso na navbar e nas views em geral.
 *
 * @function flashMiddleware
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
function flashMiddleware(req, res, next) {
  res.locals.flash = (req.session && req.session.flash) || null;
  res.locals.usuarioLogado = (req.session && req.session.usuario) || null;

  if (req.session && req.session.flash) {
    delete req.session.flash;
  }

  return next();
}

module.exports = { setFlash, flashMiddleware };
