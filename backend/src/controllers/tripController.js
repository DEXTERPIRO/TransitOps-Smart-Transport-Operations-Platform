const prisma = require('../utils/prisma');

const getAll = async (req, res) => {
  try {
    const { status, vehicleId, driverId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;
    if (driverId) where.driverId = driverId;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip: (page - 1) * limit,
        take: +limit,
        orderBy: { scheduledStart: 'desc' },
        include: {
          vehicle: { select: { id: true, regNumber: true, make: true, model: true } },
          driver: { select: { id: true, name: true, employeeId: true } },
          route: true,
        },
      }),
      prisma.trip.count({ where }),
    ]);

    res.json({ trips, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
};

const getOne = async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true, driver: true, route: true, expenses: true },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
};

const create = async (req, res) => {
  try {
    const count = await prisma.trip.count();
    const tripNumber = `TRP-${String(count + 1).padStart(5, '0')}`;
    const trip = await prisma.trip.create({
      data: { ...req.body, tripNumber },
      include: {
        vehicle: { select: { regNumber: true } },
        driver: { select: { name: true } },
      },
    });
    req.app.get('io').to('dashboard').emit('trip:created', trip);
    res.status(201).json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create trip' });
  }
};

const update = async (req, res) => {
  try {
    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        vehicle: { select: { regNumber: true } },
        driver: { select: { name: true } },
      },
    });
    req.app.get('io').to('dashboard').emit('trip:updated', trip);
    req.app.get('io').to(`trip-${trip.id}`).emit('trip:location', {
      lat: trip.currentLat,
      lng: trip.currentLng,
      status: trip.status,
    });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update trip' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.trip.delete({ where: { id: req.params.id } });
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete trip' });
  }
};

// PATCH /api/trips/:id/location
const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await prisma.trip.update({
      where: { id: req.params.id },
      data: { currentLat: lat, currentLng: lng },
    });
    req.app.get('io').to(`trip-${req.params.id}`).emit('trip:location', { lat, lng });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
};

module.exports = { getAll, getOne, create, update, remove, updateLocation };
