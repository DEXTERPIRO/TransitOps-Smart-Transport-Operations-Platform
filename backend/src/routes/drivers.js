const router = require('express').Router();
const prisma = require('../utils/prisma');
const { verifyToken, requireRoles } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, region, search } = req.query;
    const where = { isActive: true };
    if (status) where.status = status;
    if (region) where.region = region;
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
    ];

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        _count: { select: { trips: true } },
        trips: {
          where: { status: 'DISPATCHED' },
          take: 1,
          include: { vehicle: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Add license expiry warning
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const result = drivers.map(d => ({
      ...d,
      licenseNo: d.licenseNumber,
      licenseExpired: new Date(d.licenseExpiry) < now,
      licenseExpiringSoon: new Date(d.licenseExpiry) < thirtyDays
        && new Date(d.licenseExpiry) >= now
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { vehicle: true }
        }
      }
    });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json({ ...driver, licenseNo: driver.licenseNumber });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/', verifyToken,
  requireRoles('FLEET_MANAGER', 'SAFETY_OFFICER'), async (req, res) => {
  try {
    const {
      name, licenseNumber, licenseNo, licenseCategory,
      licenseExpiry, contactNumber, region, safetyScore
    } = req.body;

    const resolvedLicenseNumber = licenseNumber || licenseNo;

    if (!name || !resolvedLicenseNumber || !licenseCategory || !licenseExpiry || !contactNumber)
      return res.status(400).json({ error: 'All required fields must be filled' });

    const existing = await prisma.driver.findUnique({
      where: { licenseNumber: resolvedLicenseNumber }
    });
    if (existing)
      return res.status(409).json({
        error: `License number ${resolvedLicenseNumber} already registered`
      });

    // Warn if license already expired
    const expiry = new Date(licenseExpiry);
    if (expiry < new Date())
      return res.status(400).json({
        error: 'Cannot register driver with already expired license'
      });

    const driver = await prisma.driver.create({
      data: {
        name, licenseNumber: resolvedLicenseNumber, licenseCategory,
        licenseExpiry: expiry, contactNumber, region,
        safetyScore: parseFloat(safetyScore) || 100
      }
    });

    const io = req.app.get('io');
    io.to('dashboard').emit('driver-added', { ...driver, licenseNo: driver.licenseNumber });
    res.status(201).json({ ...driver, licenseNo: driver.licenseNumber });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.put('/:id', verifyToken,
  requireRoles('FLEET_MANAGER', 'SAFETY_OFFICER'), async (req, res) => {
  try {
    const {
      name, licenseCategory, licenseExpiry,
      contactNumber, region, safetyScore, status
    } = req.body;

    if (status === 'ON_TRIP')
      return res.status(400).json({
        error: 'ON_TRIP status is set automatically by dispatching a trip'
      });

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        name, licenseCategory,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
        contactNumber, region,
        safetyScore: safetyScore ? parseFloat(safetyScore) : undefined,
        status
      }
    });
    res.json({ ...driver, licenseNo: driver.licenseNumber });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET available drivers for dispatch
router.get('/available/dispatch', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const drivers = await prisma.driver.findMany({
      where: {
        isActive: true,
        status: 'AVAILABLE',
        // BUSINESS RULE: Suspended excluded
        // BUSINESS RULE: Expired license excluded
        licenseExpiry: { gt: now }
      }
    });
    res.json(drivers.map(d => ({ ...d, licenseNo: d.licenseNumber })));
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DELETE (soft delete)
router.delete('/:id', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id }
    });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    if (driver.status === 'ON_TRIP')
      return res.status(400).json({
        error: 'Cannot delete a driver that is currently on a trip'
      });
    await prisma.driver.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ message: 'Driver removed from fleet' });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
