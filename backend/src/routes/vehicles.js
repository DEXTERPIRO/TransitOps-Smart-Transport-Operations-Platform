const router = require('express').Router();
const ctrl = require('../controllers/vehicleController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER'), ctrl.create);
router.put('/:id', authorize('ADMIN', 'FLEET_MANAGER'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

module.exports = router;
