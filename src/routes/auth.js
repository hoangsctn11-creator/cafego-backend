const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Đăng ký (luôn tạo role customer, không cho client tự chọn role)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Thiếu name, email hoặc password' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự' });
    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email đã tồn tại' });

    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'customer',
    });
    res.status(201).json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
      return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lấy thông tin người đang đăng nhập (để test token)
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  res.json(user);
});

module.exports = router;