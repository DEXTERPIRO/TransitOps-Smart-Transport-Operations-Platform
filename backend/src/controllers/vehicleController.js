const prisma = require('../utils/prisma');

// GET /api/vehicles
const getAll = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { regNumber: { contains: search, mode: 'insensitive' } },
        { make: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip: (page - 1) * limit,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { trips: true } } },
      }),
      prisma.vehicle.count({ where }),
    ]);

    res.json({ vehicles, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

// GET /api/vehicles/:id
const getOne = async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        trips: { orderBy: { scheduledStart: 'desc' }, take: 10 },
        maintenance: { orderBy: { scheduledDate: 'desc' }, take: 5 },
        fuelLogs: { orderBy: { date: 'desc' }, take: 10 },
      },
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
};

// POST /api/vehicles
const create = async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.create({ data: req.body });
    req.app.get('io').to('dashboard').emit('vehicle:created', vehicle);
    res.status(201).json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
};

// PUT /api/vehicles/:id
const update = async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: req.body,
    });
    req.app.get('io').to('dashboard').emit('vehicle:updated', vehicle);
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
};

// DELETE /api/vehicles/:id
const remove = async (req, res) => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
};

// GET /api/vehicles/stats
const getStats = async (req, res) => {
  try {
    const [total, active, maintenance, inactive] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'ACTIVE' } }),
      prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
      prisma.vehicle.count({ where: { status: 'INACTIVE' } }),
    ]);
    res.json({ total, active, maintenance, inactive });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = { getAll, getOne, create, update, remove, getStats };
