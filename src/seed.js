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
  'Cà Phê': [
    ['Phin Sữa Đá', 29000, '/images/phin-sua-da.jpg'],
    ['Phin Đen Đá', 29000, '/images/phin-den-da.jpg'],
    ['Bạc Xỉu Đá', 29000, '/images/bac-xiu-da.jpg'],
    ['Phin Sữa Nóng', 29000, '/images/phin-sua-nong.jpg'],
    ['Phin Đen Nóng', 29000, '/images/phin-den-nong.jpg'],
  ],
  'Trà': [
    ['Trà Đào Cam Sả', 45000, '/images/tra-dao-cam-xa.jpg'],
    ['Trà Sen Vàng', 45000, '/images/tra-sen-vang.jpg'],
    ['Trà Xanh Đá', 39000, '/images/tra-xanh-da.jpg'],
  ],
  'Freeze': [
    ['Freeze Trà Xanh', 55000, '/images/freeze-tra-xanh.jpg'],
    ['Cookies Freeze', 55000, '/images/cookies-freeze.jpg'],
  ],
  'Bánh Ngọt': [
    ['Bánh Tiramisu', 35000, '/images/banh-tiramisu.jpg'],
    ['Bánh Mì Que', 19000, '/images/banh-mi-que.jpg'],
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
    const isCake = catName === 'Bánh Ngọt';
    const products = items.map(([name, price, image]) => ({
      name,
      price,
      category: CATEGORY_IS_REF ? cat._id : catName,
      image,
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