const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRoles } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, vehicleId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;
    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.post('/', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const { vehicleId, type, description, cost, serviceCenter } = req.body;
    if (!vehicleId || !type)
      return res.status(400).json({ error: 'Vehicle and type required' });

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.status === 'ON_TRIP')
      return res.status(400).json({
        error: 'Cannot add maintenance to a vehicle currently on a trip'
      });

    // BUSINESS RULE: Creating maintenance → vehicle becomes IN_SHOP
    const [log] = await prisma.$transaction([
      prisma.maintenanceLog.create({
        data: {
          vehicleId, type, description,
          cost: parseFloat(cost) || 0,
          serviceCenter, status: 'ACTIVE'
        }
      }),
      prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: 'IN_SHOP' }
      })
    ]);

    const io = req.app.get('io');
    io.to('dashboard').emit('maintenance-created', {
      vehicleId, vehicleName: vehicle.name
    });

    const result = await prisma.maintenanceLog.findUnique({
      where: { id: log.id }, include: { vehicle: true }
    });
    res.status(201).json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// CLOSE maintenance → vehicle back to AVAILABLE
router.put('/:id/close', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true }
    });
    if (!log) return res.status(404).json({ error: 'Log not found' });
    if (log.status === 'CLOSED')
      return res.status(400).json({ error: 'Already closed' });

    // BUSINESS RULE: Closing maintenance → AVAILABLE
    // unless vehicle is RETIRED
    const newVehicleStatus =
      log.vehicle.status === 'RETIRED' ? 'RETIRED' : 'AVAILABLE';

    await prisma.$transaction([
      prisma.maintenanceLog.update({
        where: { id: req.params.id },
        data: { status: 'CLOSED', endDate: new Date() }
      }),
      prisma.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: newVehicleStatus }
      })
    ]);

    const io = req.app.get('io');
    io.to('dashboard').emit('maintenance-closed', { vehicleId: log.vehicleId });
    res.json({ message: 'Maintenance closed, vehicle restored to Available' });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.put('/:id', verifyToken,
  requireRoles('FLEET_MANAGER'), async (req, res) => {
  try {
    const { description, cost, serviceCenter } = req.body;
    const log = await prisma.maintenanceLog.update({
      where: { id: req.params.id },
      data: {
        description,
        cost: cost ? parseFloat(cost) : undefined,
        serviceCenter
      },
      include: { vehicle: true }
    });
    res.json(log);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

module.exports = router;
