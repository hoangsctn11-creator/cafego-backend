const router = require('express').Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Tự nhận biết Product.category là ObjectId (ref) hay String
const catIsRef = /objectid/i.test(Product.schema.path('category')?.instance || '');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Danh sách món (công khai): ?category=<id hoặc tên>&q=<từ khóa>&available=true
router.get('/', async (req, res) => {
  try {
    const { category, q, available } = req.query;
    const filter = {};

    if (category) {
      if (catIsRef) {
        if (mongoose.isValidObjectId(category)) {
          filter.category = category;
        } else {
          const cat = await Category.findOne({ name: category });
          if (!cat) return res.json([]);
          filter.category = cat._id;
        }
      } else {
        filter.category = category;
      }
    }
    if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
    if (available === 'true') filter.available = true;

    let query = Product.find(filter).sort({ name: 1 });
    if (catIsRef) query = query.populate('category', 'name');
    res.json(await query);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Chi tiết một món (công khai)
router.get('/:id', async (req, res) => {
  try {
    let query = Product.findById(req.params.id);
    if (catIsRef) query = query.populate('category', 'name');
    const product = await query;
    if (!product) return res.status(404).json({ message: 'Không tìm thấy món' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: 'ID không hợp lệ' });
  }
});

// Thêm món (admin)
router.post('/', auth, role('admin'), async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Sửa món (admin)
router.put('/:id', auth, role('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: 'Không tìm thấy món' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Bật/tắt còn hàng (staff hoặc admin): body { "available": false }
router.patch('/:id/available', auth, role('staff', 'admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { available: !!req.body.available },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Không tìm thấy món' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Xóa món (admin)
router.delete('/:id', auth, role('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Không tìm thấy món' });
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(400).json({ message: 'ID không hợp lệ' });
  }
});

module.exports = router;