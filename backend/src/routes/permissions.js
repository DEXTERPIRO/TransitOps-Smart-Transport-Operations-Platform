const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRoles } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET all permissions
router.get('/', verifyToken, async (req, res) => {
  try {
    const permissions = await prisma.rolePermission.findMany({
      orderBy: [{ role: 'asc' }, { module: 'asc' }]
    });
    res.json(permissions);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET permissions for a specific role
router.get('/:role', verifyToken, async (req, res) => {
  try {
    const permissions = await prisma.rolePermission.findMany({
      where: { role: req.params.role }
    });
    // Return as object: { dashboard: 'Full Access', vehicles: 'Read', ... }
    const result = {};
    permissions.forEach(p => { result[p.module] = p.access; });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// UPDATE permission - Fleet Manager only
router.put('/', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const { role, module, access } = req.body;

    if (!role || !module || !access)
      return res.status(400).json({ error: 'Role, module and access required' });

    // Cannot change Fleet Manager own permissions
    if (role === 'FLEET_MANAGER')
      return res.status(400).json({
        error: 'Fleet Manager permissions cannot be changed'
      });

    const permission = await prisma.rolePermission.upsert({
      where: { role_module: { role, module } },
      update: { access },
      create: { role, module, access }
    });

    // Emit real-time update via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('permissions-updated', { role, module, access });
    }

    res.json(permission);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
