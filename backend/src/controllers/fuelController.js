const prisma = require('../utils/prisma');

const getAll = async (req, res) => {
  try {
    const { vehicleId, page = 1, limit = 20 } = req.query;
    const where = vehicleId ? { vehicleId } : {};

    const [logs, total] = await Promise.all([
      prisma.fuelLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: +limit,
        orderBy: { date: 'desc' },
        include: { vehicle: { select: { id: true, regNumber: true, make: true, model: true } } },
      }),
      prisma.fuelLog.count({ where }),
    ]);

    res.json({ logs, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fuel logs' });
  }
};

const create = async (req, res) => {
  try {
    const log = await prisma.fuelLog.create({
      data: {
        ...req.body,
        totalCost: req.body.liters * req.body.pricePerLtr,
      },
    });
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create fuel log' });
  }
};

const update = async (req, res) => {
  try {
    const log = await prisma.fuelLog.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        totalCost: req.body.liters && req.body.pricePerLtr
          ? req.body.liters * req.body.pricePerLtr
          : undefined,
      },
    });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update fuel log' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.fuelLog.delete({ where: { id: req.params.id } });
    res.json({ message: 'Fuel log deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete fuel log' });
  }
};

// GET /api/fuel/stats
const getStats = async (req, res) => {
  try {
    const result = await prisma.fuelLog.aggregate({
      _sum: { liters: true, totalCost: true },
      _avg: { pricePerLtr: true },
      _count: true,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fuel stats' });
  }
};

module.exports = { getAll, create, update, remove, getStats };
