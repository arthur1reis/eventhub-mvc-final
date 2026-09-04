const express = require('express');
const inscricaoController = require('../controllers/inscricaoController');
const { requireAuth, requireTipo } = require('../middlewares/authMiddleware');

const router = express.Router();

// Somente participantes se inscrevem, cancelam ou consultam suas próprias
// inscrições. Usamos POST em vez de PATCH/DELETE porque os formulários HTML
// não suportam esses métodos nativamente — o comportamento de negócio
// (validações, autorização, controle de capacidade) permanece o mesmo.
router.post('/eventos/:eventoId/inscrever', requireAuth, requireTipo('participante'), inscricaoController.inscrever);
router.post('/inscricoes/:id/cancelar', requireAuth, requireTipo('participante'), inscricaoController.cancelar);
router.get('/inscricoes/minhas', requireAuth, requireTipo('participante'), inscricaoController.minhasInscricoes);

module.exports = router;
