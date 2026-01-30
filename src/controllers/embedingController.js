const { processDocumentEmbeddings, runningJobs } = require('../services/generateEmbeddingsFromMongo');
const Document = require('../models/Document');

exports.startEmbedding = async (req, res) => {
    const { documentId } = req.body;

    // Check if embedding is already running
    if (runningJobs.has(documentId)) {
        return res.status(400).json({
            success: false,
            message: 'Embedding is already in progress for this document'
        });
    }

    // Check if document exists and get its current status
    const document = await Document.findById(documentId);

    if (!document) {
        return res.status(404).json({
            success: false,
            message: 'Document not found'
        });
    }

    // Prevent re-embedding if already completed
    if (document.embeddingStatus === 'completed') {
        return res.status(400).json({
            success: false,
            message: 'This document has already been embedded. Embeddings are complete.',
            embeddingStatus: 'completed'
        });
    }

    console.log('▶ API Start Embedding:', documentId);

    const job = processDocumentEmbeddings(documentId);
    runningJobs.set(documentId, job);

    res.json({
        success: true,
        message: document.embeddingStatus === 'processing'
            ? 'Embedding resumed'
            : 'Embedding started',
        embeddingStatus: 'processing'
    });
};

exports.stopEmbedding = async (req, res) => {
    const { documentId } = req.body;

    runningJobs.delete(documentId);

    await Document.findByIdAndUpdate(documentId, {
        embeddingStatus: 'not_started'
    });

    res.json({
        success: true,
        message: 'Embedding stopped. Resume anytime.',
    });
};
