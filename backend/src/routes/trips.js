const router = require('express').Router();
const ctrl = require('../controllers/tripController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER', 'DISPATCHER'), ctrl.create);
router.put('/:id', authorize('ADMIN', 'FLEET_MANAGER', 'DISPATCHER'), ctrl.update);
router.patch('/:id/location', ctrl.updateLocation);
router.delete('/:id', authorize('ADMIN', 'FLEET_MANAGER'), ctrl.remove);

module.exports = router;
