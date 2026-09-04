const express = require('express');
const { body, validationResult } = require('express-validator');
const eventoController = require('../controllers/eventoController');
const { requireAuth, requireTipo } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * Middleware interno: verifica o resultado das validações do express-validator
 * declaradas em cada rota. Em caso de falha, renderiza novamente o formulário
 * de evento (fluxo SSR) com os erros e os dados já preenchidos, em vez de
 * retornar JSON.
 *
 * @function validarFormularioEvento
 * @param {'criar'|'editar'} modo - Define qual formulário/rota reexibir.
 * @returns {import('express').RequestHandler} Middleware do Express.
 */
function validarFormularioEvento(modo) {
  return function (req, res, next) {
    const erros = validationResult(req);

    if (!erros.isEmpty()) {
      return res.status(400).render('eventos/form', {
        modo,
        evento: { _id: req.params.id },
        dados: req.body,
        erros: erros.array().map((item) => item.msg)
      });
    }

    return next();
  };
}

const validacoesEvento = [
  body('titulo').trim().notEmpty().withMessage('Título é obrigatório.'),
  body('descricao').trim().notEmpty().withMessage('Descrição é obrigatória.'),
  body('data_evento')
    .notEmpty().withMessage('Data do evento é obrigatória.')
    .isISO8601().withMessage('Data do evento inválida.'),
  body('local').trim().notEmpty().withMessage('Local é obrigatório.'),
  body('capacidade_maxima')
    .isInt({ min: 1 }).withMessage('Capacidade máxima deve ser um número inteiro maior ou igual a 1.')
];

// Visualização: requer apenas autenticação.
router.get('/', requireAuth, eventoController.listar);

// Formulário de criação — precisa vir ANTES de '/:id' para não ser
// interpretado como um ID de evento.
router.get('/novo', requireAuth, requireTipo('organizador'), eventoController.formCriar);

router.post(
  '/',
  requireAuth,
  requireTipo('organizador'),
  validacoesEvento,
  validarFormularioEvento('criar'),
  eventoController.criar
);

router.get('/:id', requireAuth, eventoController.detalhes);

router.get('/:id/editar', requireAuth, requireTipo('organizador'), eventoController.formEditar);

router.post(
  '/:id/editar',
  requireAuth,
  requireTipo('organizador'),
  validacoesEvento,
  validarFormularioEvento('editar'),
  eventoController.editar
);

router.post('/:id/excluir', requireAuth, requireTipo('organizador'), eventoController.excluir);

module.exports = router;
