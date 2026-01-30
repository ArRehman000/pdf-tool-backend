const Document = require('../models/Document');
const Embeddings = require('../models/embedings');
const { createEmbedding } = require('./openaiembedings');

const runningJobs = new Map();

async function processDocumentEmbeddings(documentId) {
    try {
        const document = await Document.findById(documentId);

        if (!document) throw new Error('Document not found');

        // Initialize progress if missing (first run safety)
        if (!document.embeddingProgress) {
            document.embeddingProgress = { currentPage: 0, currentChunk: 0 };
        }

        console.log('\n🚀 Starting embeddings for:', document.fileName);
        console.log('▶ Resume From Page:', document.embeddingProgress.currentPage,
            'Chunk:', document.embeddingProgress.currentChunk);

        document.embeddingStatus = 'processing';
        await document.save();

        // Collect all pages into a single array for one-time submission
        const allPages = document.pagesData;
        const allInputs = allPages.map(page => {
            const metadataStr = `[Metadata: Book: ${document.metadata?.bookName || 'N/A'}, Author: ${document.metadata?.authorName || 'N/A'}, Category: ${document.metadata?.category || 'N/A'}]`;
            const summaryStr = `[Summary: ${page.summary || 'N/A'}]`;
            return `${metadataStr} ${summaryStr}\n\n[Content]:\n${page.text}`;
        });

        console.log(`\n🚀 Submitting ALL ${allPages.length} pages in a single synchronous request...`);
        const embeddings = await createEmbedding(allInputs);
        console.log('✅ Received all embeddings. Storing in database...');

        // Process and save each embedding
        for (let i = 0; i < allPages.length; i++) {
            const page = allPages[i];
            const embedding = embeddings[i];

            try {
                await Embeddings.create({
                    documentId: document._id,
                    userId: document.userId,
                    fileName: document.fileName,
                    pageNumber: page.pageNumber,
                    chunkIndex: 0,
                    text: page.text,
                    embedding,
                    metadata: {
                        bookName: document.metadata?.bookName,
                        authorName: document.metadata?.authorName,
                        category: document.metadata?.category,
                        summary: page.summary,
                    },
                });
            } catch (e) {
                // Unique index will prevent duplicates if resuming or re-running
                if (e.code !== 11000) {
                    console.error(`   ⚠ Error saving page ${page.pageNumber}:`, e.message);
                }
            }
        }

        console.log(`   ✅ All embeddings stored successfully`);

        // All done
        document.embeddingStatus = 'completed';
        document.embeddingProgress = { currentPage: 0, currentChunk: 0 };
        await document.save();

        console.log('\n🎉 Embedding Completed for:', document.fileName);

    } catch (err) {
        console.error('❌ Embedding Error:', err.message);
    } finally {
        runningJobs.delete(documentId);
    }
}

module.exports = { processDocumentEmbeddings, runningJobs };
