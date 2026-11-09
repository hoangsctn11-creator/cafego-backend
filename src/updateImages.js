require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('./models/Product');
require('./models/Category');

const IMG_DIR = path.join(__dirname, 'public', 'images');
const EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

const CATEGORY_FILE = {
  'Cà phê': 'ca-phe',
  'Trà': 'tra',
  'Sinh tố': 'sinh-to',
  'Bánh': 'banh',
  'Đá xay': 'da-xay',
};

const slugify = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const findFile = (base) => {
  for (const ext of EXTS) {
    if (fs.existsSync(path.join(IMG_DIR, base + ext))) return base + ext;
  }
  return null;
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const products = await Product.find().populate('category', 'name');

  let own = 0, byCat = 0, missing = 0;
  for (const p of products) {
    const file = findFile(slugify(p.name));
    const catFile = findFile(CATEGORY_FILE[p.category?.name] || '');
    const chosen = file || catFile;

    if (!chosen) {
      missing++;
      console.log('Thiếu ảnh cho:', p.name);
      continue;
    }
    await Product.updateOne({ _id: p._id }, { image: `/images/${chosen}` });
    file ? own++ : byCat++;
  }

  console.log(`Xong: ${own} món có ảnh riêng, ${byCat} món dùng ảnh danh mục, ${missing} món thiếu ảnh`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });