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

    console.log(`Processing file: ${req.file.originalname} with ${parser} parser`);

    // Process with selected parser
    let fullText, ocrResponse, parserMetadata;

    if (parser === 'llama') {
      // Use LlamaIndex parser
      const llamaResult = await llamaIndexService.parseDocument(filePath, req.file.originalname);

      fullText = llamaResult.text;
      parserMetadata = {
        parser: 'llama',
        model: llamaResult.metadata.model,
        jobId: llamaResult.jobId,
        pageCount: llamaResult.metadata.pageCount,
        processingTime: llamaResult.metadata.processingTime,
      };

      // Delete temporary file
      deleteFile(filePath);

      // Use actual pages from LlamaIndex
      ocrResponse = {
        pages: llamaResult.pages || [{
          pageNumber: 1,
          markdown: fullText,
          text: fullText,
        }],
        model: llamaResult.metadata.model,
      };

      console.log(`LlamaIndex extracted ${ocrResponse.pages.length} pages`);
    } else {
      // Use Mistral parser (via Service)
      const mistralResult = await mistralService.processDocument(
        filePath,
        req.file.originalname,
        {
          includeImageBase64: include_image_base64 === 'true' || include_image_base64 === true
        }
      );

      // Delete temporary file
      deleteFile(filePath);

      ocrResponse = mistralResult;

      const pages = ocrResponse.pages || [];
      fullText = pages.map(page => page.markdown).join('\n\n');

      parserMetadata = {
        parser: 'mistral',
        model: ocrResponse.model,
        usage: ocrResponse.usage || ocrResponse.usageInfo,
      };
    }

    // Check if user wants to save the document
    const saveDocument = req.body.save_document === 'true' || req.body.save_document === true;

    let savedDocument = null;

    if (saveDocument) {
      // Structure page-by-page data with metadata
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

      // Save document to database with page-by-page structure
      savedDocument = await Document.create({
        userId: req.user.userId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        originalText: fullText,
        pages: ocrResponse.pages.length,
        pagesData: pagesData,
        detailedPages: ocrResponse.pages,
        tables: ocrResponse.pages.flatMap(page => page.tables || []),
        images: ocrResponse.pages.flatMap(page => page.images || []),
        metadata: {
          ...parserMetadata,
          processedAt: new Date(),
          pageCount: ocrResponse.pages.length,
          ...(book_name && { bookName: book_name.trim() }),
          ...(author_name && { authorName: author_name.trim() }),
          ...(category && { category: category.trim() }),
        },
      });

      console.log(`Document saved with ID: ${savedDocument._id} (${pagesData.length} pages)`);
    }

    // Return processed data
    return res.status(200).json({
      success: true,
      message: saveDocument ? 'Document processed and saved successfully' : 'Document processed successfully',
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        pages: ocrResponse.pages.length,
        fullText: fullText,
        detailedPages: ocrResponse.pages,
        parser: parser,
        ...parserMetadata,
        ...(savedDocument && { documentId: savedDocument._id, saved: true }),
      },
    });
  } catch (error) {
    if (filePath) deleteFile(filePath);

    console.error('OCR processing error:', error);

    // Handle specific API key errors
    if (error.message && error.message.includes('MISTRAL_API_KEY')) {
      return res.status(500).json({
        success: false,
        message: 'Mistral API key is not configured.',
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to process document',
      error: error.message,
    });
  }
};

/**
 * Process document from URL using Mistral OCR or LlamaIndex
 * POST /api/ocr/process-url
 * Protected route - requires authentication
 */
const processDocumentFromUrl = async (req, res) => {
  try {
    const {
      document_url,
      parser = 'mistral',
      save_document = false,
      include_image_base64 = false,
      book_name,
      author_name,
      category,
    } = req.body;

    if (!document_url) {
      return res.status(400).json({ success: false, message: 'document_url is required' });
    }

    console.log(`Processing document from URL: ${document_url} with ${parser} parser`);

    let fullText, ocrResponse, parserMetadata;

    if (parser === 'llama') {
      const llamaResult = await llamaIndexService.parseDocumentFromUrl(document_url);
      fullText = llamaResult.text;
      parserMetadata = {
        parser: 'llama',
        model: llamaResult.metadata.model,
        jobId: llamaResult.jobId,
        pageCount: llamaResult.metadata.pageCount,
        processingTime: llamaResult.metadata.processingTime,
      };
      ocrResponse = {
        pages: llamaResult.pages || [{ pageNumber: 1, markdown: fullText, text: fullText }],
        model: llamaResult.metadata.model,
      };
    } else {
      // Mistral Service
      const mistralResult = await mistralService.processDocumentFromUrl(
        document_url,
        { includeImageBase64: include_image_base64 === 'true' || include_image_base64 === true }
      );

      ocrResponse = mistralResult;
      const pages = ocrResponse.pages || [];
      fullText = pages.map(page => page.markdown).join('\n\n');
      parserMetadata = {
        parser: 'mistral',
        model: ocrResponse.model,
        usage: ocrResponse.usage || ocrResponse.usageInfo,
      };
    }

    // Check if user wants to save the document
    const shouldSave = save_document === 'true' || save_document === true;
    let savedDocument = null;

    if (shouldSave) {
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

      savedDocument = await Document.create({
        userId: req.user.userId,
        fileName: path.basename(document_url),
        fileSize: 0,
        fileType: 'url',
        originalText: fullText,
        pages: ocrResponse.pages.length,
        pagesData: pagesData,
        detailedPages: ocrResponse.pages,
        metadata: {
          ...parserMetadata,
          processedAt: new Date(),
          pageCount: ocrResponse.pages.length,
          documentUrl: document_url,
          ...(book_name && { bookName: book_name.trim() }),
          ...(author_name && { authorName: author_name.trim() }),
          ...(category && { category: category.trim() }),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: shouldSave ? 'Document processed and saved successfully' : 'Document processed successfully',
      data: {
        documentUrl: document_url,
        pages: ocrResponse.pages.length,
        fullText: fullText,
        detailedPages: ocrResponse.pages,
        parser: parser,
        ...parserMetadata,
        ...(savedDocument && { documentId: savedDocument._id, saved: true }),
      },
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process document from URL',
      error: error.message,
    });
  }
};

module.exports = {
  processDocument,
  processDocumentFromUrl,
};
