const prisma = require('../utils/prisma');

// GET /api/settings
const getAll = async (req, res) => {
  try {
    const settings = await prisma.settings.findMany();
    const map = {};
    settings.forEach((s) => (map[s.key] = s.value));
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// PUT /api/settings
const upsert = async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    const ops = Object.entries(updates).map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );
    await Promise.all(ops);
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// GET /api/settings/users
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true,
                lastLoginAt: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// POST /api/settings/users
const createUser = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { name, email, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// PUT /api/settings/users/:id
const updateUser = async (req, res) => {
  try {
    const { name, role, isActive, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, role, isActive, phone },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

module.exports = { getAll, upsert, getUsers, createUser, updateUser };
