const router = require('express').Router();
const prisma = require('../utils/prisma');
const { verifyToken, requireRoles } = require('../middleware/auth');

// GET all vehicles with filters
router.get('/', verifyToken, async (req, res) => {
  try {
    const { type, status, region, search } = req.query;
    const where = { isActive: true };
    if (type) where.type = type;
    if (status) where.status = status;
    if (region) where.region = region;
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { registrationNo: { contains: search, mode: 'insensitive' } },
    ];
    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        _count: { select: { trips: true, maintenanceLogs: true } },
        maintenanceLogs: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vehicles);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET single vehicle with full details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        trips: { orderBy: { createdAt: 'desc' }, take: 5,
          include: { driver: true } },
        maintenanceLogs: { orderBy: { createdAt: 'desc' } },
        fuelLogs: { orderBy: { date: 'desc' }, take: 10 },
        expenses: { orderBy: { date: 'desc' }, take: 10 },
        documents: true
      }
    });
    if (!vehicle)
      return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST create vehicle
router.post('/', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const {
      registrationNo, name, type, maxLoadCapacity,
      odometer, acquisitionCost, region
    } = req.body;

    // Validation
    if (!registrationNo || !name || !type || !maxLoadCapacity || !acquisitionCost)
      return res.status(400).json({
        error: 'Registration, name, type, capacity, cost are required'
      });

    const existing = await prisma.vehicle.findUnique({
      where: { registrationNo }
    });
    if (existing)
      return res.status(409).json({
        error: `Registration number ${registrationNo} already exists`
      });

    if (parseFloat(maxLoadCapacity) <= 0)
      return res.status(400).json({
        error: 'Max load capacity must be greater than 0'
      });

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNo: registrationNo.toUpperCase(),
        name, type,
        maxLoadCapacity: parseFloat(maxLoadCapacity),
        odometer: parseFloat(odometer) || 0,
        acquisitionCost: parseFloat(acquisitionCost),
        region
      }
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to('dashboard').emit('vehicle-added', vehicle);

    res.status(201).json(vehicle);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// PUT update vehicle
router.put('/:id', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const { name, type, maxLoadCapacity,
            acquisitionCost, region, status } = req.body;

    // Cannot manually set to ON_TRIP - that's automatic
    if (status === 'ON_TRIP')
      return res.status(400).json({
        error: 'ON_TRIP status is set automatically by dispatching a trip'
      });

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        name, type,
        maxLoadCapacity: maxLoadCapacity
          ? parseFloat(maxLoadCapacity) : undefined,
        acquisitionCost: acquisitionCost
          ? parseFloat(acquisitionCost) : undefined,
        region, status
      }
    });

    const io = req.app.get('io');
    io.to('dashboard').emit('vehicle-updated', vehicle);
    res.json(vehicle);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DELETE (soft delete)
router.delete('/:id', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id }
    });
    if (vehicle.status === 'ON_TRIP')
      return res.status(400).json({
        error: 'Cannot delete a vehicle that is currently on a trip'
      });
    await prisma.vehicle.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ message: 'Vehicle removed from fleet' });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET available vehicles for dispatch
router.get('/available/dispatch', verifyToken, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        isActive: true,
        status: 'AVAILABLE'
        // BUSINESS RULE: Only AVAILABLE vehicles shown
        // Retired and In Shop excluded automatically
      }
    });
    res.json(vehicles);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
