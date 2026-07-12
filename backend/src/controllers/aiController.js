const prisma = require('../utils/prisma');

/**
 * POST /api/ai/ask
 * Simple rule-based AI assistant (falls back to Anthropic if key is set).
 */
const ask = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Attempt Anthropic if key is configured
    if (process.env.ANTHROPIC_API_KEY) {
      const response = await callAnthropic(message);
      return res.json({ reply: response });
    }

    // Fallback: rule-based context-aware responses
    const lowerMsg = message.toLowerCase();
    let reply = "I'm TransitOps AI. Ask me about fleet status, trips, fuel efficiency, or maintenance.";

    if (lowerMsg.includes('vehicle') || lowerMsg.includes('fleet')) {
      const [total, active, maintenance] = await Promise.all([
        prisma.vehicle.count(),
        prisma.vehicle.count({ where: { status: 'ACTIVE' } }),
        prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
      ]);
      reply = `Your fleet has ${total} vehicles: ${active} active and ${maintenance} in maintenance.`;
    } else if (lowerMsg.includes('trip')) {
      const [total, active, today] = await Promise.all([
        prisma.trip.count(),
        prisma.trip.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.trip.count({
          where: {
            scheduledStart: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
      ]);
      reply = `Total trips: ${total}. Active right now: ${active}. Scheduled today: ${today}.`;
    } else if (lowerMsg.includes('fuel')) {
      const stats = await prisma.fuelLog.aggregate({
        _sum: { liters: true, totalCost: true },
        _avg: { pricePerLtr: true },
      });
      reply = `Fuel summary: ${stats._sum.liters?.toFixed(1) || 0}L consumed, ₹${stats._sum.totalCost?.toFixed(2) || 0} spent. Avg price: ₹${stats._avg.pricePerLtr?.toFixed(2) || 0}/L.`;
    } else if (lowerMsg.includes('maintenance')) {
      const pending = await prisma.maintenance.count({ where: { status: 'PENDING' } });
      reply = `There are ${pending} pending maintenance tasks. Schedule them promptly to avoid breakdowns.`;
    } else if (lowerMsg.includes('driver')) {
      const [total, active] = await Promise.all([
        prisma.driver.count(),
        prisma.driver.count({ where: { status: 'ACTIVE' } }),
      ]);
      reply = `You have ${total} drivers, ${active} currently active.`;
    } else if (lowerMsg.includes('expense') || lowerMsg.includes('cost')) {
      const expenses = await prisma.expense.aggregate({ _sum: { amount: true } });
      reply = `Total operational expenses: ₹${expenses._sum.amount?.toFixed(2) || 0}.`;
    }

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI request failed' });
  }
};

async function callAnthropic(message) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      system: 'You are TransitOps AI, a helpful assistant for a fleet management system. Be concise.',
      messages: [{ role: 'user', content: message }],
    }),
  });
  const data = await resp.json();
  return data.content?.[0]?.text || 'No response from AI';
}

module.exports = { ask };
