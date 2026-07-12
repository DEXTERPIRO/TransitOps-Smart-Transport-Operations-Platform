const prisma = require('../utils/prisma');
const { generateReportPDF } = require('../utils/pdfGenerator');

// GET /api/reports/fleet-summary
const fleetSummary = async (req, res) => {
  try {
    const [vehicles, totalExpenses, totalFuel, trips] = await Promise.all([
      prisma.vehicle.findMany({ include: { _count: { select: { trips: true } } } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.fuelLog.aggregate({ _sum: { liters: true, totalCost: true } }),
      prisma.trip.count(),
    ]);
    res.json({ vehicles, totalExpenses: totalExpenses._sum, totalFuel: totalFuel._sum, trips });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

// GET /api/reports/fleet-summary/pdf
const fleetSummaryPDF = async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { _count: { select: { trips: true } } },
    });

    const columns = ['Reg. No.', 'Make', 'Model', 'Type', 'Status', 'Trips'];
    const rows = vehicles.map((v) => [
      v.regNumber, v.make, v.model, v.type, v.status, v._count.trips,
    ]);

    const pdfBuffer = await generateReportPDF({ title: 'Fleet Summary Report', columns, rows });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="fleet-summary.pdf"',
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

// GET /api/reports/expense-summary
const expenseSummary = async (req, res) => {
  try {
    const grouped = await prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate expense report' });
  }
};

// GET /api/reports/trip-analysis
const tripAnalysis = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.scheduledStart = {};
      if (from) where.scheduledStart.gte = new Date(from);
      if (to) where.scheduledStart.lte = new Date(to);
    }

    const trips = await prisma.trip.groupBy({
      by: ['status'],
      where,
      _count: true,
    });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate trip analysis' });
  }
};

module.exports = { fleetSummary, fleetSummaryPDF, expenseSummary, tripAnalysis };
