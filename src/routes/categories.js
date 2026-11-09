const router = require('express').Router();
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/', async (req, res) => {
  res.json(await Category.find().sort({ name: 1 }));
});

router.post('/', auth, role('admin'), async (req, res) => {
  try {
    res.status(201).json(await Category.create(req.body));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, role('admin'), async (req, res) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!cat) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    res.json(cat);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, role('admin'), async (req, res) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(400).json({ message: 'ID không hợp lệ' });
  }
});

module.exports = router;