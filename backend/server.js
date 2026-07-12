const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
].filter(Boolean);

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true }
});

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.set('io', io);

// Routes
app.use('/api/auth',        require('./src/routes/auth'));
app.use('/api/vehicles',    require('./src/routes/vehicles'));
app.use('/api/drivers',     require('./src/routes/drivers'));
app.use('/api/trips',       require('./src/routes/trips'));
app.use('/api/maintenance', require('./src/routes/maintenance'));
app.use('/api/fuel',        require('./src/routes/fuel'));
app.use('/api/expenses',    require('./src/routes/expenses'));
app.use('/api/reports',     require('./src/routes/reports'));
app.use('/api/dashboard',   require('./src/routes/dashboard'));
app.use('/api/settings',    require('./src/routes/settings'));
app.use('/api/ai',          require('./src/routes/ai'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join-dashboard', () => socket.join('dashboard'));
  socket.on('join-trip', (tripId) => socket.join(`trip-${tripId}`));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const { checkLicenseExpiriesAndSendEmails } = require('./src/utils/reminders');

// Trigger daily license checks (every 24 hours)
setInterval(() => {
  console.log('[Scheduler] Running daily driver license expiry checks...');
  checkLicenseExpiriesAndSendEmails();
}, 24 * 60 * 60 * 1000);

// Run initial driver license check 10 seconds after startup
setTimeout(() => {
  console.log('[Scheduler] Running initial driver license expiry checks on startup...');
  checkLicenseExpiriesAndSendEmails();
}, 10000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '127.0.0.1', () => console.log(`TransitOps server running on port ${PORT}`));

module.exports = { io };
