const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    tableId: { type: Number, required: true }, // số bàn, lấy từ mã QR (?table=3)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [
      {
        _id: false,
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: String,
        price: Number,
        qty: { type: Number, required: true, min: 1 },
        options: [{ _id: false, name: String, choice: String }],
        note: String,
      },
    ],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed'], default: 'unpaid' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);