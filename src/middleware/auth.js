const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Chưa đăng nhập hoặc token hết hạn' });
  }
};