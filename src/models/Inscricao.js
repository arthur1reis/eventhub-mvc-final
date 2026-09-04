const mongoose = require('mongoose');

const inscricaoSchema = new mongoose.Schema({
  evento_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Evento'
  },
  participante_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Usuario'
  },
  status: {
    type: String,
    required: true,
    enum: ['confirmada', 'cancelada'],
    default: 'confirmada'
  },
  criado_em: {
    type: Date,
    default: Date.now
  }
});

inscricaoSchema.index({ evento_id: 1, participante_id: 1 }, { unique: true });

module.exports = mongoose.model('Inscricao', inscricaoSchema);
