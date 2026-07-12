const prisma = require('../utils/prisma');

const getAll = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip: (page - 1) * limit,
        take: +limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { trips: true } } },
      }),
      prisma.driver.count({ where }),
    ]);

    res.json({ drivers, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
};

const getOne = async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: { trips: { orderBy: { scheduledStart: 'desc' }, take: 10 } },
    });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
};

const create = async (req, res) => {
  try {
    const driver = await prisma.driver.create({ data: req.body });
    res.status(201).json(driver);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create driver' });
  }
};

const update = async (req, res) => {
  try {
    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update driver' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.driver.delete({ where: { id: req.params.id } });
    res.json({ message: 'Driver deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete driver' });
  }
};

module.exports = { getAll, getOne, create, update, remove };
