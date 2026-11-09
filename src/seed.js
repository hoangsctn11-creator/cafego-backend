require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Table = require('./models/Table'); // nếu bạn để Table chung file Payment thì sửa lại đường dẫn

// Nếu Product.category của bạn là ObjectId (ref Category) thì để true,
// nếu là String (tên danh mục) thì để false
const CATEGORY_IS_REF = true;

const SIZE = { name: 'Size', choices: ['S', 'M', 'L'] };
const SUGAR = { name: 'Đường', choices: ['0%', '30%', '50%', '70%', '100%'] };
const ICE = { name: 'Đá', choices: ['Không đá', 'Ít đá', 'Bình thường'] };
const DRINK_OPTS = [SIZE, SUGAR, ICE];

const data = {
  'Cà phê': [
    ['Cà phê đen', 25000], ['Cà phê sữa', 29000], ['Bạc xỉu', 32000],
    ['Cappuccino', 45000], ['Latte', 45000], ['Americano', 39000],
  ],
  'Trà': [
    ['Trà đào cam sả', 42000], ['Trà vải', 39000], ['Trà sen vàng', 40000],
    ['Trà chanh', 29000], ['Trà xanh matcha', 45000],
  ],
  'Sinh tố': [
    ['Sinh tố bơ', 45000], ['Sinh tố xoài', 42000], ['Sinh tố dâu', 42000],
    ['Sinh tố mãng cầu', 45000], ['Nước ép cam', 38000],
  ],
  'Bánh': [
    ['Bánh tiramisu', 42000], ['Bánh croissant', 32000], ['Bánh cheesecake', 45000],
    ['Bánh brownie', 35000], ['Bánh muffin socola', 30000],
  ],
  'Đá xay': [
    ['Cookie đá xay', 49000], ['Matcha đá xay', 49000], ['Cà phê đá xay', 47000],
  ],
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Đã kết nối MongoDB Atlas');

  // 1. Xóa dữ liệu cũ (chạy lại nhiều lần không bị trùng)
  await Promise.all([User.deleteMany(), Category.deleteMany(), Product.deleteMany(), Table.deleteMany()]);

  // 2. Tài khoản
  const adminPass = process.env.ADMIN_PASSWORD || 'Admin@123';
  await User.create([
    { name: 'Quản trị viên', email: 'admin@cafego.com', passwordHash: await bcrypt.hash(adminPass, 10), role: 'admin' },
    { name: 'Nhân viên bếp', email: 'staff@cafego.com', passwordHash: await bcrypt.hash('Staff@123', 10), role: 'staff' },
  ]);

  // 3. Danh mục + sản phẩm
  let count = 0;
  for (const [catName, items] of Object.entries(data)) {
    const cat = await Category.create({ name: catName });
    const isCake = catName === 'Bánh';
    const products = items.map(([name, price]) => ({
      name,
      price,
      category: CATEGORY_IS_REF ? cat._id : catName,
      image: `https://placehold.co/400x400?text=${encodeURIComponent(name)}`,
      description: `${name} - CaféGo`,
      options: isCake ? [] : DRINK_OPTS,
      available: true,
    }));
    await Product.insertMany(products);
    count += products.length;
  }

  // 4. Bàn (10 bàn, mỗi bàn một mã để tạo QR)
  const tables = Array.from({ length: 10 }, (_, i) => ({
    number: i + 1,
    qrCode: `${process.env.CLIENT_URL}/?table=${i + 1}`,
  }));
  await Table.insertMany(tables);

  console.log(`Seed xong: 2 user, ${Object.keys(data).length} danh mục, ${count} món, ${tables.length} bàn`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed lỗi:', err);
  process.exit(1);
});