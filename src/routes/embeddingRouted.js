const { startEmbedding, stopEmbedding } = require('../controllers/embedingController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = require('express').Router();


router.post('/start', authMiddleware, roleMiddleware('admin'), startEmbedding);

module.exports = router;
