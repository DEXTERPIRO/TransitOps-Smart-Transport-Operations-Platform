const router = require('express').Router();
const ctrl = require('../controllers/fuelController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', authorize('ADMIN', 'FLEET_MANAGER'), ctrl.remove);

module.exports = router;
