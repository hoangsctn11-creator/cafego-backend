require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

const origins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((s) => s.trim())
  : '*';

const io = new Server(server, { cors: { origin: origins } });
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket kết nối:', socket.id);
  socket.on('disconnect', () => console.log('Socket ngắt:', socket.id));
});

app.use(cors({ origin: origins }));
app.use(express.json());

// Phục vụ ảnh: http://localhost:5000/images/ca-phe.jpg
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => console.log('API đang chạy tại cổng', PORT));
});