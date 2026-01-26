const Document = require('../models/Document');
const Embeddings = require('../models/embedings');
const chunkText = require('../utils/chunk');
const { createEmbedding } = require('./openaiembedings');

async function processDocumentEmbeddings(documentId) {
    const document = await Document.findById(documentId);

    if (!document) throw new Error('Document not found');

    console.log('▶ Starting embeddings for:', document.fileName);

    document.embeddingStatus = 'processing';
    await document.save();

    for (let p = document.embeddingProgress.currentPage; p < document.pagesData.length; p++) {
        const page = document.pagesData[p];
        console.log(`📄 Processing Page ${page.pageNumber}`);

        const chunks = chunkText(page.text);

        for (
            let c =
                p === document.embeddingProgress.currentPage
                    ? document.embeddingProgress.currentChunk
                    : 0;
            c < chunks.length;
            c++
        ) {
            const chunk = chunks[c];

            console.log(`   ➤ Chunk ${c + 1}/${chunks.length}`);

            const embedding = await createEmbedding(chunk);

            try {
                await Embeddings.create({
                    documentId: document._id,
                    userId: document.userId,
                    fileName: document.fileName,
                    pageNumber: page.pageNumber,
                    text: chunk,
                    embedding,
                    metadata: {
                        bookName: document.metadata?.bookName,
                        authorName: document.metadata?.authorName,
                        category: document.metadata?.category,
                    },
                });
            } catch (e) {
                console.log('⚠ Duplicate chunk skipped');
            }

            // ✅ SAVE PROGRESS AFTER EVERY CHUNK
            document.embeddingProgress.currentPage = p;
            document.embeddingProgress.currentChunk = c + 1;
            await document.save();
        }

        // reset chunk when page completes
        document.embeddingProgress.currentChunk = 0;
        await document.save();
    }

    document.embeddingStatus = 'completed';
    await document.save();

    console.log('✅ Embedding Completed for:', document.fileName);
}

module.exports = { processDocumentEmbeddings };
