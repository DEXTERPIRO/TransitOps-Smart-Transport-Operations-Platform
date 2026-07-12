const router = require('express').Router();
const prisma = require('../utils/prisma');
const { verifyToken } = require('../middleware/auth');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    const systemPrompt = `You are TransitOps AI Assistant, an expert in fleet and transport operations management.

Current live fleet data:
- Total active vehicles: ${vehicles}
- Total active drivers: ${drivers}
- Active trips right now: ${trips}
- Vehicles currently in maintenance: ${maintenance}
- Drivers with licenses expiring within 30 days: ${expiringDrivers.length}
${expiringDrivers.map(d => `  • ${d.name}: expires ${new Date(d.licenseExpiry).toLocaleDateString('en-IN')}`).join('\n')}

Answer questions about fleet operations, maintenance scheduling, driver compliance, route optimization, and cost efficiency.
Be concise, practical, and specific to the data above when relevant. Keep answers under 200 words.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated.';
    res.json({ reply });
  } catch (e) {
    console.error('Groq AI error:', e);
    res.status(500).json({
      error: 'AI assistant unavailable. Check GROQ_API_KEY in .env'
    });
  }
});

module.exports = router;
