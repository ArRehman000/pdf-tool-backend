const { processDocument, processDocumentFromUrl, getDocumentStatus } = require('../controllers/ocrController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../config/multer');

const router = require('express').Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/ocr/process
 * @desc    Process uploaded PDF/DOCX file with Mistral OCR or LlamaIndex
 * @access  Protected (User or Admin)
 */
router.post('/process', upload.single('document'), processDocument);

/**
 * @route   POST /api/ocr/process-url
 * @desc    Process document from public URL with Mistral OCR or LlamaIndex
 * @access  Protected (User or Admin)
 */
router.post('/process-url', processDocumentFromUrl);

/**
 * @route   GET /api/ocr/status/:id
 * @desc    Get document processing status
 * @access  Protected (User or Admin)
 */
router.get('/status/:id', getDocumentStatus);

module.exports = router;
