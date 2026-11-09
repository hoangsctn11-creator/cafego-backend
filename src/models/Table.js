const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    qrCode: { type: String },
    status: { type: String, enum: ['available', 'occupied'], default: 'available' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', tableSchema);