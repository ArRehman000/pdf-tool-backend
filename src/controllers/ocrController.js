const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const llamaIndexService = require('../services/llamaIndexService');
const mistralService = require('../services/mistralService');

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
      table_format = 'html',
      extract_header = false,
      extract_footer = false,
      include_image_base64 = false,
      book_name,
      author_name,
      category,
    } = req.body;

    // Validate parser option
    if (parser !== 'mistral' && parser !== 'llama') {
      deleteFile(filePath);
      return res.status(400).json({
        success: false,
        message: 'Invalid parser option. Use "mistral" or "llama".',
      });
    }

    console.log(`Processing file: ${req.file.originalname} with ${parser} parser (Async)`);

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
      };
      ocrResponse = {
        pages: llamaResult.pages || [{ pageNumber: 1, text: fullText, markdown: fullText }],
        model: llamaResult.metadata.model,
      };
    } else {
      const mistralResult = await mistralService.processDocument(
        filePath,
        originalName,
        { includeImageBase64: options.include_image_base64 === 'true' || options.include_image_base64 === true }
      );
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
    } = req.body;

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
    backgroundProcessUrl(newDocument._id, document_url, parser).catch(err => {
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
const backgroundProcessUrl = async (documentId, documentUrl, parser) => {
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
      const mistralResult = await mistralService.processDocumentFromUrl(documentUrl);
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
