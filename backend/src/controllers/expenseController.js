const prisma = require('../utils/prisma');

const getAll = async (req, res) => {
  try {
    const { category, vehicleId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (category) where.category = category;
    if (vehicleId) where.vehicleId = vehicleId;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip: (page - 1) * limit,
        take: +limit,
        orderBy: { date: 'desc' },
        include: {
          vehicle: { select: { id: true, regNumber: true } },
          trip: { select: { id: true, tripNumber: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ expenses, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

const create = async (req, res) => {
  try {
    const expense = await prisma.expense.create({ data: req.body });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

const update = async (req, res) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// GET /api/expenses/summary
const getSummary = async (req, res) => {
  try {
    const grouped = await prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: true,
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};

module.exports = { getAll, create, update, remove, getSummary };
