require('dotenv').config();

const createApp = require('./src/app');
const connectDatabase = require('./src/config/database');

const PORT = process.env.PORT || 3000;

/**
 * Ponto de entrada da aplicação: conecta ao MongoDB Atlas e inicia o
 * servidor HTTP somente após a conexão ser confirmada.
 *
 * @async
 * @function start
 * @returns {Promise<void>}
 */
async function start() {
  await connectDatabase();

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[EventHub] Servidor rodando na porta ${PORT}`);
  });
}

start();
