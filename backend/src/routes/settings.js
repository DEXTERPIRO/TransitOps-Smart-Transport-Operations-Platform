const router = require('express').Router();
const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const { verifyToken, requireRoles } = require('../middleware/auth');

// Get all users (admin only)
router.get('/users', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true,
        role: true, region: true, isActive: true, createdAt: true
      }
    });
    res.json(users);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

// Create user
router.post('/users', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const { name, email, password, role, region } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: 'All fields required' });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
      return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, region },
      select: {
        id: true, name: true, email: true,
        role: true, region: true, isActive: true
      }
    });
    res.status(201).json(user);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

// Toggle user active status
router.put('/users/:id/toggle', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive }
    });
    res.json({ isActive: updated.isActive });
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

// Get all role permissions
router.get('/permissions', verifyToken, async (req, res) => {
  try {
    const permissions = await prisma.rolePermission.findMany();
    res.json(permissions);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Update role permissions in bulk
router.put('/permissions', verifyToken, requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'permissions must be an array' });
    }

    const updates = permissions.map(p => 
      prisma.rolePermission.upsert({
        where: {
          role_module: {
            role: p.role,
            module: p.module
          }
        },
        update: {
          accessLevel: p.accessLevel
        },
        create: {
          role: p.role,
          module: p.module,
          accessLevel: p.accessLevel
        }
      })
    );

    await prisma.$transaction(updates);

    // Fetch updated permissions and broadcast to all connected clients
    const updatedPermissions = await prisma.rolePermission.findMany();
    const io = req.app.get('io');
    if (io) io.emit('permissions:updated', updatedPermissions);

    res.json({ message: 'Permissions updated successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

module.exports = router;

