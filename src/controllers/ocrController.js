const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const llamaIndexService = require('../services/llamaIndexService');
const mistralService = require('../services/mistralService');
const { PDFDocument } = require('pdf-lib');

/**
 * Delete temporary uploaded file
 * @param {string} filePath - Path to the file to delete
 */
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

/**
 * Process document using Mistral OCR or LlamaIndex
 * POST /api/ocr/process
 * Protected route - requires authentication
 */
/**
 * Process document using Mistral OCR or LlamaIndex (Asynchronous)
 * POST /api/ocr/process
 * Protected route - requires authentication
 */
const processDocument = async (req, res) => {
  let filePath = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a PDF or DOCX file.',
      });
    }

    filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    // Validate file type
    const allowedExtensions = ['.pdf', '.docx'];
    if (!allowedExtensions.includes(fileExtension)) {
      deleteFile(filePath);
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only PDF and DOCX files are allowed.',
      });
    }

    // Get options from request body
    const {
      parser = 'mistral',
      table_format = null,
      extract_header = false,
      extract_footer = false,
      include_image_base64 = false,
      book_name,
      author_name,
      category,
      document_annotation,
      bbox_annotation,
    } = req.body;

    // Parse stringified JSON if needed (Multer sends as strings)
    let parsedDocAnnotation = document_annotation;
    let parsedBboxAnnotation = bbox_annotation;

    if (typeof document_annotation === 'string' && document_annotation) {
      try { parsedDocAnnotation = JSON.parse(document_annotation); } catch (e) { console.warn('Failed to parse document_annotation:', e); }
    }

    if (typeof bbox_annotation === 'string' && bbox_annotation) {
      try { parsedBboxAnnotation = JSON.parse(bbox_annotation); } catch (e) { console.warn('Failed to parse bbox_annotation:', e); }
    }

    // Validate parser option
    if (parser !== 'mistral' && parser !== 'llama') {
      deleteFile(filePath);
      return res.status(400).json({
        success: false,
        message: 'Invalid parser option. Use "mistral" or "llama".',
      });
    }

    console.log(`Processing file: ${req.file.originalname} with ${parser} parser (Async)`);

    // Detect page count for safety checks
    let detectedPageCount = 0;
    if (fileExtension === '.pdf') {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        detectedPageCount = pdfDoc.getPageCount();
        console.log(`Detected page count for ${req.file.originalname}: ${detectedPageCount}`);
      } catch (pageError) {
        console.warn(`Failed to detect page count for ${req.file.originalname}:`, pageError.message);
      }
    }

    // Mistral Safety Checks: document_annotation is limited to 8 pages
    let finalDocAnnotation = parsedDocAnnotation;
    if (parser === 'mistral' && parsedDocAnnotation && detectedPageCount > 8) {
      console.warn(`⚠️ Document has ${detectedPageCount} pages. Mistral "document_annotation" is limited to 8 pages. Disabling annotation to prevent 503 error.`);
      finalDocAnnotation = null;
    }

    // Create a database entry with 'processing' status first
    const newDocument = await Document.create({
      userId: req.user.userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      originalText: 'Processing...', // Placeholder
      parsingStatus: 'processing',
      metadata: {
        parser: parser,
        processedAt: new Date(),
        ...(book_name && { bookName: book_name.trim() }),
        ...(author_name && { authorName: author_name.trim() }),
        ...(category && { category: category.trim() }),
      },
      isVerified: req.user.role === 'admin'
    });

    // Run the actual processing in the background (DO NOT AWAIT)
    backgroundProcessDocument(
      newDocument._id,
      filePath,
      req.file.originalname,
      parser,
      {
        table_format,
        extract_header,
        extract_footer,
        include_image_base64,
        document_annotation: finalDocAnnotation,
        bbox_annotation: parsedBboxAnnotation,
      }
    ).catch(err => {
      console.error(`Background processing failed for ${newDocument._id}:`, err);
    });

    // Return the document ID immediately
    return res.status(202).json({
      success: true,
      message: 'Document upload successful. Processing started in background.',
      data: {
        documentId: newDocument._id,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        parser: parser,
        status: 'processing'
      },
    });

  } catch (error) {
    if (filePath) deleteFile(filePath);
    console.error('OCR initialization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize document processing',
      error: error.message,
    });
  }
};

/**
 * Internal helper for background processing
 */
const backgroundProcessDocument = async (documentId, filePath, originalName, parser, options) => {
  try {
    let fullText, ocrResponse, parserMetadata;

    if (parser === 'llama') {
      const llamaResult = await llamaIndexService.parseDocument(filePath, originalName);
      fullText = llamaResult.text;
      parserMetadata = {
        model: llamaResult.metadata.model,
        jobId: llamaResult.jobId,
        pageCount: llamaResult.metadata.pageCount,
        processingTime: llamaResult.metadata.processingTime,
        usage: llamaResult.metadata.usage,
      };
      ocrResponse = {
        pages: llamaResult.pages || [{ pageNumber: 1, text: fullText, markdown: fullText }],
        model: llamaResult.metadata.model,
      };
    } else {
      let mistralResult;
      try {
        mistralResult = await mistralService.processDocument(
          filePath,
          originalName,
          {
            includeImageBase64: options.include_image_base64 === 'true' || options.include_image_base64 === true,
            extractHeader: options.extract_header === 'true' || options.extract_header === true,
            extractFooter: options.extract_footer === 'true' || options.extract_footer === true,
            tableFormat: options.table_format || null,
            documentAnnotation: options.document_annotation,
            bboxAnnotation: options.bbox_annotation,
          }
        );
      } catch (mistralError) {
        // Retry without annotations if they were requested and failed
        if (options.document_annotation || options.bbox_annotation) {
          console.warn(`Mistral OCR with annotations failed (likely 503 or page limit). Retrying without annotations... Error: ${mistralError.message}`);
          mistralResult = await mistralService.processDocument(
            filePath,
            originalName,
            {
              includeImageBase64: options.include_image_base64 === 'true' || options.include_image_base64 === true,
              extractHeader: options.extract_header === 'true' || options.extract_header === true,
              extractFooter: options.extract_footer === 'true' || options.extract_footer === true,
              tableFormat: options.table_format || null,
              documentAnnotation: null,
              bboxAnnotation: null,
            }
          );
        } else {
          throw mistralError;
        }
      }
      ocrResponse = mistralResult;
      fullText = ocrResponse.pages.map(page => page.markdown).join('\n\n');
      parserMetadata = {
        model: ocrResponse.model,
        usage: ocrResponse.usage || ocrResponse.usageInfo,
      };
    }

    // Cleanup file
    deleteFile(filePath);

    // Update document in database
    const pagesData = ocrResponse.pages.map((page, index) => {
      const pageText = page.text || page.markdown || '';
      return {
        pageNumber: page.page_number || index + 1,
        text: pageText,
        markdown: page.markdown || pageText,
        tables: page.tables || [],
        images: page.images || [],
        header: page.header || null,
        footer: page.footer || null,
        metadata: {
          confidence: page.confidence || null,
          processingTime: page.processing_time || null,
          wordCount: pageText.split(/\s+/).filter(w => w.length > 0).length,
          characterCount: pageText.length,
        },
        summary: page.summary || null,
      };
    });

    await Document.findByIdAndUpdate(documentId, {
      originalText: fullText,
      pages: ocrResponse.pages.length,
      pagesData: pagesData,
      detailedPages: ocrResponse.pages,
      tables: ocrResponse.pages.flatMap(page => page.tables || []),
      images: ocrResponse.pages.flatMap(page => page.images || []),
      parsingStatus: 'completed',
      'metadata.model': parserMetadata.model,
      'metadata.jobId': parserMetadata.jobId,
      'metadata.pageCount': ocrResponse.pages.length,
      'metadata.processingTime': parserMetadata.processingTime,
      'metadata.usage': parserMetadata.usage,
      'metadata.documentAnnotation': ocrResponse.documentAnnotation,
    });

    console.log(`✅ Background processing completed for ${documentId}`);
  } catch (error) {
    console.error(`❌ Background processing failed for ${documentId}:`, error);
    await Document.findByIdAndUpdate(documentId, {
      parsingStatus: 'failed',
      'metadata.error': error.message
    });
    if (filePath) deleteFile(filePath);
  }
};

/**
 * Process document from URL (Asynchronous)
 * POST /api/ocr/process-url
 */
const processDocumentFromUrl = async (req, res) => {
  try {
    const {
      document_url,
      parser = 'mistral',
      book_name,
      author_name,
      category,
      document_annotation,
      bbox_annotation,
      table_format = null,
    } = req.body;

    // Parse stringified JSON if needed
    let parsedDocAnnotation = document_annotation;
    let parsedBboxAnnotation = bbox_annotation;

    if (typeof document_annotation === 'string' && document_annotation) {
      try { parsedDocAnnotation = JSON.parse(document_annotation); } catch (e) { console.warn('Failed to parse document_annotation:', e); }
    }

    if (typeof bbox_annotation === 'string' && bbox_annotation) {
      try { parsedBboxAnnotation = JSON.parse(bbox_annotation); } catch (e) { console.warn('Failed to parse bbox_annotation:', e); }
    }

    if (!document_url) {
      return res.status(400).json({ success: false, message: 'document_url is required' });
    }

    console.log(`Processing document from URL: ${document_url} with ${parser} parser (Async)`);

    // Create entry
    const newDocument = await Document.create({
      userId: req.user.userId,
      fileName: path.basename(document_url),
      fileSize: 0,
      fileType: 'url',
      originalText: 'Processing URL...',
      parsingStatus: 'processing',
      metadata: {
        parser: parser,
        documentUrl: document_url,
        processedAt: new Date(),
        ...(book_name && { bookName: book_name.trim() }),
        ...(author_name && { authorName: author_name.trim() }),
        ...(category && { category: category.trim() }),
      },
      isVerified: req.user.role === 'admin'
    });

    // Background process
    backgroundProcessUrl(newDocument._id, document_url, parser, {
      document_annotation: parsedDocAnnotation,
      bbox_annotation: parsedBboxAnnotation,
    }).catch(err => {
      console.error(`Background URL processing failed for ${newDocument._id}:`, err);
    });

    return res.status(202).json({
      success: true,
      message: 'Document URL submitted. Processing started in background.',
      data: {
        documentId: newDocument._id,
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('URL OCR initialization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize document URL processing',
      error: error.message,
    });
  }
};

/**
 * Internal helper for background URL processing
 */
const backgroundProcessUrl = async (documentId, documentUrl, parser, options = {}) => {
  try {
    let fullText, ocrResponse, parserMetadata;

    if (parser === 'llama') {
      const llamaResult = await llamaIndexService.parseDocumentFromUrl(document_url);
      fullText = llamaResult.text;
      parserMetadata = {
        model: llamaResult.metadata.model,
        jobId: llamaResult.jobId,
        pageCount: llamaResult.metadata.pageCount,
        processingTime: llamaResult.metadata.processingTime,
      };
      ocrResponse = {
        pages: llamaResult.pages,
        model: llamaResult.metadata.model
      };
    } else {
      let mistralResult;
      try {
        mistralResult = await mistralService.processDocumentFromUrl(documentUrl, {
          documentAnnotation: options.document_annotation,
          bboxAnnotation: options.bbox_annotation,
          extractHeader: true,
          extractFooter: true,
          tableFormat: options.table_format || null
        });
      } catch (mistralError) {
        // Retry without annotations if they failed
        if (options.document_annotation || options.bbox_annotation) {
          console.warn(`Mistral URL OCR with annotations failed. Retrying without annotations... Error: ${mistralError.message}`);
          mistralResult = await mistralService.processDocumentFromUrl(documentUrl, {
            documentAnnotation: null,
            bboxAnnotation: null,
            extractHeader: true,
            extractFooter: true,
            tableFormat: options.table_format || null
          });
        } else {
          throw mistralError;
        }
      }
      ocrResponse = mistralResult;
      fullText = ocrResponse.pages.map(page => page.markdown).join('\n\n');
      parserMetadata = {
        model: ocrResponse.model,
        usage: ocrResponse.usage || ocrResponse.usageInfo
      };
    }

    const pagesData = ocrResponse.pages.map((page, index) => {
      const pageText = page.text || page.markdown || '';
      return {
        pageNumber: page.page_number || index + 1,
        text: pageText,
        markdown: page.markdown || pageText,
        metadata: {
          wordCount: pageText.split(/\s+/).filter(w => w.length > 0).length,
          characterCount: pageText.length,
        },
      };
    });

    await Document.findByIdAndUpdate(documentId, {
      originalText: fullText,
      pages: ocrResponse.pages.length,
      pagesData: pagesData,
      detailedPages: ocrResponse.pages,
      parsingStatus: 'completed',
      'metadata.model': parserMetadata.model,
      'metadata.jobId': parserMetadata.jobId,
      'metadata.pageCount': ocrResponse.pages.length,
      'metadata.processingTime': parserMetadata.processingTime,
      'metadata.usage': parserMetadata.usage,
      'metadata.documentAnnotation': ocrResponse.documentAnnotation,
    });

    console.log(`✅ Background URL processing completed for ${documentId}`);
  } catch (error) {
    console.error(`❌ Background URL processing failed for ${documentId}:`, error);
    await Document.findByIdAndUpdate(documentId, {
      parsingStatus: 'failed',
      'metadata.error': error.message
    });
  }
};

/**
 * Get document processing status
 * GET /api/ocr/status/:id
 */
const getDocumentStatus = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Check ownership
    // Convert both to string to ensure strictly equal comparison (ObjectId vs String issues)
    if (document.userId.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    return res.status(200).json({
      success: true,
      status: document.parsingStatus,
      data: document.parsingStatus === 'completed' ? {
        documentId: document._id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        fileType: document.fileType,
        pages: document.pages,
        fullText: document.originalText,
        detailedPages: document.pagesData,
        ...document.metadata
      } : null,
      error: document.parsingStatus === 'failed' ? document.metadata.error : null
    });
  } catch (error) {
    console.error('Error fetching document status:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  processDocument,
  processDocumentFromUrl,
  getDocumentStatus,
};
