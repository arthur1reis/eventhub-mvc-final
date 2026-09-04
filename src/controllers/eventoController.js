const mongoose = require('mongoose');
const Evento = require('../models/Evento');
const Inscricao = require('../models/Inscricao');
const { setFlash } = require('../utils/flash');

/**
 * Lista todos os eventos, ordenados pela data do evento (mais próximos primeiro).
 * Traz apenas o nome do organizador via populate, sem expor dados sensíveis
 * como senha_hash. Também calcula, para cada evento, o total de inscrições
 * confirmadas e se o participante autenticado já está inscrito, para que a
 * view possa exibir vagas restantes e o selo "Inscrito".
 *
 * @async
 * @function listar
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} Renderiza a página `eventos/lista`.
 * @throws {Error} Erros inesperados são capturados e renderizam uma página de erro genérica.
 */
async function listar(req, res) {
  try {
    const eventos = await Evento.find()
      .sort({ data_evento: 1 })
      .populate('organizador_id', 'nome')
      .lean();

    const idsEventos = eventos.map((evento) => evento._id);

    const contagens = await Inscricao.aggregate([
      { $match: { evento_id: { $in: idsEventos }, status: 'confirmada' } },
      { $group: { _id: '$evento_id', total: { $sum: 1 } } }
    ]);
    const totalPorEvento = new Map(contagens.map((item) => [item._id.toString(), item.total]));

    let idsInscritosPeloUsuario = new Set();
    if (req.session.usuario.tipo === 'participante') {
      const inscricoesDoUsuario = await Inscricao.find({
        participante_id: req.session.usuario.id,
        status: 'confirmada'
      }).select('evento_id');
      idsInscritosPeloUsuario = new Set(inscricoesDoUsuario.map((i) => i.evento_id.toString()));
    }

    const eventosParaView = eventos.map((evento) => ({
      ...evento,
      totalConfirmadas: totalPorEvento.get(evento._id.toString()) || 0,
      inscricaoConfirmada: idsInscritosPeloUsuario.has(evento._id.toString())
    }));

    return res.render('eventos/lista', { eventos: eventosParaView });
  } catch (error) {
    console.error('[eventoController.listar] Erro:', error.message);
    return res.status(500).render('erros/erro', {
      titulo: 'Erro',
      codigo: 500,
      mensagem: 'Erro interno ao listar eventos.'
    });
  }
}

/**
 * Renderiza o formulário de criação de evento (somente organizador).
 *
 * @function formCriar
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
function formCriar(req, res) {
  return res.render('eventos/form', { modo: 'criar', dados: {} });
}

/**
 * Retorna os detalhes de um evento específico pelo seu ID, incluindo se o
 * usuário autenticado é o organizador dono do evento (para exibir ações de
 * editar/excluir) ou, se participante, se já possui inscrição confirmada
 * (para exibir a ação de inscrever-se/cancelar).
 *
 * @async
 * @function detalhes
 * @param {import('express').Request} req - Espera `id` do evento em `req.params`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} Renderiza a página `eventos/detalhes`.
 * @throws {Error} Erros inesperados são capturados e renderizam uma página de erro genérica.
 */
async function detalhes(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).render('erros/erro', {
        titulo: 'Requisição inválida',
        codigo: 400,
        mensagem: 'ID de evento inválido.'
      });
    }

    const evento = await Evento.findById(id).populate('organizador_id', 'nome');

    if (!evento) {
      return res.status(404).render('erros/erro', {
        titulo: 'Não encontrado',
        codigo: 404,
        mensagem: 'Evento não encontrado.'
      });
    }

    const totalConfirmadas = await Inscricao.countDocuments({ evento_id: id, status: 'confirmada' });
    const vagasRestantes = evento.capacidade_maxima - totalConfirmadas;

    const souOrganizadorDono = req.session.usuario.tipo === 'organizador'
      && evento.organizador_id._id.toString() === req.session.usuario.id.toString();

    let inscricaoConfirmada = false;
    let inscricaoId = null;
    if (req.session.usuario.tipo === 'participante') {
      const inscricao = await Inscricao.findOne({
        evento_id: id,
        participante_id: req.session.usuario.id,
        status: 'confirmada'
      });
      if (inscricao) {
        inscricaoConfirmada = true;
        inscricaoId = inscricao._id;
      }
    }

    return res.render('eventos/detalhes', {
      evento,
      vagasRestantes,
      souOrganizadorDono,
      inscricaoConfirmada,
      inscricaoId
    });
  } catch (error) {
    console.error('[eventoController.detalhes] Erro:', error.message);
    return res.status(500).render('erros/erro', {
      titulo: 'Erro',
      codigo: 500,
      mensagem: 'Erro interno ao buscar evento.'
    });
  }
}

/**
 * Cria um novo evento. Somente usuários com tipo 'organizador' podem criar
 * (garantido pelo middleware `requireTipo('organizador')` na rota).
 * O `organizador_id` é obtido exclusivamente de `req.session.usuario.id`,
 * nunca do corpo da requisição. Em caso de sucesso, redireciona para a
 * página de detalhes do evento recém-criado.
 *
 * @async
 * @function criar
 * @param {import('express').Request} req - Espera `titulo`, `descricao`,
 *   `data_evento`, `local` e `capacidade_maxima` no body (já validados pela rota).
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 * @throws {Error} Erros inesperados são capturados e renderizam o formulário com erro genérico.
 */
async function criar(req, res) {
  const { titulo, descricao, data_evento, local, capacidade_maxima } = req.body;

  try {
    const organizador_id = req.session.usuario.id;

    const novoEvento = await Evento.create({
      titulo: String(titulo).trim(),
      descricao: String(descricao).trim(),
      data_evento,
      local: String(local).trim(),
      capacidade_maxima,
      organizador_id
    });

    setFlash(req, 'sucesso', 'Evento criado com sucesso.');
    return res.redirect(`/eventos/${novoEvento._id}`);
  } catch (error) {
    console.error('[eventoController.criar] Erro:', error.message);
    return res.status(500).render('eventos/form', {
      modo: 'criar',
      dados: req.body,
      erros: ['Erro interno ao criar evento. Tente novamente.']
    });
  }
}

/**
 * Renderiza o formulário de edição de um evento existente.
 * Somente o organizador dono do evento pode acessar este formulário.
 *
 * @async
 * @function formEditar
 * @param {import('express').Request} req - Espera `id` do evento em `req.params`.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 * @throws {Error} Erros inesperados são capturados e renderizam uma página de erro genérica.
 */
async function formEditar(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).render('erros/erro', {
        titulo: 'Requisição inválida',
        codigo: 400,
        mensagem: 'ID de evento inválido.'
      });
    }

    const evento = await Evento.findById(id);

    if (!evento) {
      return res.status(404).render('erros/erro', {
        titulo: 'Não encontrado',
        codigo: 404,
        mensagem: 'Evento não encontrado.'
      });
    }

    if (evento.organizador_id.toString() !== req.session.usuario.id.toString()) {
      return res.status(403).render('erros/erro', {
        titulo: 'Acesso negado',
        codigo: 403,
        mensagem: 'Você não tem permissão para editar este evento.'
      });
    }

    // Formata a data para o formato aceito pelo input datetime-local (YYYY-MM-DDTHH:mm).
    const dataFormatada = new Date(evento.data_evento).toISOString().slice(0, 16);

    return res.render('eventos/form', {
      modo: 'editar',
      evento,
      dados: {
        titulo: evento.titulo,
        descricao: evento.descricao,
        data_evento: dataFormatada,
        local: evento.local,
        capacidade_maxima: evento.capacidade_maxima
      }
    });
  } catch (error) {
    console.error('[eventoController.formEditar] Erro:', error.message);
    return res.status(500).render('erros/erro', {
      titulo: 'Erro',
      codigo: 500,
      mensagem: 'Erro interno ao carregar evento para edição.'
    });
  }
}

/**
 * Edita um evento existente. Somente o organizador dono do evento pode editar.
 * Atualiza exclusivamente os campos permitidos (`titulo`, `descricao`,
 * `data_evento`, `local`, `capacidade_maxima`); qualquer `organizador_id`,
 * `_id` ou `criado_em` enviados no corpo da requisição são ignorados.
 * Em caso de sucesso, redireciona para a página de detalhes do evento.
 *
 * @async
 * @function editar
 * @param {import('express').Request} req - Espera `id` em `req.params` e os
 *   campos permitidos no body.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 * @throws {Error} Erros inesperados são capturados e renderizam o formulário com erro genérico.
 */
async function editar(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).render('erros/erro', {
        titulo: 'Requisição inválida',
        codigo: 400,
        mensagem: 'ID de evento inválido.'
      });
    }

    const evento = await Evento.findById(id);

    if (!evento) {
      return res.status(404).render('erros/erro', {
        titulo: 'Não encontrado',
        codigo: 404,
        mensagem: 'Evento não encontrado.'
      });
    }

    if (evento.organizador_id.toString() !== req.session.usuario.id.toString()) {
      return res.status(403).render('erros/erro', {
        titulo: 'Acesso negado',
        codigo: 403,
        mensagem: 'Você não tem permissão para editar este evento.'
      });
    }

    const { titulo, descricao, data_evento, local, capacidade_maxima } = req.body;

    evento.titulo = String(titulo).trim();
    evento.descricao = String(descricao).trim();
    evento.data_evento = data_evento;
    evento.local = String(local).trim();
    evento.capacidade_maxima = capacidade_maxima;

    await evento.save();

    setFlash(req, 'sucesso', 'Evento atualizado com sucesso.');
    return res.redirect(`/eventos/${evento._id}`);
  } catch (error) {
    console.error('[eventoController.editar] Erro:', error.message);
    return res.status(500).render('eventos/form', {
      modo: 'editar',
      evento: { _id: req.params.id },
      dados: req.body,
      erros: ['Erro interno ao editar evento. Tente novamente.']
    });
  }
}

/**
 * Exclui um evento existente. Somente o organizador dono do evento pode excluir.
 * Em caso de sucesso, redireciona para a listagem de eventos.
 *
 * @async
 * @function excluir
 * @param {import('express').Request} req - Espera `id` do evento em `req.params`.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 * @throws {Error} Erros inesperados são capturados e renderizam uma página de erro genérica.
 */
async function excluir(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).render('erros/erro', {
        titulo: 'Requisição inválida',
        codigo: 400,
        mensagem: 'ID de evento inválido.'
      });
    }

    const evento = await Evento.findById(id);

    if (!evento) {
      return res.status(404).render('erros/erro', {
        titulo: 'Não encontrado',
        codigo: 404,
        mensagem: 'Evento não encontrado.'
      });
    }

    if (evento.organizador_id.toString() !== req.session.usuario.id.toString()) {
      return res.status(403).render('erros/erro', {
        titulo: 'Acesso negado',
        codigo: 403,
        mensagem: 'Você não tem permissão para excluir este evento.'
      });
    }

    await evento.deleteOne();

    setFlash(req, 'sucesso', 'Evento excluído com sucesso.');
    return res.redirect('/eventos');
  } catch (error) {
    console.error('[eventoController.excluir] Erro:', error.message);
    return res.status(500).render('erros/erro', {
      titulo: 'Erro',
      codigo: 500,
      mensagem: 'Erro interno ao excluir evento.'
    });
  }
}

module.exports = { listar, formCriar, detalhes, criar, formEditar, editar, excluir };
