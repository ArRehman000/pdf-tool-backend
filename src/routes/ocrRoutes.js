const express = require('express');
const { processDocument, processDocumentFromUrl } = require('../controllers/ocrController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../config/multer');

const router = express.Router();

// All routes require authentication AND admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

/**
 * @route   POST /api/ocr/process
 * @desc    Process uploaded PDF/DOCX file with Mistral OCR or LlamaIndex
 * @access  Protected (Admin Only)
 * 
 * @param   {file} document - The file to process (PDF or DOCX only)
 * @param   {string} parser - Optional: 'mistral' or 'llama' (default: 'mistral')
 * @param   {string} table_format - Optional: 'html', 'markdown', or 'null' (default: 'html') [Mistral only]
 * @param   {boolean} extract_header - Optional: Extract headers (default: false) [Mistral only]
 * @param   {boolean} extract_footer - Optional: Extract footers (default: false) [Mistral only]
 * @param   {boolean} include_image_base64 - Optional: Include images as base64 (default: false) [Mistral only]
 * @param   {boolean} save_document - Optional: Save to database (default: false)
 */
router.post('/process', upload.single('document'), processDocument);

/**
 * @route   POST /api/ocr/process-url
 * @desc    Process document from public URL with Mistral OCR or LlamaIndex
 * @access  Protected (Admin Only)
 * 
 * @body    {string} document_url - Public URL of the document
 * @body    {string} parser - Optional: 'mistral' or 'llama' (default: 'mistral')
 * @body    {string} table_format - Optional: 'html', 'markdown', or 'null' (default: 'html') [Mistral only]
 * @body    {boolean} extract_header - Optional: Extract headers (default: false) [Mistral only]
 * @body    {boolean} extract_footer - Optional: Extract footers (default: false) [Mistral only]
 */
router.post('/process-url', processDocumentFromUrl);

module.exports = router;
