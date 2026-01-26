const mongoose = require('mongoose');

const documentVectorSchema = new mongoose.Schema({
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true },
    pageNumber: Number,
    chunkIndex: Number,
    text: String,
    embedding: {
        type: [Number],
        required: true
    },
    metadata: {
        fileName: String,
        parser: String,
        category: String,
        bookName: String,
        authorName: String
    }
}, { timestamps: true });

module.exports = mongoose.model('DocumentVector', documentVectorSchema);
