const router = require('express').Router();
const ctrl = require('../controllers/expenseController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/summary', ctrl.getSummary);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', authorize('ADMIN', 'FINANCE'), ctrl.remove);

module.exports = router;
