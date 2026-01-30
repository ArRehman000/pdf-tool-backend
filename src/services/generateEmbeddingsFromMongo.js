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

        // Collect all pages into a single array
        const allPages = document.pagesData;
        const allInputs = allPages.map(page => {
            const metadataStr = `[Metadata: Book: ${document.metadata?.bookName || 'N/A'}, Author: ${document.metadata?.authorName || 'N/A'}, Category: ${document.metadata?.category || 'N/A'}]`;
            const summaryStr = `[Summary: ${page.summary || 'N/A'}]`;
            return `${metadataStr} ${summaryStr}\n\n[Content]:\n${page.text}`;
        });

        const BATCH_SIZE = 20; // Safe number of pages to stay under token limits
        console.log(`\n🚀 Processing ${allPages.length} pages in batches of ${BATCH_SIZE}...`);

        for (let i = 0; i < allInputs.length; i += BATCH_SIZE) {
            const currentBatchInputs = allInputs.slice(i, i + BATCH_SIZE);
            const currentBatchPages = allPages.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(allInputs.length / BATCH_SIZE);

            console.log(`\n📦 Submitting Batch ${batchNum}/${totalBatches} (${currentBatchInputs.length} pages)...`);
            const embeddings = await createEmbedding(currentBatchInputs);
            console.log(`✅ Received Batch ${batchNum} embeddings. Storing...`);

            // Process and save each embedding in the current batch
            for (let j = 0; j < currentBatchPages.length; j++) {
                const page = currentBatchPages[j];
                const embedding = embeddings[j];

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

            // Update progress in DB (optional but good for tracking)
            document.embeddingProgress = {
                currentPage: i + currentBatchInputs.length,
                currentChunk: 0
            };
            await document.save();
        }

        console.log(`   ✅ All embeddings stored successfully`);

        // All done
        document.embeddingStatus = 'completed';
        document.embeddingProgress = { currentPage: 0, currentChunk: 0 };
        await document.save();

        console.log('\n🎉 Embedding Completed for:', document.fileName);

    } catch (err) {
        console.error('❌ Embedding Error:', err.message);
        throw err; // Re-throw so the caller knows it failed
    } finally {
        runningJobs.delete(documentId);
    }
}

module.exports = { processDocumentEmbeddings, runningJobs };
