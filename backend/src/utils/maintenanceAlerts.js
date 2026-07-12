const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALERT_THRESHOLD_KM = 5000;

const checkMaintenanceNeeded = async () => {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      isActive: true,
      status: { not: 'RETIRED' },
    },
    include: {
      maintenanceLogs: {
        where: { status: 'CLOSED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const alerts = [];

  for (const v of vehicles) {
    const lastService = v.maintenanceLogs[0];
    // Use odometer at close time if stored, otherwise 0 as baseline
    const lastServiceOdo = lastService?.endOdometer || 0;
    const kmSinceService = v.odometer - lastServiceOdo;

    if (kmSinceService >= ALERT_THRESHOLD_KM) {
      const severity = kmSinceService >= 10000 ? 'HIGH' : 'MEDIUM';
      alerts.push({
        vehicleId:      v.id,
        vehicleName:    v.name,
        registrationNo: v.registrationNo,
        currentOdometer: v.odometer,
        lastServiceOdo,
        kmSinceService,
        severity,
        message: `${v.name} (${v.registrationNo}) has traveled ${kmSinceService.toLocaleString()} km since last service. ${severity === 'HIGH' ? 'Immediate maintenance required.' : 'Maintenance recommended.'}`,
      });
    }
  }

  // Sort: HIGH severity first, then by km descending
  alerts.sort((a, b) => {
    if (a.severity !== b.severity)
      return a.severity === 'HIGH' ? -1 : 1;
    return b.kmSinceService - a.kmSinceService;
  });

  return alerts;
};

module.exports = { checkMaintenanceNeeded };
