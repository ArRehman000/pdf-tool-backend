const express = require('express');
const {
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentStats,
  searchDocuments,
  getDocumentPage,
  getDocumentPages,
  updateDocumentPage,
  deleteDocumentPage,
  findAndReplace,
  batchFindAndReplace,
  editTextPortion,
  previewFindAndReplace,
} = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/documents/stats
 * @desc    Get document statistics for user
 * @access  Protected (Admin & User)
 */
router.get('/stats', getDocumentStats);

/**
 * @route   GET /api/documents/search
 * @desc    Search documents by filename or content
 * @access  Protected (Admin & User)
 */
router.get('/search', searchDocuments);

/**
 * @route   GET /api/documents
 * @desc    Get all documents for authenticated user
 * @access  Protected (Admin & User)
 * @query   page, limit, sort
 */
router.get('/', getAllDocuments);

/**
 * @route   GET /api/documents/:id
 * @desc    Get single document by ID
 * @access  Protected (Admin & User)
 */
router.get('/:id', getDocumentById);

/**
 * @route   GET /api/documents/:id/pages
 * @desc    Get all pages from document with metadata
 * @access  Protected (Admin & User)
 */
router.get('/:id/pages', getDocumentPages);

/**
 * @route   GET /api/documents/:id/pages/:pageNumber
 * @desc    Get specific page from document
 * @access  Protected (Admin & User)
 */
router.get('/:id/pages/:pageNumber', getDocumentPage);

/**
 * @route   PUT /api/documents/:id/pages/:pageNumber
 * @desc    Update specific page in document
 * @access  Protected (Admin Only)
 */
router.put('/:id/pages/:pageNumber', roleMiddleware('admin'), updateDocumentPage);

/**
 * @route   DELETE /api/documents/:id/pages/:pageNumber
 * @desc    Delete specific page from document
 * @access  Protected (Admin Only)
 */
router.delete('/:id/pages/:pageNumber', roleMiddleware('admin'), deleteDocumentPage);

/**
 * @route   PUT /api/documents/:id
 * @desc    Update/Edit document text (full replacement)
 * @access  Protected (Admin Only)
 * @body    { editedText: string }
 */
router.put('/:id', roleMiddleware('admin'), updateDocument);

/**
 * @route   POST /api/documents/:id/find-replace
 * @desc    Find and replace text in document
 * @access  Protected (Admin Only)
 * @body    { find: string, replace: string, replaceAll?: boolean, caseSensitive?: boolean, useRegex?: boolean }
 */
router.post('/:id/find-replace', roleMiddleware('admin'), findAndReplace);

/**
 * @route   POST /api/documents/:id/batch-replace
 * @desc    Perform multiple find and replace operations
 * @access  Protected (Admin Only)
 * @body    { replacements: [{ find: string, replace: string }], caseSensitive?: boolean }
 */
router.post('/:id/batch-replace', roleMiddleware('admin'), batchFindAndReplace);

/**
 * @route   POST /api/documents/:id/edit-portion
 * @desc    Edit specific portion of text by character position
 * @access  Protected (Admin Only)
 * @body    { startPosition: number, endPosition: number, newText: string }
 */
router.post('/:id/edit-portion', roleMiddleware('admin'), editTextPortion);

/**
 * @route   POST /api/documents/:id/preview-replace
 * @desc    Preview find and replace without saving
 * @access  Protected (Admin Only)
 * @body    { find: string, replace: string, replaceAll?: boolean, caseSensitive?: boolean }
 */
router.post('/:id/preview-replace', roleMiddleware('admin'), previewFindAndReplace);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document
 * @access  Protected (Admin Only)
 */
router.delete('/:id', roleMiddleware('admin'), deleteDocument);

module.exports = router;
