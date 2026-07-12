const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://postgres:postgres123@localhost:5432/transitops',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('🌱 Seeding TransitOps database...');

  // ── Users ─────────────────────────────────────────────────────────────
  const users = [
    { name: 'Fleet Manager', email: 'fleet@transitops.com',    password: 'Fleet@123',    role: 'FLEET_MANAGER' },
    { name: 'Dispatcher',    email: 'dispatch@transitops.com', password: 'Dispatch@123', role: 'DISPATCHER' },
    { name: 'Safety Officer',email: 'safety@transitops.com',   password: 'Safety@123',   role: 'SAFETY_OFFICER' },
    { name: 'Finance',       email: 'finance@transitops.com',  password: 'Finance@123',  role: 'FINANCE' },
    { name: 'Admin',         email: 'admin@transitops.com',    password: 'Admin@123',    role: 'ADMIN' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: await bcrypt.hash(u.password, 12) },
    });
  }
  console.log('✅ Users seeded');

  // ── Vehicles ──────────────────────────────────────────────────────────
  const vehicles = [
    { regNumber: 'MH12AB1234', make: 'Tata',    model: 'Starbus',  year: 2021, type: 'BUS',     capacity: 52, status: 'ACTIVE',      fuelType: 'DIESEL' },
    { regNumber: 'MH12CD5678', make: 'Ashok',   model: 'Viking',   year: 2020, type: 'BUS',     capacity: 45, status: 'ACTIVE',      fuelType: 'DIESEL' },
    { regNumber: 'MH12EF9012', make: 'Force',   model: 'Traveller',year: 2022, type: 'MINIBUS', capacity: 17, status: 'MAINTENANCE', fuelType: 'DIESEL' },
    { regNumber: 'MH12GH3456', make: 'Mahindra',model: 'Supro',    year: 2023, type: 'VAN',     capacity: 9,  status: 'ACTIVE',      fuelType: 'CNG' },
    { regNumber: 'MH12IJ7890', make: 'Tata',    model: 'Ultra',    year: 2019, type: 'TRUCK',   capacity: 0,  status: 'ACTIVE',      fuelType: 'DIESEL' },
    { regNumber: 'MH12KL2345', make: 'Volvo',   model: '9400',     year: 2022, type: 'BUS',     capacity: 55, status: 'INACTIVE',    fuelType: 'DIESEL' },
  ];

  const createdVehicles = [];
  for (const v of vehicles) {
    const veh = await prisma.vehicle.upsert({
      where: { regNumber: v.regNumber },
      update: {},
      create: { ...v, odometer: Math.random() * 100000 + 10000 },
    });
    createdVehicles.push(veh);
  }
  console.log('✅ Vehicles seeded');

  // ── Drivers ───────────────────────────────────────────────────────────
  const drivers = [
    { employeeId: 'EMP001', name: 'Ramesh Kumar',   email: 'ramesh@transitops.com',   phone: '9876543210', licenseNumber: 'MH0120210001', licenseExpiry: new Date('2027-06-30'), experience: 8 },
    { employeeId: 'EMP002', name: 'Suresh Patel',   email: 'suresh@transitops.com',   phone: '9876543211', licenseNumber: 'MH0120200002', licenseExpiry: new Date('2026-12-31'), experience: 5 },
    { employeeId: 'EMP003', name: 'Anil Singh',     email: 'anil@transitops.com',     phone: '9876543212', licenseNumber: 'MH0120190003', licenseExpiry: new Date('2025-03-31'), experience: 12 },
    { employeeId: 'EMP004', name: 'Vijay Sharma',   email: 'vijay@transitops.com',    phone: '9876543213', licenseNumber: 'MH0120220004', licenseExpiry: new Date('2028-08-31'), experience: 3 },
    { employeeId: 'EMP005', name: 'Priya Desai',    email: 'priya@transitops.com',    phone: '9876543214', licenseNumber: 'MH0120230005', licenseExpiry: new Date('2029-01-31'), experience: 2 },
  ];

  const createdDrivers = [];
  for (const d of drivers) {
    const drv = await prisma.driver.upsert({
      where: { employeeId: d.employeeId },
      update: {},
      create: d,
    });
    createdDrivers.push(drv);
  }
  console.log('✅ Drivers seeded');

  // ── Routes ────────────────────────────────────────────────────────────
  const routes = [
    { name: 'City Central - Airport',      code: 'RT001', origin: 'City Central',   destination: 'Airport',       distance: 28.5, duration: 45 },
    { name: 'Station - Industrial Zone',   code: 'RT002', origin: 'Railway Station',destination: 'Industrial Zone', distance: 15.2, duration: 30 },
    { name: 'University Loop',             code: 'RT003', origin: 'University',     destination: 'University',    distance: 22.0, duration: 60 },
    { name: 'Suburban Express',            code: 'RT004', origin: 'Downtown',       destination: 'Suburbs North', distance: 35.8, duration: 55 },
  ];

  const createdRoutes = [];
  for (const r of routes) {
    const rt = await prisma.route.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    });
    createdRoutes.push(rt);
  }
  console.log('✅ Routes seeded');

  // ── Trips ─────────────────────────────────────────────────────────────
  const now = new Date();
  const trips = [
    {
      tripNumber: 'TRP-00001',
      vehicleId: createdVehicles[0].id,
      driverId: createdDrivers[0].id,
      routeId: createdRoutes[0].id,
      status: 'IN_PROGRESS',
      scheduledStart: new Date(now.getTime() - 30 * 60000),
      scheduledEnd: new Date(now.getTime() + 15 * 60000),
      actualStart: new Date(now.getTime() - 30 * 60000),
      currentLat: 19.076,
      currentLng: 72.877,
      passengerCount: 38,
    },
    {
      tripNumber: 'TRP-00002',
      vehicleId: createdVehicles[1].id,
      driverId: createdDrivers[1].id,
      routeId: createdRoutes[1].id,
      status: 'COMPLETED',
      scheduledStart: new Date(now.getTime() - 3 * 3600000),
      scheduledEnd: new Date(now.getTime() - 2.5 * 3600000),
      actualStart: new Date(now.getTime() - 3 * 3600000),
      actualEnd: new Date(now.getTime() - 2.5 * 3600000),
      passengerCount: 42,
      distance: 15.2,
    },
    {
      tripNumber: 'TRP-00003',
      vehicleId: createdVehicles[3].id,
      driverId: createdDrivers[2].id,
      routeId: createdRoutes[2].id,
      status: 'SCHEDULED',
      scheduledStart: new Date(now.getTime() + 2 * 3600000),
      scheduledEnd: new Date(now.getTime() + 3 * 3600000),
    },
  ];

  for (const t of trips) {
    await prisma.trip.upsert({
      where: { tripNumber: t.tripNumber },
      update: {},
      create: t,
    });
  }
  console.log('✅ Trips seeded');

  // ── Maintenance ───────────────────────────────────────────────────────
  const maintenance = [
    {
      vehicleId: createdVehicles[2].id,
      type: 'EMERGENCY',
      status: 'IN_PROGRESS',
      title: 'Engine Overhaul',
      description: 'Major engine issue detected — overhaul required',
      scheduledDate: new Date(),
      cost: 45000,
      vendor: 'Force Authorized Service',
    },
    {
      vehicleId: createdVehicles[0].id,
      type: 'SCHEDULED',
      status: 'PENDING',
      title: 'Regular Service',
      description: '10,000 km service — oil, filters, brakes',
      scheduledDate: new Date(now.getTime() + 5 * 24 * 3600000),
      vendor: 'Tata Authorized Centre',
    },
  ];

  for (const m of maintenance) {
    await prisma.maintenance.create({ data: m });
  }
  console.log('✅ Maintenance seeded');

  // ── Fuel Logs ─────────────────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const veh = createdVehicles[i % createdVehicles.length];
    const liters = Math.round(Math.random() * 80 + 20);
    const price = 90 + Math.random() * 10;
    await prisma.fuelLog.create({
      data: {
        vehicleId: veh.id,
        date: new Date(now.getTime() - i * 2 * 24 * 3600000),
        liters,
        pricePerLtr: parseFloat(price.toFixed(2)),
        totalCost: parseFloat((liters * price).toFixed(2)),
        odometer: 50000 + i * 1200,
        station: `Fuel Station ${i + 1}`,
        fuelType: veh.fuelType,
      },
    });
  }
  console.log('✅ Fuel logs seeded');

  // ── Expenses ──────────────────────────────────────────────────────────
  const expenseData = [
    { category: 'FUEL', amount: 12500, description: 'Monthly fuel reimbursement' },
    { category: 'MAINTENANCE', amount: 45000, description: 'Engine repair MH12EF9012' },
    { category: 'INSURANCE', amount: 28000, description: 'Annual insurance renewal' },
    { category: 'TOLL', amount: 3200, description: 'Highway tolls — July' },
    { category: 'DRIVER_SALARY', amount: 125000, description: 'July driver salaries' },
    { category: 'PERMIT', amount: 8500, description: 'Route permit renewal' },
  ];

  for (const e of expenseData) {
    await prisma.expense.create({
      data: { ...e, vehicleId: createdVehicles[0].id, date: new Date() },
    });
  }
  console.log('✅ Expenses seeded');

  // ── Settings ──────────────────────────────────────────────────────────
  const settings = [
    { key: 'company_name', value: 'TransitOps Fleet Co.' },
    { key: 'currency', value: 'INR' },
    { key: 'timezone', value: 'Asia/Kolkata' },
    { key: 'fuel_alert_threshold', value: '20' },
    { key: 'maintenance_alert_days', value: '7' },
  ];

  for (const s of settings) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('✅ Settings seeded');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Demo credentials:');
  console.log('   Admin:          admin@transitops.com    / Admin@123');
  console.log('   Fleet Manager:  fleet@transitops.com   / Fleet@123');
  console.log('   Dispatcher:     dispatch@transitops.com / Dispatch@123');
  console.log('   Safety Officer: safety@transitops.com  / Safety@123');
  console.log('   Finance:        finance@transitops.com / Finance@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
