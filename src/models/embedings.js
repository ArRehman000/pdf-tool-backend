const { atlasConn } = require('../config/db');
const mongoose = require('mongoose');

const embeddingsSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
        index: true,
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    fileName: String,

    pageNumber: {
        type: Number,
        required: true,
    },

    chunkIndex: {
        type: Number,
        required: true,
    },

    text: {
        type: String,
        required: true,
    },

    embedding: {
        type: [Number],
        required: true,
    },

    metadata: {
        bookName: String,
        authorName: String,
        category: String,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// 🔐 Prevent duplicate embeddings
embeddingsSchema.index(
    { documentId: 1, pageNumber: 1, chunkIndex: 1 },
    { unique: true }
);

module.exports = atlasConn.model('Embeddings', embeddingsSchema);
