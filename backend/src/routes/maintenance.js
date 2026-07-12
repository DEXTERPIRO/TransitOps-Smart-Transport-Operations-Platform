const router = require('express').Router();
const ctrl = require('../controllers/maintenanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER', 'SAFETY_OFFICER'), ctrl.create);
router.put('/:id', authorize('ADMIN', 'FLEET_MANAGER', 'SAFETY_OFFICER'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

module.exports = router;
