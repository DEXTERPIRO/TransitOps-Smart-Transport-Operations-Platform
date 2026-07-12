const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive)
      return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, lastLoginAt: new Date() },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password: _, refreshToken: __, ...safeUser } = user;
    res.json({ accessToken, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    const decoded = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.refreshToken !== token)
      return res.status(401).json({ error: 'Invalid refresh token' });

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = generateAccessToken(payload);

    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: 'Token refresh failed' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const decoded = verifyRefreshToken(token).catch(() => null);
      if (decoded?.id) {
        await prisma.user.update({
          where: { id: decoded.id },
          data: { refreshToken: null },
        });
      }
    }
  } catch (_) {}
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};

// GET /api/auth/me
const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, avatar: true,
                phone: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = { login, refresh, logout, me, changePassword };
