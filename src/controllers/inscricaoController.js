const mongoose = require('mongoose');
const Inscricao = require('../models/Inscricao');
const Evento = require('../models/Evento');
const { setFlash } = require('../utils/flash');

/**
 * Inscreve o participante autenticado em um evento.
 * Respeita a capacidade máxima do evento e impede inscrição duplicada.
 * Caso o participante já tenha tido uma inscrição cancelada para o mesmo
 * evento, ela é reativada (status volta para 'confirmada') em vez de criar
 * um novo documento — o índice único `{ evento_id, participante_id }` do
 * Model não permite duas linhas para o mesmo par, então o histórico é
 * mantido reutilizando o mesmo registro.
 * Ao final, redireciona de volta para a página de detalhes do evento com
 * uma mensagem de sucesso ou erro.
 *
 * @async
 * @function inscrever
 * @param {import('express').Request} req - Espera `eventoId` em `req.params`.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 * @throws {Error} Erros inesperados são capturados e resultam em redirect com mensagem de erro.
 */
async function inscrever(req, res) {
  const { eventoId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(eventoId)) {
      return res.status(400).render('erros/erro', {
        titulo: 'Requisição inválida',
        codigo: 400,
        mensagem: 'ID de evento inválido.'
      });
    }

    const evento = await Evento.findById(eventoId);
    if (!evento) {
      return res.status(404).render('erros/erro', {
        titulo: 'Não encontrado',
        codigo: 404,
        mensagem: 'Evento não encontrado.'
      });
    }

    const participante_id = req.session.usuario.id;

    const inscricaoExistente = await Inscricao.findOne({
      evento_id: eventoId,
      participante_id
    });

    if (inscricaoExistente && inscricaoExistente.status === 'confirmada') {
      setFlash(req, 'erro', 'Você já está inscrito neste evento.');
      return res.redirect(`/eventos/${eventoId}`);
    }

    const totalConfirmadas = await Inscricao.countDocuments({
      evento_id: eventoId,
      status: 'confirmada'
    });

    if (totalConfirmadas >= evento.capacidade_maxima) {
      setFlash(req, 'erro', 'Capacidade máxima do evento atingida.');
      return res.redirect(`/eventos/${eventoId}`);
    }

    if (inscricaoExistente) {
      // Reativa a inscrição cancelada anteriormente, mantendo o mesmo documento/histórico.
      inscricaoExistente.status = 'confirmada';
      await inscricaoExistente.save();
    } else {
      await Inscricao.create({
        evento_id: eventoId,
        participante_id,
        status: 'confirmada'
      });
    }

    setFlash(req, 'sucesso', 'Inscrição confirmada com sucesso!');
    return res.redirect(`/eventos/${eventoId}`);
  } catch (error) {
    console.error('[inscricaoController.inscrever] Erro:', error.message);
    setFlash(req, 'erro', 'Erro interno ao processar inscrição.');
    return res.redirect(`/eventos/${eventoId}`);
  }
}

/**
 * Cancela uma inscrição do participante autenticado.
 * Não remove o documento do banco — apenas altera `status` para 'cancelada',
 * preservando o histórico da inscrição. Redireciona de volta para a página
 * de origem (detalhes do evento ou "Minhas inscrições").
 *
 * @async
 * @function cancelar
 * @param {import('express').Request} req - Espera `id` da inscrição em `req.params`.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 * @throws {Error} Erros inesperados são capturados e resultam em redirect com mensagem de erro.
 */
async function cancelar(req, res) {
  const destinoPadrao = '/inscricoes/minhas';

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).render('erros/erro', {
        titulo: 'Requisição inválida',
        codigo: 400,
        mensagem: 'ID de inscrição inválido.'
      });
    }

    const inscricao = await Inscricao.findById(id);

    if (!inscricao) {
      return res.status(404).render('erros/erro', {
        titulo: 'Não encontrado',
        codigo: 404,
        mensagem: 'Inscrição não encontrada.'
      });
    }

    if (inscricao.participante_id.toString() !== req.session.usuario.id.toString()) {
      return res.status(403).render('erros/erro', {
        titulo: 'Acesso negado',
        codigo: 403,
        mensagem: 'Você não tem permissão para cancelar esta inscrição.'
      });
    }

    if (inscricao.status === 'cancelada') {
      setFlash(req, 'erro', 'Esta inscrição já está cancelada.');
      return res.redirect(destinoPadrao);
    }

    inscricao.status = 'cancelada';
    await inscricao.save();

    setFlash(req, 'sucesso', 'Inscrição cancelada com sucesso.');
    return res.redirect(destinoPadrao);
  } catch (error) {
    console.error('[inscricaoController.cancelar] Erro:', error.message);
    setFlash(req, 'erro', 'Erro interno ao cancelar inscrição.');
    return res.redirect(destinoPadrao);
  }
}

/**
 * Lista todas as inscrições do participante autenticado (confirmadas e
 * canceladas), com os principais dados do evento relacionado, e renderiza
 * a página "Minhas inscrições".
 *
 * @async
 * @function minhasInscricoes
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 * @throws {Error} Erros inesperados são capturados e renderizam uma página de erro genérica.
 */
async function minhasInscricoes(req, res) {
  try {
    const participante_id = req.session.usuario.id;

    const inscricoes = await Inscricao.find({ participante_id })
      .sort({ criado_em: -1 })
      .populate('evento_id', 'titulo data_evento local');

    return res.render('inscricoes/minhas', { inscricoes });
  } catch (error) {
    console.error('[inscricaoController.minhasInscricoes] Erro:', error.message);
    return res.status(500).render('erros/erro', {
      titulo: 'Erro',
      codigo: 500,
      mensagem: 'Erro interno ao listar inscrições.'
    });
  }
}

module.exports = { inscrever, cancelar, minhasInscricoes };
