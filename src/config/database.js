const mongoose = require('mongoose');

/**
 * Estabelece a conexão com o MongoDB Atlas usando Mongoose.
 * Lê a string de conexão da variável de ambiente MONGODB_URI.
 *
 * @async
 * @function connectDatabase
 * @returns {Promise<void>} Resolve quando a conexão é estabelecida com sucesso.
 * @throws {Error} Encerra o processo (exit code 1) caso a variável de ambiente
 *                 não esteja definida ou a conexão falhe.
 */
async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('A variável de ambiente MONGODB_URI não foi definida.');
    }

    await mongoose.connect(mongoUri);

    console.log('[MongoDB] Conexão estabelecida com sucesso.');
  } catch (error) {
    console.error('[MongoDB] Falha ao conectar:', error.message);
    process.exit(1);
  }
}

module.exports = connectDatabase;
