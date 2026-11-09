require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');
const User = require('./models/User');
const Table = require('./models/Table');
const Order = require('./models/Order');
const Payment = require('./models/Payment');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const [products, extras, cats, tables, orders, pays] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ description: 'Món thử' }),
    Category.countDocuments(),
    Table.countDocuments(),
    Order.countDocuments(),
    Payment.countDocuments(),
  ]);
  const customers = await User.countDocuments({ role: 'customer' });
  const withPhone = await User.countDocuments({ role: 'customer', phone: { $exists: true, $ne: '' } });
  const ordersWithUser = await Order.countDocuments({ userId: { $exists: true } });

  console.log(`Món: ${products} (cần 12), món thử còn lại: ${extras} (cần 0)`);
  console.log(`Danh mục: ${cats} (cần 4), bàn: ${tables} (cần 10)`);
  console.log(`Khách hàng: ${customers}, có số điện thoại: ${withPhone}`);
  console.log(`Đơn: ${orders}, đơn gắn khách: ${ordersWithUser}, giao dịch: ${pays}`);
  await mongoose.disconnect();
})();