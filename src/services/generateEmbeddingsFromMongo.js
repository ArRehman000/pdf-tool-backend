const documentVectorModel = require("../models/Document");
const Document = require("../models/Document");
const { chunkText } = require("../utils/chunk");
const { getEmbedding } = require("./openaiembedings");


async function generateEmbeddingsForDocument(documentId) {
    const document = await Document.findById(documentId);

    if (!document) throw new Error('Document not found');

    console.log('🔵 Processing:', document.fileName);

    for (const page of document.pagesData) {
        const chunks = chunkText(page.text);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            const embedding = await getEmbedding(chunk);

            await documentVectorModel.create({
                documentId: document._id,
                pageNumber: page.pageNumber,
                chunkIndex: i,
                text: chunk,
                embedding,
                metadata: {
                    fileName: document.fileName,
                    parser: document.metadata?.parser,
                    category: document.metadata?.category,
                    bookName: document.metadata?.bookName,
                    authorName: document.metadata?.authorName
                }
            });

            console.log(`✅ Page ${page.pageNumber} Chunk ${i} embedded`);
        }
    }

    console.log('🎉 Embedding completed for document:', documentId);
}

module.exports = { generateEmbeddingsForDocument };
