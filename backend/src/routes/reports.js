const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/fleet-summary', ctrl.fleetSummary);
router.get('/fleet-summary/pdf', ctrl.fleetSummaryPDF);
router.get('/expense-summary', ctrl.expenseSummary);
router.get('/trip-analysis', ctrl.tripAnalysis);

module.exports = router;
