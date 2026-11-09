require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const customers = [
  { name: 'Nguyễn Văn An', email: 'an@example.com', phone: '0901234567' },
  { name: 'Trần Thị Bình', email: 'binh@example.com', phone: '0912345678' },
  { name: 'Lê Hoàng Cường', email: 'cuong@example.com', phone: '0923456789' },
  { name: 'Phạm Thu Dung', email: 'dung@example.com', phone: '0934567890' },
  { name: 'Hoàng Minh Em', email: 'em@example.com', phone: '0945678901' },
  { name: 'Vũ Ngọc Phương', email: 'phuong@example.com', phone: '0956789012' },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const passwordHash = await bcrypt.hash('Customer@123', 10);

  let added = 0, updated = 0;
  for (const c of customers) {
    const existing = await User.findOne({ email: c.email });
    if (existing) {
      existing.phone = c.phone;
      await existing.save();
      updated++;
    } else {
      await User.create({ ...c, passwordHash, role: 'customer' });
      added++;
    }
  }
  console.log(`Thêm mới ${added}, cập nhật số điện thoại ${updated} khách hàng (mật khẩu mẫu: Customer@123)`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });