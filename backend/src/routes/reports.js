const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRoles } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const prisma = new PrismaClient();

router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const { from, to, vehicleId } = req.query;
    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const tripWhere = { status: 'COMPLETED' };
    if (dateFilter.gte || dateFilter.lte)
      tripWhere.completedAt = dateFilter;
    if (vehicleId) tripWhere.vehicleId = vehicleId;

    const trips = await prisma.trip.findMany({
      where: tripWhere,
      include: {
        vehicle: {
          include: {
            fuelLogs: true,
            maintenanceLogs: { where: { status: 'CLOSED' } },
            expenses: true
          }
        }
      }
    });

    // Fuel efficiency per vehicle
    const vehicleStats = {};
    for (const trip of trips) {
      const vId = trip.vehicleId;
      if (!vehicleStats[vId]) {
        vehicleStats[vId] = {
          id: vId,
          name: trip.vehicle.name,
          registrationNo: trip.vehicle.registrationNo,
          type: trip.vehicle.type,
          acquisitionCost: trip.vehicle.acquisitionCost,
          totalDistance: 0,
          totalFuel: 0,
          totalRevenue: 0,
          fuelCost: 0,
          maintenanceCost: 0,
          otherExpenses: 0,
          trips: 0
        };
      }
      vehicleStats[vId].totalDistance += trip.actualDistance || 0;
      vehicleStats[vId].totalFuel += trip.fuelConsumed || 0;
      vehicleStats[vId].totalRevenue += trip.revenue || 0;
      vehicleStats[vId].trips += 1;
    }

    // Add fuel and maintenance costs
    for (const vId of Object.keys(vehicleStats)) {
      const fuelLogs = await prisma.fuelLog.findMany({
        where: { vehicleId: vId }
      });
      const maintenanceLogs = await prisma.maintenanceLog.findMany({
        where: { vehicleId: vId, status: 'CLOSED' }
      });
      const expenses = await prisma.expense.findMany({
        where: { vehicleId: vId }
      });

      vehicleStats[vId].fuelCost =
        fuelLogs.reduce((s, f) => s + f.totalCost, 0);
      vehicleStats[vId].maintenanceCost =
        maintenanceLogs.reduce((s, m) => s + m.cost, 0);
      vehicleStats[vId].otherExpenses =
        expenses.reduce((s, e) => s + e.amount, 0);
    }

    const statsArray = Object.values(vehicleStats).map(v => {
      const totalOperationalCost =
        v.fuelCost + v.maintenanceCost + v.otherExpenses;
      const fuelEfficiency =
        v.totalFuel > 0 ? (v.totalDistance / v.totalFuel).toFixed(2) : 0;
      const roi = v.acquisitionCost > 0
        ? (((v.totalRevenue - totalOperationalCost)
            / v.acquisitionCost) * 100).toFixed(2)
        : 0;
      return { ...v, totalOperationalCost, fuelEfficiency, roi };
    });

    // Monthly revenue trend
    const monthlyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "completedAt") as month,
        SUM(revenue) as revenue,
        COUNT(*) as trips
      FROM "Trip"
      WHERE status = 'COMPLETED' AND "completedAt" IS NOT NULL
      GROUP BY DATE_TRUNC('month', "completedAt")
      ORDER BY month DESC
      LIMIT 12
    `;

    // Fleet utilization
    const totalVehicles = await prisma.vehicle.count({
      where: { isActive: true }
    });
    const onTripVehicles = await prisma.vehicle.count({
      where: { status: 'ON_TRIP' }
    });
    const fleetUtilization = totalVehicles > 0
      ? Math.round((onTripVehicles / totalVehicles) * 100)
      : 0;

    res.json({
      vehicleStats: statsArray,
      monthlyRevenue,
      fleetUtilization,
      summary: {
        totalTrips: trips.length,
        totalRevenue: statsArray.reduce((s, v) => s + v.totalRevenue, 0),
        totalFuelCost: statsArray.reduce((s, v) => s + v.fuelCost, 0),
        totalMaintenanceCost: statsArray.reduce((s, v) => s + v.maintenanceCost, 0),
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// CSV Export
router.get('/export/csv', verifyToken,
  requireRoles('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const { type } = req.query;

    let data = [];
    let filename = 'report';

    if (type === 'trips') {
      const trips = await prisma.trip.findMany({
        include: { vehicle: true, driver: true }
      });
      data = trips.map(t => ({
        'Trip Code': t.tripCode,
        'Source': t.source,
        'Destination': t.destination,
        'Vehicle': t.vehicle.registrationNo,
        'Driver': t.driver.name,
        'Cargo (kg)': t.cargoWeight,
        'Distance (km)': t.actualDistance || t.plannedDistance,
        'Fuel (L)': t.fuelConsumed || '',
        'Revenue': t.revenue || '',
        'Status': t.status,
        'Date': t.createdAt.toLocaleDateString()
      }));
      filename = 'trips-report';
    } else if (type === 'vehicles') {
      const vehicles = await prisma.vehicle.findMany({
        where: { isActive: true }
      });
      data = vehicles.map(v => ({
        'Registration': v.registrationNo,
        'Name': v.name,
        'Type': v.type,
        'Max Load (kg)': v.maxLoadCapacity,
        'Odometer': v.odometer,
        'Acquisition Cost': v.acquisitionCost,
        'Status': v.status,
        'Region': v.region || ''
      }));
      filename = 'vehicles-report';
    }

    const parser = new Parser();
    const csv = parser.parse(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition',
      `attachment; filename=${filename}.csv`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// PDF Export
router.get('/export/pdf', verifyToken,
  requireRoles('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { isActive: true }
    });
    const trips = await prisma.trip.findMany({
      where: { status: 'COMPLETED' },
      include: { vehicle: true, driver: true },
      take: 20
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      'attachment; filename=transitops-report.pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor('#f97316').text('TransitOps', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('Fleet Operations Report', { align: 'center' });
    doc.moveDown();
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Fleet Summary
    doc.fontSize(16).fillColor('#333').text('Fleet Summary');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#f97316').moveDown(0.5);
    doc.fontSize(11).fillColor('#333')
      .text(`Total Vehicles: ${vehicles.length}`)
      .text(`Available: ${vehicles.filter(v => v.status === 'AVAILABLE').length}`)
      .text(`On Trip: ${vehicles.filter(v => v.status === 'ON_TRIP').length}`)
      .text(`In Shop: ${vehicles.filter(v => v.status === 'IN_SHOP').length}`);
    doc.moveDown(2);

    // Recent trips table
    doc.fontSize(16).text('Recent Completed Trips');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#f97316').moveDown(0.5);
    trips.slice(0, 10).forEach((t, i) => {
      if (i % 2 === 0) doc.rect(50, doc.y - 2, 495, 18).fill('#f8f9fa');
      doc.fontSize(9).fillColor('#333')
        .text(`${t.tripCode}`, 55, doc.y - 12)
        .text(`${t.source} → ${t.destination}`, 120, doc.y - doc.currentLineHeight())
        .text(`${t.vehicle.registrationNo}`, 320, doc.y - doc.currentLineHeight())
        .text(`₹${t.revenue || 0}`, 440, doc.y - doc.currentLineHeight());
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

module.exports = router;
