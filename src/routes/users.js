const router = require('express').Router();
const User = require('../models/User');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Danh sách người dùng (admin): ?role=customer&q=an
router.get('/', auth, role('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.q) {
      const re = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { email: re }, { phone: re }];
    }
    res.json(await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lịch sử đơn của một khách (admin)
router.get('/:id/orders', auth, role('admin'), async (req, res) => {
  try {
    res.json(await Order.find({ userId: req.params.id }).sort({ createdAt: -1 }));
  } catch {
    res.status(400).json({ message: 'ID không hợp lệ' });
  }
});

module.exports = router;