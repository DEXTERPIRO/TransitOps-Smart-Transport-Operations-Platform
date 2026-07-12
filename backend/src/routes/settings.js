const router = require('express').Router();
const ctrl = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.put('/', authorize('ADMIN'), ctrl.upsert);
router.get('/users', authorize('ADMIN'), ctrl.getUsers);
router.post('/users', authorize('ADMIN'), ctrl.createUser);
router.put('/users/:id', authorize('ADMIN'), ctrl.updateUser);

module.exports = router;
