const { coolifyConn } = require('../config/db');
const mongoose = require('mongoose');

/**
 * Document Schema
 * Stores OCR processed documents with editable text
 */
const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  originalText: {
    type: String,
    required: true,
  },
  editedText: {
    type: String,
    default: null,
  },
  pages: {
    type: Number,
    default: 1,
  },
  // Page-by-page storage with metadata
  pagesData: [{
    pageNumber: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    markdown: String,
    tables: [{
      type: mongoose.Schema.Types.Mixed,
    }],
    images: [{
      type: mongoose.Schema.Types.Mixed,
    }],
    header: String,
    footer: String,
    metadata: {
      confidence: Number,
      processingTime: Number,
      wordCount: Number,
      characterCount: Number,
    },
    summary: String,
  }],
  // Legacy field for backward compatibility
  detailedPages: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  tables: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  images: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  metadata: {
    model: String,
    parser: String,
    usage: mongoose.Schema.Types.Mixed,
    processedAt: Date,
    jobId: String,
    pageCount: Number,
    processingTime: String,
    // Optional document metadata
    bookName: String,
    authorName: String,
    category: String,
  },
  status: {
    type: String,
    enum: ['original', 'edited'],
    default: 'original',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  embeddingStatus: {
    type: String,
    enum: ['not_started', 'processing', 'completed'],
    default: 'not_started',
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  embeddingProgress: {
    currentPage: { type: Number, default: 0 },
    currentChunk: { type: Number, default: 0 },
  },

  parsingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'completed', // Default to completed for existing documents
  },

});

// Update the updatedAt timestamp before saving
documentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create index for faster queries
documentSchema.index({ userId: 1, createdAt: -1 });

const documentVectorModel = coolifyConn.model('Document', documentSchema);

module.exports = documentVectorModel;
