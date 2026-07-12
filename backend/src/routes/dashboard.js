const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../middleware/auth');
const { checkMaintenanceNeeded } = require('../utils/maintenanceAlerts');
const prisma = new PrismaClient();

router.get('/kpis', verifyToken, async (req, res) => {
  try {
    const { region, type } = req.query;
    const vehicleWhere = { isActive: true };
    if (region) vehicleWhere.region = region;
    if (type) vehicleWhere.type = type;

    const [
      totalVehicles, activeVehicles, availableVehicles,
      inShopVehicles, onTripVehicles, retiredVehicles,
      activeTrips, pendingTrips, driversOnDuty,
      expiringLicenses
    ] = await Promise.all([
      prisma.vehicle.count({ where: vehicleWhere }),
      prisma.vehicle.count({
        where: { ...vehicleWhere, status: { not: 'RETIRED' } }
      }),
      prisma.vehicle.count({
        where: { ...vehicleWhere, status: 'AVAILABLE' }
      }),
      prisma.vehicle.count({
        where: { ...vehicleWhere, status: 'IN_SHOP' }
      }),
      prisma.vehicle.count({
        where: { ...vehicleWhere, status: 'ON_TRIP' }
      }),
      prisma.vehicle.count({
        where: { ...vehicleWhere, status: 'RETIRED' }
      }),
      prisma.trip.count({ where: { status: 'DISPATCHED' } }),
      prisma.trip.count({ where: { status: 'DRAFT' } }),
      prisma.driver.count({
        where: { status: 'ON_TRIP', isActive: true }
      }),
      prisma.driver.count({
        where: {
          isActive: true,
          licenseExpiry: {
            lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gt: new Date()
          }
        }
      })
    ]);

    const fleetUtilization = totalVehicles > 0
      ? Math.round((onTripVehicles / totalVehicles) * 100)
      : 0;

    const recentTrips = await prisma.trip.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { registrationNo: true, name: true } },
        driver: { select: { name: true } }
      }
    });

    const vehicleStatusBreakdown = await prisma.vehicle.groupBy({
      by: ['status'],
      _count: { status: true },
      where: vehicleWhere
    });

    res.json({
      kpis: {
        totalVehicles, activeVehicles, availableVehicles,
        inShopVehicles, onTripVehicles, retiredVehicles,
        activeTrips, pendingTrips, driversOnDuty,
        fleetUtilization, expiringLicenses
      },
      recentTrips,
      vehicleStatusBreakdown: vehicleStatusBreakdown.map(v => ({
        status: v.status,
        count: v._count.status
      }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Predictive maintenance alerts
router.get('/maintenance-alerts', verifyToken, async (req, res) => {
  try {
    const alerts = await checkMaintenanceNeeded();
    res.json(alerts);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
