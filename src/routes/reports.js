const router = require('express').Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const TZ = 'Asia/Ho_Chi_Minh';

// Đổi ?from=2026-11-01&to=2026-11-09 thành khoảng thời gian (giờ Việt Nam).
// Không truyền thì mặc định 30 ngày gần nhất.
function parseRange(query) {
  const to = query.to ? new Date(`${query.to}T23:59:59.999+07:00`) : new Date();
  const from = query.from
    ? new Date(`${query.from}T00:00:00+07:00`)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (isNaN(from) || isNaN(to)) return null;
  return { from, to };
}

// Doanh thu theo ngày
router.get('/revenue', auth, role('admin'), async (req, res) => {
  try {
    const range = parseRange(req.query);
    if (!range) return res.status(400).json({ message: 'from/to phải có dạng YYYY-MM-DD' });

    const data = await Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
    ]);

    const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = data.reduce((s, d) => s + d.orders, 0);
    res.json({ from: range.from, to: range.to, totalRevenue, totalOrders, days: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Món bán chạy: ?from=&to=&limit=5
router.get('/top-products', auth, role('admin'), async (req, res) => {
  try {
    const range = parseRange(req.query);
    if (!range) return res.status(400).json({ message: 'from/to phải có dạng YYYY-MM-DD' });
    const limit = Math.min(Number(req.query.limit) || 5, 50);

    const data = await Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: range.from, $lte: range.to } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: limit },
      { $project: { _id: 0, productId: '$_id', name: 1, quantity: 1, revenue: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Tổng quan hôm nay: doanh thu, số đơn đã thanh toán, số đơn theo trạng thái
router.get('/summary', auth, role('admin'), async (req, res) => {
  try {
    const now = new Date();
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const day = vnNow.toISOString().slice(0, 10); // ngày hiện tại theo giờ VN
    const start = new Date(`${day}T00:00:00+07:00`);

    const [paid, byStatus] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: start } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      date: day,
      revenue: paid[0]?.revenue || 0,
      paidOrders: paid[0]?.orders || 0,
      ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;