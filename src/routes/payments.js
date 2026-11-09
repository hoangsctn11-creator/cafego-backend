const router = require('express').Router();
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const METHODS = ['cash', 'momo', 'vnpay', 'card', 'fail'];

// Thanh toán giả lập (công khai, khách thanh toán tại bàn)
// Body: { "method": "momo" }   (gửi "fail" để giả lập thất bại)
router.post('/:orderId', async (req, res) => {
  try {
    const { method } = req.body;
    if (!METHODS.includes(method))
      return res.status(400).json({ message: `method phải là một trong: ${METHODS.join(', ')}` });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn' });
    if (order.paymentStatus === 'paid')
      return res.status(400).json({ message: 'Đơn đã được thanh toán' });
    if (order.status === 'cancelled')
      return res.status(400).json({ message: 'Đơn đã bị hủy, không thể thanh toán' });

    const ok = method !== 'fail';
    const payment = await Payment.create({
      orderId: order._id,
      method,
      amount: order.total, // số tiền lấy từ đơn, không lấy từ client
      status: ok ? 'success' : 'failed',
      transactionCode: 'TXN' + Date.now(),
    });

    order.paymentStatus = ok ? 'paid' : 'failed';
    await order.save();

    req.app.get('io').emit('order:statusChanged', order);
    res.status(ok ? 201 : 402).json({ payment, order });
  } catch (err) {
    res.status(400).json({ message: 'ID không hợp lệ hoặc ' + err.message });
  }
});

// Lịch sử giao dịch của một đơn (bếp, admin)
router.get('/order/:orderId', auth, role('staff', 'admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId))
      return res.status(400).json({ message: 'ID không hợp lệ' });
    res.json(await Payment.find({ orderId: req.params.orderId }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toàn bộ giao dịch (admin)
router.get('/', auth, role('admin'), async (req, res) => {
  try {
    res.json(await Payment.find().sort({ createdAt: -1 }).limit(200));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;