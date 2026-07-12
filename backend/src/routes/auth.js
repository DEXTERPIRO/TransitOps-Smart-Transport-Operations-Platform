const router = require('express').Router();
const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

router.post('/login', limiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive)
      return res.status(403).json({ error: 'Account deactivated' });

    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({
      accessToken,
      user: {
        id: user.id, name: user.name,
        email: user.email, role: user.role
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token)
      return res.status(401).json({ error: 'No refresh token' });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive)
      return res.status(401).json({ error: 'Invalid session' });
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true,
        role: true, region: true, createdAt: true
      }
    });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
