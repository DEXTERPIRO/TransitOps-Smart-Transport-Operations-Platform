const router = require('express').Router();
const prisma = require('../utils/prisma');
const { verifyToken, requireRoles } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, vehicleId, driverId, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;
    if (driverId) where.driverId = driverId;
    if (search) where.OR = [
      { tripCode: { contains: search, mode: 'insensitive' } },
      { source: { contains: search, mode: 'insensitive' } },
      { destination: { contains: search, mode: 'insensitive' } },
    ];

    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: true,
        driver: true,
        dispatchedBy: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(trips);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: true, driver: true,
        dispatchedBy: { select: { name: true } }
      }
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// CREATE trip (DRAFT)
router.post('/', verifyToken,
  requireRoles('DISPATCHER', 'FLEET_MANAGER'), async (req, res) => {
  try {
    const {
      source, destination, vehicleId, driverId,
      cargoWeight, plannedDistance, revenue, scheduledAt, notes
    } = req.body;

    // Input validation
    if (!source || !destination || !vehicleId || !driverId
        || !cargoWeight || !plannedDistance)
      return res.status(400).json({
        error: 'Source, destination, vehicle, driver, cargo weight, distance required'
      });

    if (parseFloat(cargoWeight) <= 0)
      return res.status(400).json({
        error: 'Cargo weight must be greater than 0'
      });

    // BUSINESS RULE: Check vehicle availability
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });
    if (!vehicle)
      return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.status === 'RETIRED')
      return res.status(400).json({
        error: 'Retired vehicles cannot be assigned to trips'
      });
    if (vehicle.status === 'IN_SHOP')
      return res.status(400).json({
        error: 'Vehicle is currently in maintenance and unavailable'
      });
    if (vehicle.status !== 'AVAILABLE')
      return res.status(400).json({
        error: `Vehicle ${vehicle.registrationNo} is ${vehicle.status} and cannot be dispatched`
      });

    // BUSINESS RULE: Check cargo weight vs max capacity
    if (parseFloat(cargoWeight) > vehicle.maxLoadCapacity)
      return res.status(400).json({
        error: `Cargo weight ${cargoWeight} kg exceeds vehicle max capacity of ${vehicle.maxLoadCapacity} kg`
      });

    // BUSINESS RULE: Check driver availability
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });
    if (!driver)
      return res.status(404).json({ error: 'Driver not found' });
    if (driver.status === 'SUSPENDED')
      return res.status(400).json({
        error: `Driver ${driver.name} is suspended and cannot be assigned`
      });
    if (driver.status !== 'AVAILABLE')
      return res.status(400).json({
        error: `Driver ${driver.name} is currently ${driver.status}`
      });

    // BUSINESS RULE: Check license expiry
    if (new Date(driver.licenseExpiry) < new Date())
      return res.status(400).json({
        error: `Driver ${driver.name} has an expired license (expired ${new Date(driver.licenseExpiry).toLocaleDateString()})`
      });

    // Generate trip code
    const count = await prisma.trip.count();
    const tripCode = `TR${String(count + 1).padStart(3, '0')}`;

    const trip = await prisma.trip.create({
      data: {
        tripCode, source, destination,
        vehicleId, driverId, dispatchedById: req.user.id,
        cargoWeight: parseFloat(cargoWeight),
        plannedDistance: parseFloat(plannedDistance),
        revenue: revenue ? parseFloat(revenue) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes, status: 'DRAFT'
      },
      include: { vehicle: true, driver: true }
    });

    res.status(201).json(trip);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DISPATCH trip (DRAFT → DISPATCHED)
router.put('/:id/dispatch', verifyToken,
  requireRoles('DISPATCHER', 'FLEET_MANAGER'), async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true, driver: true }
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status !== 'DRAFT')
      return res.status(400).json({
        error: 'Only DRAFT trips can be dispatched'
      });

    // Re-validate before dispatch
    if (trip.vehicle.status !== 'AVAILABLE')
      return res.status(400).json({
        error: `Vehicle ${trip.vehicle.registrationNo} is no longer available`
      });
    if (trip.driver.status !== 'AVAILABLE')
      return res.status(400).json({
        error: `Driver ${trip.driver.name} is no longer available`
      });

    // BUSINESS RULE: Dispatch → both vehicle and driver become ON_TRIP
    await prisma.$transaction([
      prisma.trip.update({
        where: { id: req.params.id },
        data: { status: 'DISPATCHED', startedAt: new Date() }
      }),
      prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'ON_TRIP' }
      }),
      prisma.driver.update({
        where: { id: trip.driverId },
        data: { status: 'ON_TRIP' }
      }),
    ]);

    const updated = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true, driver: true }
    });

    const io = req.app.get('io');
    io.to('dashboard').emit('trip-dispatched', updated);
    io.to(`trip-${req.params.id}`).emit('trip-status-changed', updated);

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// COMPLETE trip (DISPATCHED → COMPLETED)
router.put('/:id/complete', verifyToken,
  requireRoles('DISPATCHER', 'FLEET_MANAGER'), async (req, res) => {
  try {
    const { endOdometer, fuelConsumed, actualDistance } = req.body;

    if (!endOdometer)
      return res.status(400).json({
        error: 'End odometer reading is required to complete a trip'
      });

    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true, driver: true }
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status !== 'DISPATCHED')
      return res.status(400).json({
        error: 'Only DISPATCHED trips can be completed'
      });

    if (parseFloat(endOdometer) < (trip.startOdometer || 0))
      return res.status(400).json({
        error: 'End odometer must be greater than start odometer'
      });

    // BUSINESS RULE: Complete → both become AVAILABLE
    await prisma.$transaction([
      prisma.trip.update({
        where: { id: req.params.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          endOdometer: parseFloat(endOdometer),
          fuelConsumed: fuelConsumed ? parseFloat(fuelConsumed) : null,
          actualDistance: actualDistance ? parseFloat(actualDistance) : null,
        }
      }),
      prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: 'AVAILABLE',
          odometer: parseFloat(endOdometer)
        }
      }),
      prisma.driver.update({
        where: { id: trip.driverId },
        data: { status: 'AVAILABLE' }
      }),
    ]);

    const updated = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true, driver: true }
    });

    const io = req.app.get('io');
    io.to('dashboard').emit('trip-completed', updated);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// CANCEL trip
router.put('/:id/cancel', verifyToken,
  requireRoles('DISPATCHER', 'FLEET_MANAGER'), async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id }
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (!['DRAFT', 'DISPATCHED'].includes(trip.status))
      return res.status(400).json({
        error: 'Only DRAFT or DISPATCHED trips can be cancelled'
      });

    const updates = [
      prisma.trip.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' }
      })
    ];

    // BUSINESS RULE: Cancelling dispatched trip restores statuses
    if (trip.status === 'DISPATCHED') {
      updates.push(
        prisma.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: 'AVAILABLE' }
        }),
        prisma.driver.update({
          where: { id: trip.driverId },
          data: { status: 'AVAILABLE' }
        })
      );
    }

    await prisma.$transaction(updates);
    const updated = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true, driver: true }
    });

    const io = req.app.get('io');
    io.to('dashboard').emit('trip-cancelled', updated);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
