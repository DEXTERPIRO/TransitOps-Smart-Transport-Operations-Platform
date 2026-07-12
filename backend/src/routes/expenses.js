const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { vehicleId, type } = req.query;
    const where = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (type) where.type = type;
    const expenses = await prisma.expense.findMany({
      where, include: { vehicle: true },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { vehicleId, tripId, type, amount, description, date } = req.body;
    if (!type || !amount)
      return res.status(400).json({ error: 'Type and amount required' });
    if (parseFloat(amount) <= 0)
      return res.status(400).json({ error: 'Amount must be greater than 0' });

    const expense = await prisma.expense.create({
      data: {
        vehicleId, tripId, type,
        amount: parseFloat(amount),
        description, date: date ? new Date(date) : new Date()
      }
    });
    res.status(201).json(expense);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

module.exports = router;
