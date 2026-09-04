const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const { setFlash } = require('../utils/flash');

const SALT_ROUNDS = 10;
const TIPOS_PERMITIDOS = ['organizador', 'participante'];

/**
 * Renderiza a página pública de login.
 * Se o usuário já estiver autenticado, redireciona direto para a lista de eventos.
 *
 * @function paginaLogin
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
function paginaLogin(req, res) {
  if (req.session && req.session.usuario) {
    return res.redirect('/eventos');
  }

  return res.render('auth/login', { dados: {} });
}

/**
 * Renderiza a página pública de registro.
 * Se o usuário já estiver autenticado, redireciona direto para a lista de eventos.
 *
 * @function paginaRegistro
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
function paginaRegistro(req, res) {
  if (req.session && req.session.usuario) {
    return res.redirect('/eventos');
  }

  return res.render('auth/registro', { dados: {} });
}

/**
 * Registra um novo usuário (organizador ou participante).
 * Normaliza o email, verifica duplicidade, gera o hash da senha com bcryptjs
 * e persiste o usuário. Nunca armazena ou retorna a senha original nem o hash.
 * Em caso de sucesso, redireciona para a página de login com mensagem de
 * confirmação (padrão Post/Redirect/Get). Em caso de erro de negócio
 * (ex.: email já cadastrado), renderiza novamente o formulário com os dados
 * já preenchidos (exceto a senha) e a mensagem de erro.
 *
 * @async
 * @function registrar
 * @param {import('express').Request} req - Espera `nome`, `email`, `senha` e `tipo` no body.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 * @throws {Error} Erros inesperados são capturados e renderizam o formulário com erro genérico.
 */
async function registrar(req, res) {
  const { nome, email, senha, tipo } = req.body;
  const dadosPreenchidos = { nome, email, tipo };

  try {
    if (!TIPOS_PERMITIDOS.includes(tipo)) {
      return res.status(400).render('auth/registro', {
        dados: dadosPreenchidos,
        erros: ['Tipo de usuário inválido.']
      });
    }

    const emailNormalizado = String(email).toLowerCase().trim();

    const usuarioExistente = await Usuario.findOne({ email: emailNormalizado });
    if (usuarioExistente) {
      return res.status(400).render('auth/registro', {
        dados: dadosPreenchidos,
        erros: ['Já existe um usuário cadastrado com este email.']
      });
    }

    const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);

    await Usuario.create({
      nome: String(nome).trim(),
      email: emailNormalizado,
      senha_hash,
      tipo
    });

    setFlash(req, 'sucesso', 'Conta criada com sucesso! Faça login para continuar.');
    return res.redirect('/login');
  } catch (error) {
    console.error('[authController.registrar] Erro:', error.message);
    return res.status(500).render('auth/registro', {
      dados: dadosPreenchidos,
      erros: ['Erro interno ao registrar usuário. Tente novamente.']
    });
  }
}

/**
 * Autentica um usuário existente e cria a sessão.
 * Compara a senha recebida com o `senha_hash` armazenado via bcryptjs.
 * Em caso de falha (email inexistente ou senha incorreta), renderiza
 * novamente a página de login com a mesma mensagem genérica, sem revelar
 * qual dado estava incorreto. Em caso de sucesso, redireciona para a
 * listagem de eventos.
 *
 * @async
 * @function login
 * @param {import('express').Request} req - Espera `email` e `senha` no body.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 * @throws {Error} Erros inesperados são capturados e renderizam o formulário com erro genérico.
 */
async function login(req, res) {
  const { email, senha } = req.body;
  const mensagemErroGenerica = 'Email ou senha inválidos.';

  try {
    const emailNormalizado = String(email).toLowerCase().trim();

    const usuario = await Usuario.findOne({ email: emailNormalizado });
    if (!usuario) {
      return res.status(401).render('auth/login', {
        dados: { email },
        erros: [mensagemErroGenerica]
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).render('auth/login', {
        dados: { email },
        erros: [mensagemErroGenerica]
      });
    }

    req.session.usuario = {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo
    };

    setFlash(req, 'sucesso', `Bem-vindo(a) de volta, ${usuario.nome}!`);
    return res.redirect('/eventos');
  } catch (error) {
    console.error('[authController.login] Erro:', error.message);
    return res.status(500).render('auth/login', {
      dados: { email },
      erros: ['Erro interno ao autenticar usuário. Tente novamente.']
    });
  }
}

/**
 * Encerra a sessão do usuário autenticado, removendo os dados do store
 * (MongoDB, via connect-mongo) e limpando o cookie de sessão no cliente.
 * Redireciona para a página de login.
 *
 * @async
 * @function logout
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 * @throws {Error} Erros ao destruir a sessão são registrados no log; o usuário
 *   ainda assim é redirecionado para o login.
 */
async function logout(req, res) {
  if (!req.session) {
    return res.redirect('/login');
  }

  req.session.destroy((erro) => {
    if (erro) {
      console.error('[authController.logout] Erro ao destruir sessão:', erro.message);
    }

    res.clearCookie('connect.sid');
    return res.redirect('/login');
  });
}

module.exports = { paginaLogin, paginaRegistro, registrar, login, logout };
