const router = require('express').Router();
const prisma = require('../utils/prisma');
const { verifyToken, requireRoles } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const where = vehicleId ? { vehicleId } : {};
    const logs = await prisma.fuelLog.findMany({
      where, include: { vehicle: true },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.post('/', verifyToken,
  requireRoles('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const { vehicleId, liters, costPerL, odometer, date, station } = req.body;
    if (!vehicleId || !liters || !costPerL || !odometer)
      return res.status(400).json({
        error: 'Vehicle, liters, cost per liter, odometer required'
      });
    if (parseFloat(liters) <= 0)
      return res.status(400).json({ error: 'Liters must be greater than 0' });

    const totalCost = parseFloat(liters) * parseFloat(costPerL);
    const log = await prisma.fuelLog.create({
      data: {
        vehicleId, liters: parseFloat(liters),
        costPerL: parseFloat(costPerL),
        totalCost, odometer: parseFloat(odometer),
        date: date ? new Date(date) : new Date(),
        station
      },
      include: { vehicle: true }
    });
    res.status(201).json(log);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

module.exports = router;
