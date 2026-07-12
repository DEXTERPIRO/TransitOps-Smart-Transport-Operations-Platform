const router = require('express').Router();
const { ask } = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/ask', ask);

module.exports = router;
