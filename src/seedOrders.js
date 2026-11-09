require('dotenv').config();
const mongoose = require('mongoose');

const Order = require('./models/Order');
const Payment = require('./models/Payment');
const Product = require('./models/Product');
const Table = require('./models/Table');
const User = require('./models/User');

const METHODS = ['cash', 'momo', 'vnpay', 'card'];
const rand = (n) => Math.floor(Math.random() * n);

async function seedOrders() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Đã kết nối MongoDB Atlas');

  const products = await Product.find({ available: true });
  const tables = await Table.find();
  const customers = await User.find({ role: 'customer' });
  if (!products.length || !tables.length) {
    console.log('Chưa có món hoặc bàn. Hãy chạy: node src/seed.js');
    return mongoose.disconnect();
  }

  // Xóa đơn và giao dịch cũ để chạy lại nhiều lần không bị nhân đôi
  await Promise.all([Order.deleteMany(), Payment.deleteMany()]);

  let paid = 0, unpaid = 0, failed = 0, withUser = 0;

  // 20 đơn rải trong 7 ngày gần nhất
  for (let i = 0; i < 20; i++) {
    const createdAt = new Date(Date.now() - rand(7) * 86400000 - rand(12) * 3600000);

    const items = [];
    let total = 0;
    for (let k = 0; k < 1 + rand(3); k++) {
      const p = products[rand(products.length)];
      const qty = 1 + rand(3);
      items.push({ productId: p._id, name: p.name, price: p.price, qty, options: [] });
      total += p.price * qty;
    }

    // ~75% đã thanh toán, ~15% chưa, ~10% thất bại
    const r = Math.random();
    const kind = r < 0.75 ? 'paid' : r < 0.9 ? 'unpaid' : 'failed';

    // ~70% đơn gắn với một khách hàng, còn lại là khách vãng lai quét QR
    const userId =
      customers.length && Math.random() < 0.7
        ? customers[rand(customers.length)]._id
        : undefined;
    if (userId) withUser++;

    const order = await Order.create({
      tableId: tables[rand(tables.length)].number,
      userId,
      items,
      total,
      status: kind === 'paid' ? 'completed' : 'pending',
      paymentStatus: kind,
      createdAt,
    });

    if (kind !== 'unpaid') {
      await Payment.create({
        orderId: order._id,
        method: kind === 'failed' ? 'fail' : METHODS[rand(METHODS.length)],
        amount: total,
        status: kind === 'paid' ? 'success' : 'failed',
        transactionCode: 'TXN' + createdAt.getTime() + i,
        createdAt,
      });
    }

    if (kind === 'paid') paid++;
    else if (kind === 'unpaid') unpaid++;
    else failed++;
  }

  console.log(`Xong: ${paid} đơn đã thanh toán, ${unpaid} chưa thanh toán, ${failed} thất bại`);
  console.log(`${withUser}/20 đơn gắn với khách hàng`);
  await mongoose.disconnect();
}

seedOrders().catch((err) => {
  console.error('Lỗi:', err);
  process.exit(1);
});