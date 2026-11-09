const router = require('express').Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Table = require('../models/Table');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Luồng trạng thái hợp lệ
const FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['completed'],
};

// Khách đặt món (công khai). Body:
// { "tableId": 3, "items": [ { "productId": "...", "qty": 2,
//     "options": [ { "name": "Size", "choice": "M" } ], "note": "ít ngọt" } ] }
router.post('/', async (req, res) => {
  try {
    const { tableId, items: reqItems } = req.body;

    if (!Number.isInteger(tableId) || !(await Table.findOne({ number: tableId })))
      return res.status(400).json({ message: 'Bàn không hợp lệ' });
    if (!Array.isArray(reqItems) || reqItems.length === 0)
      return res.status(400).json({ message: 'Đơn hàng trống' });

    const items = [];
    let total = 0;
    for (const it of reqItems) {
      if (!mongoose.isValidObjectId(it.productId) || !Number.isInteger(it.qty) || it.qty < 1)
        return res.status(400).json({ message: 'Món hoặc số lượng không hợp lệ' });

      const p = await Product.findById(it.productId);
      if (!p || !p.available)
        return res.status(400).json({ message: `Món không khả dụng: ${p ? p.name : it.productId}` });

      items.push({
        productId: p._id,
        name: p.name,
        price: p.price, // giá lấy từ DB, bỏ qua giá client gửi
        qty: it.qty,
        options: it.options || [],
        note: it.note,
      });
      total += p.price * it.qty;
    }

    const order = await Order.create({ tableId, items, total });
    req.app.get('io').emit('order:new', order);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Danh sách đơn (bếp, admin): ?status=pending&tableId=3
router.get('/', auth, role('staff', 'admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.tableId) filter.tableId = Number(req.query.tableId);
    res.json(await Order.find(filter).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Khách theo dõi đơn (công khai)
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn' });
    res.json(order);
  } catch {
    res.status(400).json({ message: 'ID không hợp lệ' });
  }
});

// Bếp đổi trạng thái đơn
router.patch('/:id/status', auth, role('staff', 'admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn' });

    if (!FLOW[order.status]?.includes(req.body.status))
      return res.status(400).json({
        message: `Không thể chuyển từ ${order.status} sang ${req.body.status}`,
      });

    order.status = req.body.status;
    await order.save();
    req.app.get('io').emit('order:statusChanged', order);
    res.json(order);
  } catch {
    res.status(400).json({ message: 'ID không hợp lệ' });
  }
});

module.exports = router;