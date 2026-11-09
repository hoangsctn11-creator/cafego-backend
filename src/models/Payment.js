const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    method: { type: String, required: true }, // cash, momo, vnpay, card, fail
    amount: { type: Number, required: true },
    status: { type: String, enum: ['success', 'failed'], required: true },
    transactionCode: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);