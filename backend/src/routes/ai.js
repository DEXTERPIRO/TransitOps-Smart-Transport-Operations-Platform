const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');
const prisma = new PrismaClient();

router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message)
      return res.status(400).json({ error: 'Message required' });

    // Get real fleet context from database
    const [vehicles, drivers, trips, maintenance] = await Promise.all([
      prisma.vehicle.count({ where: { isActive: true } }),
      prisma.driver.count({ where: { isActive: true } }),
      prisma.trip.count({ where: { status: 'DISPATCHED' } }),
      prisma.maintenanceLog.count({ where: { status: 'ACTIVE' } })
    ]);

    const expiringDrivers = await prisma.driver.findMany({
      where: {
        isActive: true,
        licenseExpiry: {
          lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: { name: true, licenseExpiry: true }
    });

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const systemPrompt = `You are TransitOps AI Assistant, an expert in 
fleet and transport operations management.

Current fleet data:
- Total vehicles: ${vehicles}
- Total drivers: ${drivers}  
- Active trips right now: ${trips}
- Vehicles in maintenance: ${maintenance}
- Drivers with expiring licenses (30 days): ${expiringDrivers.length}
${expiringDrivers.map(d => `  • ${d.name}: expires ${new Date(d.licenseExpiry).toLocaleDateString()}`).join('\n')}

Answer questions about fleet operations, maintenance scheduling, 
driver compliance, route optimization, and cost efficiency.
Be concise, practical, and specific to the data above when relevant.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    });

    res.json({ reply: response.content[0].text });
  } catch (e) {
    console.error('AI error:', e);
    res.status(500).json({
      error: 'AI assistant unavailable. Check ANTHROPIC_API_KEY in .env'
    });
  }
});

module.exports = router;
