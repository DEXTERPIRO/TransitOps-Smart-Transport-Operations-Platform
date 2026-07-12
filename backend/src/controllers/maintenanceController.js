const prisma = require('../utils/prisma');

const getAll = async (req, res) => {
  try {
    const { vehicleId, status, type, page = 1, limit = 20 } = req.query;
    const where = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (status) where.status = status;
    if (type) where.type = type;

    const [records, total] = await Promise.all([
      prisma.maintenance.findMany({
        where,
        skip: (page - 1) * limit,
        take: +limit,
        orderBy: { scheduledDate: 'desc' },
        include: { vehicle: { select: { id: true, regNumber: true, make: true, model: true } } },
      }),
      prisma.maintenance.count({ where }),
    ]);

    res.json({ records, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch maintenance records' });
  }
};

const getOne = async (req, res) => {
  try {
    const record = await prisma.maintenance.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true },
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch record' });
  }
};

const create = async (req, res) => {
  try {
    const record = await prisma.maintenance.create({
      data: req.body,
      include: { vehicle: { select: { regNumber: true } } },
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create maintenance record' });
  }
};

const update = async (req, res) => {
  try {
    const record = await prisma.maintenance.update({
      where: { id: req.params.id },
      data: req.body,
    });

    // If completed, update vehicle last service date
    if (req.body.status === 'COMPLETED' && req.body.completedDate) {
      await prisma.vehicle.update({
        where: { id: record.vehicleId },
        data: {
          lastServiceDate: new Date(req.body.completedDate),
          status: 'ACTIVE',
        },
      });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update record' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.maintenance.delete({ where: { id: req.params.id } });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
};

module.exports = { getAll, getOne, create, update, remove };
