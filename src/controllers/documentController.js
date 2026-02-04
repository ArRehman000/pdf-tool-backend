const mongoose = require('mongoose');
const Document = require('../models/Document');

/**
 * Get all documents for the authenticated user
 * GET /api/documents
 * Protected route
 * Query params: page, limit, sort, search
 */
const getAllDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', search } = req.query;

    // Build query object
    // Admin sees ALL verified documents from any user + their OWN documents (verified or not)
    // User sees ONLY their own documents (verified or not)
    const query = req.user.role === 'admin'
      ? { $or: [{ isVerified: true }, { userId: req.user.userId }] }
      : { userId: req.user.userId };

    // Add search functionality if search parameter is provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fileName: { $regex: searchRegex } },
        { originalText: { $regex: searchRegex } },
        { editedText: { $regex: searchRegex } },
        { 'metadata.bookName': { $regex: searchRegex } },
        { 'metadata.authorName': { $regex: searchRegex } },
        { 'metadata.category': { $regex: searchRegex } },
      ];
    }

    // Get total count for pagination
    const totalDocuments = await Document.countDocuments(query);

    // Get documents with pagination and sorting
    const documents = await Document.find(query)
      .select('-detailedPages') // Exclude detailed pages for list view
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    return res.status(200).json({
      success: true,
      message: 'Documents retrieved successfully',
      data: {
        documents,
        totalPages: Math.ceil(totalDocuments / limit),
        currentPage: parseInt(page),
        totalDocuments,
      },
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents',
      error: error.message,
    });
  }
};

/**
 * Get single document by ID
 * GET /api/documents/:id
 * Protected route
 */
const getDocumentById = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Document retrieved successfully',
      data: document,
    });
  } catch (error) {
    console.error('Get document error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve document',
      error: error.message,
    });
  }
};

/**
 * Update/Edit document text
 * PUT /api/documents/:id
 * Protected route
 */
const updateDocument = async (req, res) => {
  try {
    const { editedText } = req.body;

    if (!editedText) {
      return res.status(400).json({
        success: false,
        message: 'editedText is required',
      });
    }

    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Update the edited text and status
    document.editedText = editedText;
    document.status = 'edited';
    await document.save();

    return res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: document,
    });
  } catch (error) {
    console.error('Update document error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error.message,
    });
  }
};

/**
 * Delete document
 * DELETE /api/documents/:id
 * Protected route
 */
const deleteDocument = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOneAndDelete(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message,
    });
  }
};

/**
 * Get document statistics for user
 * GET /api/documents/stats
 * Protected route
 */
const getDocumentStats = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { userId: req.user.userId };

    // For admin, we might want stats for all docs, or keep previous logic?
    // User requested "user role when login he can also upload...".
    // Admin stats are handled separately presumably, but if this endpoint is shared,
    // we should respect role. Assuming for now this endpoint is "My Stats" or "Global Stats" depending on role.
    const totalDocuments = await Document.countDocuments(query);
    const editedDocuments = await Document.countDocuments({
      ...query,
      status: 'edited',
    });

    const recentDocuments = await Document.find(query)
      .select('fileName createdAt status pages')
      .sort('-createdAt')
      .limit(5);

    const matchStage = req.user.role === 'admin' ? {} : { userId: new mongoose.Types.ObjectId(req.user.userId) };

    // Calculate total pages across all documents
    const totalPagesResult = await Document.aggregate([
      { $match: matchStage },
      { $group: { _id: null, total: { $sum: '$pages' } } }
    ]);
    const totalPages = totalPagesResult.length > 0 ? totalPagesResult[0].total : 0;

    return res.status(200).json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        totalDocuments,
        editedDocuments,
        originalDocuments: totalDocuments - editedDocuments,
        totalPages, // Added field
        recentDocuments,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message,
    });
  }
};

/**
 * Search documents
 * GET /api/documents/search
 * Protected route
 */
const searchDocuments = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const queryFilter = {
      $or: [
        { fileName: { $regex: query, $options: 'i' } },
        { originalText: { $regex: query, $options: 'i' } },
        { editedText: { $regex: query, $options: 'i' } },
      ],
    };

    if (req.user.role === 'admin') {
      // Admin finds verified documents OR their own documents
      queryFilter.$or = [
        ...queryFilter.$or.map(clause => ({ ...clause, isVerified: true })), // Search only in verified docs
        { userId: req.user.userId } // OR search in own docs
      ];
      // Note: The above logic for search is a bit complex in one query object.
      // Re-simplifying:
      const searchTerms = [
        { fileName: { $regex: query, $options: 'i' } },
        { originalText: { $regex: query, $options: 'i' } },
        { editedText: { $regex: query, $options: 'i' } },
      ];

      queryFilter.$and = [
        { $or: searchTerms },
        { $or: [{ isVerified: true }, { userId: req.user.userId }] }
      ];
      delete queryFilter.$or; // Removed the flat $or
    } else {
      // User only finds their own documents
      queryFilter.userId = req.user.userId;
    }

    const documents = await Document.find(queryFilter)
      .select('-detailedPages')
      .sort('-createdAt')
      .limit(20);

    return res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        documents,
        count: documents.length,
      },
    });
  } catch (error) {
    console.error('Search documents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search documents',
      error: error.message,
    });
  }
};

/**
 * Find and replace text in document
 * POST /api/documents/:id/find-replace
 * Protected route
 * 
 * Supports multiple replacements and regex patterns
 */
const findAndReplace = async (req, res) => {
  try {
    const { find, replace, replaceAll = true, caseSensitive = false, useRegex = false } = req.body;

    // Validation
    if (!find || replace === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Both "find" and "replace" fields are required',
      });
    }

    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Get the text to work with (use editedText if exists, otherwise originalText)
    let currentText = document.editedText || document.originalText;

    // Perform find and replace
    let newText;
    let replacementCount = 0;

    if (useRegex) {
      try {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(find, replaceAll ? flags : (caseSensitive ? '' : 'i'));

        // Count matches before replacement
        const matches = currentText.match(new RegExp(find, 'g' + (caseSensitive ? '' : 'i')));
        replacementCount = matches ? matches.length : 0;

        newText = currentText.replace(regex, replace);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid regex pattern',
          error: error.message,
        });
      }
    } else {
      // Escape special regex characters for literal string matching
      const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(escapedFind, replaceAll ? flags : (caseSensitive ? '' : 'i'));

      // Count matches
      const matches = currentText.match(new RegExp(escapedFind, 'g' + (caseSensitive ? '' : 'i')));
      replacementCount = matches ? matches.length : 0;

      newText = currentText.replace(regex, replace);
    }

    // Check if any replacements were made
    if (newText === currentText) {
      return res.status(200).json({
        success: true,
        message: 'No matches found for the search term',
        data: {
          replacementsMade: 0,
          textChanged: false,
        },
      });
    }

    // Update the document
    document.editedText = newText;
    document.status = 'edited';
    await document.save();

    return res.status(200).json({
      success: true,
      message: `Successfully replaced ${replacementCount} occurrence(s)`,
      data: {
        replacementsMade: replacementCount,
        textChanged: true,
        document: document,
      },
    });
  } catch (error) {
    console.error('Find and replace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform find and replace',
      error: error.message,
    });
  }
};

/**
 * Multiple find and replace operations in one request
 * POST /api/documents/:id/batch-replace
 * Protected route
 */
const batchFindAndReplace = async (req, res) => {
  try {
    const { replacements, caseSensitive = false } = req.body;

    // Validation
    if (!replacements || !Array.isArray(replacements) || replacements.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'replacements array is required and must contain at least one replacement',
        example: {
          replacements: [
            { find: 'old text 1', replace: 'new text 1' },
            { find: 'old text 2', replace: 'new text 2' }
          ]
        }
      });
    }

    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Get the text to work with
    let currentText = document.editedText || document.originalText;
    let totalReplacements = 0;
    const replacementDetails = [];

    // Perform all replacements sequentially
    for (const replacement of replacements) {
      if (!replacement.find || replacement.replace === undefined) {
        continue; // Skip invalid replacements
      }

      const escapedFind = replacement.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(escapedFind, flags);

      // Count matches
      const matches = currentText.match(new RegExp(escapedFind, 'g' + (caseSensitive ? '' : 'i')));
      const count = matches ? matches.length : 0;

      if (count > 0) {
        currentText = currentText.replace(regex, replacement.replace);
        totalReplacements += count;
        replacementDetails.push({
          find: replacement.find,
          replace: replacement.replace,
          count: count,
        });
      }
    }

    // Check if any replacements were made
    if (totalReplacements === 0) {
      return res.status(200).json({
        success: true,
        message: 'No matches found for any of the search terms',
        data: {
          totalReplacements: 0,
          textChanged: false,
        },
      });
    }

    // Update the document
    document.editedText = currentText;
    document.status = 'edited';
    await document.save();

    return res.status(200).json({
      success: true,
      message: `Successfully made ${totalReplacements} replacement(s) across ${replacementDetails.length} search term(s)`,
      data: {
        totalReplacements,
        textChanged: true,
        replacementDetails,
        document: document,
      },
    });
  } catch (error) {
    console.error('Batch find and replace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform batch replacements',
      error: error.message,
    });
  }
};

/**
 * Edit specific portion of text by character position
 * POST /api/documents/:id/edit-portion
 * Protected route
 */
const editTextPortion = async (req, res) => {
  try {
    const { startPosition, endPosition, newText } = req.body;

    // Validation
    if (startPosition === undefined || endPosition === undefined || newText === undefined) {
      return res.status(400).json({
        success: false,
        message: 'startPosition, endPosition, and newText are required',
        example: {
          startPosition: 0,
          endPosition: 10,
          newText: 'replacement text'
        }
      });
    }

    if (startPosition < 0 || endPosition < startPosition) {
      return res.status(400).json({
        success: false,
        message: 'Invalid position values. startPosition must be >= 0 and endPosition must be >= startPosition',
      });
    }

    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Get the text to work with
    let currentText = document.editedText || document.originalText;

    // Validate positions
    if (endPosition > currentText.length) {
      return res.status(400).json({
        success: false,
        message: `endPosition (${endPosition}) exceeds text length (${currentText.length})`,
      });
    }

    // Extract the portion being replaced
    const replacedText = currentText.substring(startPosition, endPosition);

    // Perform the replacement
    const updatedText = currentText.substring(0, startPosition) + newText + currentText.substring(endPosition);

    // Update the document
    document.editedText = updatedText;
    document.status = 'edited';
    await document.save();

    return res.status(200).json({
      success: true,
      message: 'Text portion edited successfully',
      data: {
        replacedText: replacedText,
        replacedLength: replacedText.length,
        newTextLength: newText.length,
        startPosition,
        endPosition,
        document: document,
      },
    });
  } catch (error) {
    console.error('Edit portion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to edit text portion',
      error: error.message,
    });
  }
};

/**
 * Preview find and replace without saving
 * POST /api/documents/:id/preview-replace
 * Protected route
 */
const previewFindAndReplace = async (req, res) => {
  try {
    const { find, replace, replaceAll = true, caseSensitive = false } = req.body;

    if (!find || replace === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Both "find" and "replace" fields are required',
      });
    }

    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Get the text to work with
    let currentText = document.editedText || document.originalText;

    // Find all matches and their positions
    const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = 'g' + (caseSensitive ? '' : 'i');
    const regex = new RegExp(escapedFind, flags);

    const matches = [];
    let match;
    while ((match = regex.exec(currentText)) !== null) {
      matches.push({
        text: match[0],
        position: match.index,
        length: match[0].length,
        context: currentText.substring(
          Math.max(0, match.index - 50),
          Math.min(currentText.length, match.index + match[0].length + 50)
        ),
      });

      if (!replaceAll) break; // Only find first match if not replacing all
    }

    return res.status(200).json({
      success: true,
      message: `Found ${matches.length} match(es)`,
      data: {
        matchCount: matches.length,
        matches: matches,
        willReplace: replaceAll ? matches.length : Math.min(matches.length, 1),
        preview: matches.length > 0,
      },
    });
  } catch (error) {
    console.error('Preview find and replace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to preview replacements',
      error: error.message,
    });
  }
};



/**
 * Verify document
 * POST /api/documents/:id/verify
 * Protected route
 */
const verifyDocument = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    // Only allow verifcation if the user owns the document (or is admin)
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    document.isVerified = true;
    await document.save();

    return res.status(200).json({
      success: true,
      message: 'Document verified successfully',
      data: document,
    });
  } catch (error) {
    console.error('Verify document error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify document',
      error: error.message,
    });
  }
};

/**
 * Get specific page from document
 * GET /api/documents/:id/pages/:pageNumber
 */
const getDocumentPage = async (req, res) => {
  try {
    const { pageNumber } = req.params;
    const pageNum = parseInt(pageNumber);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid page number',
      });
    }

    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Find the specific page
    const page = document.pagesData?.find(p => p.pageNumber === pageNum);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: `Page ${pageNum} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        documentId: document._id,
        fileName: document.fileName,
        totalPages: document.pages,
        currentPage: page,
      },
    });
  } catch (error) {
    console.error('Get document page error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve page',
      error: error.message,
    });
  }
};

/**
 * Get all pages from document
 * GET /api/documents/:id/pages
 */
const getDocumentPages = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        documentId: document._id,
        fileName: document.fileName,
        totalPages: document.pages,
        pages: document.pagesData || [],
        metadata: document.metadata,
      },
    });
  } catch (error) {
    console.error('Get document pages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve pages',
      error: error.message,
    });
  }
};

/**
 * Update a specific page in document
 * PUT /api/documents/:id/pages/:pageNumber
 * Admin only
 */
const updateDocumentPage = async (req, res) => {
  try {
    const { pageNumber } = req.params;
    const { text, markdown, header, footer } = req.body;
    const pageNum = parseInt(pageNumber);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid page number',
      });
    }

    if (!text && text !== '') {
      return res.status(400).json({
        success: false,
        message: 'Page text is required',
      });
    }

    // Find the document
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    if (!document.pagesData || !Array.isArray(document.pagesData)) {
      return res.status(400).json({
        success: false,
        message: 'Document has no page data',
      });
    }

    // Find the page to update
    const pageIndex = document.pagesData.findIndex(page => page.pageNumber === pageNum);

    if (pageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Page not found',
      });
    }

    // Update the page data
    document.pagesData[pageIndex].text = text;
    if (markdown !== undefined) document.pagesData[pageIndex].markdown = markdown;
    if (header !== undefined) document.pagesData[pageIndex].header = header;
    if (footer !== undefined) document.pagesData[pageIndex].footer = footer;

    // Update metadata
    document.pagesData[pageIndex].metadata = {
      ...document.pagesData[pageIndex].metadata,
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: text.length,
      processingTime: document.pagesData[pageIndex].metadata?.processingTime || 0, // Keep original processing time
      confidence: document.pagesData[pageIndex].metadata?.confidence || 0, // Keep original confidence
    };

    // Mark as edited and update timestamp
    document.status = 'edited';
    document.updatedAt = new Date();

    // Save the document
    await document.save();

    return res.status(200).json({
      success: true,
      message: `Page ${pageNum} updated successfully`,
      data: {
        updatedPageNumber: pageNum,
        pageData: document.pagesData[pageIndex],
        documentId: document._id,
      },
    });

  } catch (error) {
    console.error('Update page error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update page',
      error: error.message,
    });
  }
};

/**
 * Delete a specific page from document
 * DELETE /api/documents/:id/pages/:pageNumber
 * Admin only
 */
const deleteDocumentPage = async (req, res) => {
  try {
    const { pageNumber } = req.params;
    const pageNum = parseInt(pageNumber);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid page number',
      });
    }

    // Find the document
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }

    const document = await Document.findOne(query);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    if (!document.pagesData || !Array.isArray(document.pagesData)) {
      return res.status(400).json({
        success: false,
        message: 'Document has no page data',
      });
    }

    // Find the page to delete
    const pageIndex = document.pagesData.findIndex(page => page.pageNumber === pageNum);

    if (pageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Page not found',
      });
    }

    // Remove the page from pagesData array
    document.pagesData.splice(pageIndex, 1);

    // Renumber all subsequent pages
    for (let i = pageIndex; i < document.pagesData.length; i++) {
      document.pagesData[i].pageNumber = i + 1;
    }

    // Update the total pages count
    document.pages = document.pagesData.length;

    // Mark as edited
    document.status = 'edited';
    document.updatedAt = new Date();

    // Save the document
    await document.save();

    return res.status(200).json({
      success: true,
      message: `Page ${pageNum} deleted successfully`,
      data: {
        deletedPageNumber: pageNum,
        remainingPages: document.pages,
        documentId: document._id,
      },
    });

  } catch (error) {
    console.error('Delete page error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete page',
      error: error.message,
    });
  }
};

module.exports = {
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
  verifyDocument,
};
