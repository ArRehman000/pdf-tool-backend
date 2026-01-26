const mongoose = require('mongoose');

const embeddingsSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    fileName: String,
    pageNumber: Number,
    text: String,

    embedding: {
        type: [Number], // 1536 floats
        required: true,
    },

    metadata: {
        bookName: String,
        authorName: String,
        category: String,
    },
    embeddingStatus: {
        type: String,
        enum: ['not_started', 'processing', 'completed'],
        default: 'not_started',
    },
    embeddingProgress: {
        currentPage: { type: Number, default: 0 },
        currentChunk: { type: Number, default: 0 },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Embeddings', embeddingsSchema);
