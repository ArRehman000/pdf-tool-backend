const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const llamaIndexService = require('../services/llamaIndexService');

/**
 * Initialize Mistral client
 */
const getMistralClient = () => {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY is not set in environment variables');
  }

  return new Mistral({ apiKey });
};

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
  let uploadedFileId = null;

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
      parser = 'mistral', // Options: 'mistral', 'llama'
      table_format = 'html', // Options: null, 'markdown', 'html' (Mistral only)
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
      // Use Mistral parser (default) - PDF/DOCX only
      const client = getMistralClient();

      console.log('Uploading document to Mistral...');

      // Read file as buffer/Uint8Array
      const fileBuffer = fs.readFileSync(filePath);
      const uint8Array = new Uint8Array(fileBuffer);

      // Upload file to Mistral
      const uploadedFile = await client.files.upload({
        file: {
          fileName: req.file.originalname,
          content: uint8Array,
        },
        purpose: 'ocr',
      });

      uploadedFileId = uploadedFile.id;
      console.log(`File uploaded with ID: ${uploadedFileId}`);

      const documentPayload = {
        type: 'file',
        fileId: uploadedFileId,
      };

      // Call Mistral OCR API
      ocrResponse = await client.ocr.process({
        model: 'mistral-ocr-latest',
        document: documentPayload,
        table_format: table_format === 'null' ? null : table_format,
        extract_header: extract_header === 'true' || extract_header === true,
        extract_footer: extract_footer === 'true' || extract_footer === true,
        include_image_base64: include_image_base64 === 'true' || include_image_base64 === true,
      });

      // Delete temporary file
      deleteFile(filePath);

      // Delete uploaded file from Mistral if it was uploaded
      if (uploadedFileId) {
        try {
          await client.files.delete({ fileId: uploadedFileId });
          console.log(`Deleted file from Mistral: ${uploadedFileId}`);
        } catch (deleteError) {
          console.error('Error deleting file from Mistral:', deleteError.message);
        }
      }

      // Extract and format the response
      const pages = ocrResponse.pages || [];
      fullText = pages.map(page => page.markdown).join('\n\n');

      parserMetadata = {
        parser: 'mistral',
        model: ocrResponse.model,
        usage: ocrResponse.usage_info,
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
        pagesData: pagesData, // NEW: Structured page-by-page data
        detailedPages: ocrResponse.pages, // Legacy: Keep for backward compatibility
        tables: ocrResponse.pages.flatMap(page => page.tables || []),
        images: ocrResponse.pages.flatMap(page => page.images || []),
        metadata: {
          ...parserMetadata,
          processedAt: new Date(),
          pageCount: ocrResponse.pages.length,
          // Optional document metadata
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
    // Delete temporary file in case of error
    if (filePath) {
      deleteFile(filePath);
    }

    // Delete uploaded file from Mistral if it was uploaded
    if (uploadedFileId) {
      try {
        const client = getMistralClient();
        await client.files.delete({ fileId: uploadedFileId });
        console.log(`Deleted file from Mistral after error: ${uploadedFileId}`);
      } catch (deleteError) {
        console.error('Error deleting file from Mistral:', deleteError.message);
      }
    }

    console.error('OCR processing error:', error);

    // Handle specific API key errors
    if (error.message && error.message.includes('MISTRAL_API_KEY')) {
      return res.status(500).json({
        success: false,
        message: 'Mistral API key is not configured. Please set MISTRAL_API_KEY in environment variables.',
        error: error.message,
      });
    }

    if (error.message && error.message.includes('LLAMAINDEX_API_KEY')) {
      return res.status(500).json({
        success: false,
        message: 'LlamaIndex API key is not configured. Please set LLAMAINDEX_API_KEY in environment variables.',
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
      table_format = 'html',
      extract_header = false,
      extract_footer = false
    } = req.body;

    // Validate URL
    if (!document_url) {
      return res.status(400).json({
        success: false,
        message: 'document_url is required',
      });
    }

    // Validate parser option
    if (parser !== 'mistral' && parser !== 'llama') {
      return res.status(400).json({
        success: false,
        message: 'Invalid parser option. Use "mistral" or "llama".',
      });
    }

    console.log(`Processing document from URL: ${document_url} with ${parser} parser`);

    let fullText, ocrResponse, parserMetadata;

    if (parser === 'llama') {
      // Use LlamaIndex parser
      const llamaResult = await llamaIndexService.parseDocumentFromUrl(document_url);

      fullText = llamaResult.text;
      parserMetadata = {
        parser: 'llama',
        model: llamaResult.metadata.model,
        jobId: llamaResult.jobId,
        pageCount: llamaResult.metadata.pageCount,
        processingTime: llamaResult.metadata.processingTime,
      };

      // Use actual pages from LlamaIndex
      ocrResponse = {
        pages: llamaResult.pages || [{
          pageNumber: 1,
          markdown: fullText,
          text: fullText,
        }],
        model: llamaResult.metadata.model,
      };

      console.log(`LlamaIndex extracted ${ocrResponse.pages.length} pages from URL`);
    } else {
      // Use Mistral parser (default) - PDF/DOCX only
      const client = getMistralClient();

      const documentPayload = {
        type: 'document_url',
        documentUrl: document_url,
      };

      // Call Mistral OCR API
      ocrResponse = await client.ocr.process({
        model: 'mistral-ocr-latest',
        document: documentPayload,
        table_format: table_format === 'null' ? null : table_format,
        extract_header: extract_header,
        extract_footer: extract_footer,
        include_image_base64: false,
      });

      // Extract and format the response
      const pages = ocrResponse.pages || [];
      fullText = pages.map(page => page.markdown).join('\n\n');

      parserMetadata = {
        parser: 'mistral',
        model: ocrResponse.model,
        usage: ocrResponse.usage_info,
      };
    }

    // Return processed data
    return res.status(200).json({
      success: true,
      message: 'Document processed successfully',
      data: {
        documentUrl: document_url,
        pages: ocrResponse.pages.length,
        fullText: fullText,
        detailedPages: ocrResponse.pages,
        parser: parser,
        ...parserMetadata,
      },
    });
  } catch (error) {
    console.error('OCR processing error:', error);

    if (error.message && error.message.includes('MISTRAL_API_KEY')) {
      return res.status(500).json({
        success: false,
        message: 'Mistral API key is not configured. Please set MISTRAL_API_KEY in environment variables.',
        error: error.message,
      });
    }

    if (error.message && error.message.includes('LLAMAINDEX_API_KEY')) {
      return res.status(500).json({
        success: false,
        message: 'LlamaIndex API key is not configured. Please set LLAMAINDEX_API_KEY in environment variables.',
        error: error.message,
      });
    }

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
