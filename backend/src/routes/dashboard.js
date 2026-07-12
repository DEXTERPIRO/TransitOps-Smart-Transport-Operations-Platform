const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', ctrl.getStats);
router.get('/recent-trips', ctrl.getRecentTrips);
router.get('/expense-trend', ctrl.getExpenseTrend);
router.get('/active-trips-map', ctrl.getActiveTripsMap);

module.exports = router;
