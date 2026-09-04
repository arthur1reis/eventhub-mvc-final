const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

const TIPOS_PERMITIDOS = ['organizador', 'participante'];

/**
 * Middleware interno: verifica o resultado das validações do express-validator
 * declaradas em cada rota. Em caso de falha, renderiza novamente o formulário
 * correspondente (fluxo SSR) com os erros e os dados já preenchidos pelo
 * usuário, em vez de retornar JSON.
 *
 * @function validarFormulario
 * @param {string} view - Caminho da view a ser renderizada em caso de erro.
 * @returns {import('express').RequestHandler} Middleware do Express.
 */
function validarFormulario(view) {
  return function (req, res, next) {
    const erros = validationResult(req);

    if (!erros.isEmpty()) {
      return res.status(400).render(view, {
        dados: req.body,
        erros: erros.array().map((item) => item.msg)
      });
    }

    return next();
  };
}

// Páginas públicas (GET) montadas na raiz da aplicação — ver src/app.js.
router.get('/login', authController.paginaLogin);
router.get('/registro', authController.paginaRegistro);

// Ações de formulário (POST), montadas em /auth — mesmos caminhos já
// validados nas etapas anteriores (POST /auth/registro, /auth/login, /auth/logout).
router.post(
  '/auth/registro',
  [
    body('nome').trim().notEmpty().withMessage('Nome é obrigatório.'),
    body('email').trim().isEmail().withMessage('Email inválido.').normalizeEmail(),
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres.'),
    body('tipo').isIn(TIPOS_PERMITIDOS).withMessage('Tipo deve ser organizador ou participante.')
  ],
  validarFormulario('auth/registro'),
  authController.registrar
);

router.post(
  '/auth/login',
  [
    body('email').trim().isEmail().withMessage('Email inválido.').normalizeEmail(),
    body('senha').notEmpty().withMessage('Senha é obrigatória.')
  ],
  validarFormulario('auth/login'),
  authController.login
);

router.post('/auth/logout', authController.logout);

module.exports = router;
