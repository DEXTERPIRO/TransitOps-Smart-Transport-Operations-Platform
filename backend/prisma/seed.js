const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Clear all tables
  await prisma.vehicleDocument.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const pass = async (p) => bcrypt.hash(p, 12);
  
  const fleet = await prisma.user.create({ data: {
    name: 'Fleet Manager', email: 'fleet@transitops.com',
    password: await pass('Fleet@123'), role: 'FLEET_MANAGER'
  }});
  const dispatch = await prisma.user.create({ data: {
    name: 'Dispatcher', email: 'dispatch@transitops.com',
    password: await pass('Dispatch@123'), role: 'DISPATCHER'
  }});
  const safety = await prisma.user.create({ data: {
    name: 'Safety Officer', email: 'safety@transitops.com',
    password: await pass('Safety@123'), role: 'SAFETY_OFFICER'
  }});
  const finance = await prisma.user.create({ data: {
    name: 'Financial Analyst', email: 'finance@transitops.com',
    password: await pass('Finance@123'), role: 'FINANCIAL_ANALYST'
  }});

  // Vehicles
  const v1 = await prisma.vehicle.create({ data: {
    registrationNo: 'VAN-05', name: 'Ford Transit Van',
    type: 'VAN', maxLoadCapacity: 500, odometer: 12400,
    acquisitionCost: 850000, region: 'North', status: 'AVAILABLE'
  }});
  const v2 = await prisma.vehicle.create({ data: {
    registrationNo: 'TRUCK-8', name: 'Tata Ace Truck',
    type: 'TRUCK', maxLoadCapacity: 2000, odometer: 45200,
    acquisitionCost: 1200000, region: 'South', status: 'AVAILABLE'
  }});
  const v3 = await prisma.vehicle.create({ data: {
    registrationNo: 'AG10-09', name: 'Mahindra Bolero',
    type: 'CAR', maxLoadCapacity: 400, odometer: 8900,
    acquisitionCost: 650000, region: 'East', status: 'IN_SHOP'
  }});
  const v4 = await prisma.vehicle.create({ data: {
    registrationNo: 'BUS-01', name: 'Ashok Leyland Bus',
    type: 'BUS', maxLoadCapacity: 5000, odometer: 98000,
    acquisitionCost: 3500000, region: 'West', status: 'AVAILABLE'
  }});

  // Drivers
  const d1 = await prisma.driver.create({ data: {
    name: 'Alex Johnson', email: 'alex@transitops.com', licenseNumber: 'DL-4945',
    licenseCategory: 'LMV', contactNumber: '+91 9876543210',
    licenseExpiry: new Date('2026-08-15'),
    safetyScore: 94, region: 'North', status: 'AVAILABLE'
  }});
  const d2 = await prisma.driver.create({ data: {
    name: 'Sam Patel', email: 'strangegaming66@gmail.com', licenseNumber: 'DL-8800',
    licenseCategory: 'HMV', contactNumber: '+91 9765432109',
    licenseExpiry: new Date('2025-03-10'),
    safetyScore: 78, region: 'South', status: 'AVAILABLE'
  }});
  const d3 = await prisma.driver.create({ data: {
    name: 'Rajan Mehta', email: 'rajan@transitops.com', licenseNumber: 'DL-4400',
    licenseCategory: 'LMV', contactNumber: '+91 9654321098',
    licenseExpiry: new Date('2024-12-01'),
    safetyScore: 61, region: 'East', status: 'SUSPENDED'
  }});
  const d4 = await prisma.driver.create({ data: {
    name: 'Priya Sharma', email: 'priya@transitops.com', licenseNumber: 'DL-6620',
    licenseCategory: 'HMV', contactNumber: '+91 9543210987',
    licenseExpiry: new Date('2027-06-30'),
    safetyScore: 98, region: 'West', status: 'AVAILABLE'
  }});

  // Trips
  const t1 = await prisma.trip.create({ data: {
    tripCode: 'TR001', source: 'Mumbai', destination: 'Pune',
    vehicleId: v1.id, driverId: d1.id, dispatchedById: dispatch.id,
    cargoWeight: 450, plannedDistance: 148, revenue: 12000,
    status: 'COMPLETED', actualDistance: 152, fuelConsumed: 18,
    startOdometer: 12400, endOdometer: 12552,
    startedAt: new Date('2024-07-01T08:00:00'),
    completedAt: new Date('2024-07-01T12:00:00'),
  }});
  const t2 = await prisma.trip.create({ data: {
    tripCode: 'TR002', source: 'Delhi', destination: 'Agra',
    vehicleId: v2.id, driverId: d2.id, dispatchedById: dispatch.id,
    cargoWeight: 1200, plannedDistance: 210, revenue: 18000,
    status: 'DISPATCHED',
    startedAt: new Date(),
  }});

  await prisma.trip.createMany({ data: [
    {
      tripCode: 'TR003', source: 'Mumbai', destination: 'Nashik',
      vehicleId: v1.id, driverId: d1.id, dispatchedById: dispatch.id,
      cargoWeight: 300, plannedDistance: 167, revenue: 9500,
      status: 'COMPLETED', actualDistance: 170, fuelConsumed: 20,
      startOdometer: 12552, endOdometer: 12722,
      startedAt: new Date('2024-08-05T09:00:00'),
      completedAt: new Date('2024-08-05T13:00:00'),
    },
    {
      tripCode: 'TR004', source: 'Delhi', destination: 'Jaipur',
      vehicleId: v4.id, driverId: d4.id, dispatchedById: dispatch.id,
      cargoWeight: 2000, plannedDistance: 280, revenue: 25000,
      status: 'COMPLETED', actualDistance: 285, fuelConsumed: 45,
      startOdometer: 98000, endOdometer: 98285,
      startedAt: new Date('2024-09-10T07:00:00'),
      completedAt: new Date('2024-09-10T14:00:00'),
    },
    {
      tripCode: 'TR005', source: 'Bangalore', destination: 'Chennai',
      vehicleId: v1.id, driverId: d1.id, dispatchedById: dispatch.id,
      cargoWeight: 400, plannedDistance: 346, revenue: 18000,
      status: 'COMPLETED', actualDistance: 350, fuelConsumed: 42,
      startOdometer: 12722, endOdometer: 13072,
      startedAt: new Date('2024-10-15T06:00:00'),
      completedAt: new Date('2024-10-15T15:00:00'),
    },
    {
      tripCode: 'TR006', source: 'Pune', destination: 'Nagpur',
      vehicleId: v2.id, driverId: d4.id, dispatchedById: dispatch.id,
      cargoWeight: 1500, plannedDistance: 480, revenue: 32000,
      status: 'COMPLETED', actualDistance: 488, fuelConsumed: 68,
      startOdometer: 45200, endOdometer: 45688,
      startedAt: new Date('2024-11-20T05:00:00'),
      completedAt: new Date('2024-11-20T18:00:00'),
    },
  ]});

  // Update statuses for dispatched trip
  await prisma.vehicle.update({ where: { id: v2.id }, data: { status: 'ON_TRIP' }});
  await prisma.driver.update({ where: { id: d2.id }, data: { status: 'ON_TRIP' }});

  // Maintenance
  await prisma.maintenanceLog.create({ data: {
    vehicleId: v3.id, type: 'OIL_CHANGE',
    description: 'Routine oil change and filter replacement',
    cost: 3500, serviceCenter: 'AutoCare Garage',
    status: 'ACTIVE'
  }});

  // Fuel logs
  await prisma.fuelLog.createMany({ data: [
    { vehicleId: v1.id, liters: 40, costPerL: 95.5,
      totalCost: 3820, odometer: 12400, station: 'HP Pump' },
    { vehicleId: v2.id, liters: 80, costPerL: 96.0,
      totalCost: 7680, odometer: 45200, station: 'BPCL Pump' },
    { vehicleId: v1.id, liters: 18, costPerL: 95.5,
      totalCost: 1719, odometer: 12552 },
  ]});

  // Expenses
  await prisma.expense.createMany({ data: [
    { vehicleId: v1.id, type: 'TOLL', amount: 540,
      description: 'Mumbai-Pune expressway toll' },
    { vehicleId: v2.id, type: 'PARKING', amount: 200,
      description: 'Overnight parking Delhi' },
  ]});

  console.log('✅ TransitOps database seeded successfully!');
  console.log('Fleet Manager:  fleet@transitops.com / Fleet@123');
  console.log('Dispatcher:     dispatch@transitops.com / Dispatch@123');
  console.log('Safety Officer: safety@transitops.com / Safety@123');
  console.log('Finance:        finance@transitops.com / Finance@123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
