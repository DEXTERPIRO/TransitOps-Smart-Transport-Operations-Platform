const prisma = require('../utils/prisma');

// GET /api/dashboard/stats
const getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [
      totalVehicles, activeVehicles, maintenanceVehicles,
      totalDrivers, activeDrivers,
      totalTrips, todayTrips, activeTrips,
      pendingMaintenance,
      totalExpenses, fuelStats,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'ACTIVE' } }),
      prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { status: 'ACTIVE' } }),
      prisma.trip.count(),
      prisma.trip.count({
        where: { scheduledStart: { gte: today, lt: tomorrow } },
      }),
      prisma.trip.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.maintenance.count({ where: { status: 'PENDING' } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.fuelLog.aggregate({ _sum: { liters: true, totalCost: true } }),
    ]);

    res.json({
      vehicles: { total: totalVehicles, active: activeVehicles, maintenance: maintenanceVehicles },
      drivers: { total: totalDrivers, active: activeDrivers },
      trips: { total: totalTrips, today: todayTrips, active: activeTrips },
      maintenance: { pending: pendingMaintenance },
      financials: {
        totalExpenses: totalExpenses._sum.amount || 0,
        totalFuelCost: fuelStats._sum.totalCost || 0,
        totalFuelLiters: fuelStats._sum.liters || 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

// GET /api/dashboard/recent-trips
const getRecentTrips = async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      take: 10,
      orderBy: { scheduledStart: 'desc' },
      include: {
        vehicle: { select: { regNumber: true, make: true, model: true } },
        driver: { select: { name: true, employeeId: true } },
        route: { select: { name: true } },
      },
    });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent trips' });
  }
};

// GET /api/dashboard/expense-trend
const getExpenseTrend = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const expenses = await prisma.expense.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true, category: true },
      orderBy: { date: 'asc' },
    });

    // Group by month
    const grouped = {};
    expenses.forEach(({ date, amount, category }) => {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = { month: key, total: 0, fuel: 0, maintenance: 0 };
      grouped[key].total += amount;
      if (category === 'FUEL') grouped[key].fuel += amount;
      if (category === 'MAINTENANCE') grouped[key].maintenance += amount;
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expense trend' });
  }
};

// GET /api/dashboard/active-trips-map
const getActiveTripsMap = async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      where: {
        status: 'IN_PROGRESS',
        currentLat: { not: null },
        currentLng: { not: null },
      },
      include: {
        vehicle: { select: { regNumber: true, make: true } },
        driver: { select: { name: true } },
        route: { select: { name: true } },
      },
    });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active trips' });
  }
};

module.exports = { getStats, getRecentTrips, getExpenseTrend, getActiveTripsMap };
