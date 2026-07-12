const router = require('express').Router();
const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });

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
    if (!email || !password) {
      console.log("LOGIN FAILED: Missing email or password");
      return res.status(400).json({ error: 'Email and password required' });
    }
    console.log("LOGIN REQUEST - Email:", email, "Password length:", password?.length);
    const user = await prisma.user.findUnique({ where: { email } });
    console.log("USER FOUND:", !!user);
    if (!user) {
      console.log("LOGIN FAILED: User not found");
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password);
    console.log("PASSWORD MATCH:", match);
    if (!match) {
      console.log("LOGIN FAILED: Password mismatch");
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.isActive) {
      console.log("LOGIN FAILED: Account deactivated");
      return res.status(403).json({ error: 'Account deactivated' });
    }

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

const { sendEmail } = require('../utils/mailer');

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found with this email' });
    }

    const pin = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `Transit@${pin}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    await sendEmail({
      to: email,
      subject: 'TransitOps - Password Reset Request',
      html: `
        <div style="font-family: monospace; padding: 24px; background-color: #1e293b; color: #f8fafc; border-radius: 16px; border: 1px solid #475569; max-width: 500px;">
          <h2 style="color: #22c55e; margin-top: 0; letter-spacing: 0.05em; text-transform: uppercase; font-size: 18px;">TransitOps Smart Transport</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>A password reset has been requested for your TransitOps account.</p>
          <p>Your temporary password is:</p>
          <div style="font-size: 20px; color: #3b82f6; font-weight: bold; background: #0f172a; padding: 12px; border-radius: 8px; text-align: center; font-family: monospace; border: 1px solid #334155; margin: 16px 0;">
            ${tempPassword}
          </div>
          <p>Please log in using this password, and immediately update your password under Settings.</p>
          <hr style="border: 0; border-top: 1px solid #475569; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; line-height: 1.4;">If you did not request this, please contact your System Administrator.</p>
        </div>
      `
    });

    res.json({ message: 'Temporary password sent to your email.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

const otpStore = new Map();

router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    otpStore.set(email.toLowerCase(), { otp, expires });
    console.log(`[DEVELOPER TESTING] GENERATED OTP FOR ${email}: ${otp}`);

    await sendEmail({
      to: email,
      subject: 'TransitOps - Verification OTP Code',
      html: `
        <div style="font-family: monospace; padding: 24px; background-color: #1e293b; color: #f8fafc; border-radius: 16px; border: 1px solid #475569; max-width: 500px;">
          <h2 style="color: #22c55e; margin-top: 0; letter-spacing: 0.05em; text-transform: uppercase; font-size: 18px;">TransitOps Smart Transport</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>You requested a verification code to reset your password.</p>
          <p>Your OTP Code is:</p>
          <div style="font-size: 24px; color: #22c55e; font-weight: bold; background: #0f172a; padding: 12px; border-radius: 8px; text-align: center; font-family: monospace; border: 1px solid #334155; margin: 16px 0; letter-spacing: 4px;">
            ${otp}
          </div>
          <p>This code is valid for 10 minutes. Please enter this code in the portal to reset your password.</p>
          <hr style="border: 0; border-top: 1px solid #475569; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; line-height: 1.4;">If you did not request this, please secure your account.</p>
        </div>
      `
    });

    res.json({ message: 'OTP sent to your email.' });
  } catch (e) {
    console.error("SEND OTP ERROR:", e);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedData = otpStore.get(email.toLowerCase());
    if (!storedData) {
      return res.status(400).json({ error: 'No OTP requested for this email' });
    }

    if (Date.now() > storedData.expires) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    res.json({ message: 'OTP verified successfully.' });
  } catch (e) {
    console.error("VERIFY OTP ERROR:", e);
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

router.post('/reset-password-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const storedData = otpStore.get(email.toLowerCase());
    if (!storedData) {
      return res.status(400).json({ error: 'Verification session expired' });
    }

    if (Date.now() > storedData.expires) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    otpStore.delete(email.toLowerCase());
    res.json({ message: 'Password reset successfully.' });
  } catch (e) {
    console.error("RESET PASSWORD OTP ERROR:", e);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

router.get('/get-latest-otp-debug', (req, res) => {
  const entries = Array.from(otpStore.entries());
  if (entries.length === 0) {
    return res.status(404).json({ error: 'No active OTPs found' });
  }
  const lastEntry = entries[entries.length - 1];
  res.json({ email: lastEntry[0], otp: lastEntry[1].otp });
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
