const mongoose = require('mongoose');

const eventoSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  descricao: {
    type: String,
    required: true,
    trim: true
  },
  data_evento: {
    type: Date,
    required: true
  },
  local: {
    type: String,
    required: true,
    trim: true
  },
  capacidade_maxima: {
    type: Number,
    required: true,
    min: 1
  },
  organizador_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Usuario'
  },
  criado_em: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Evento', eventoSchema);
