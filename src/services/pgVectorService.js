const { pool } = require('../config/pgConfig');

/**
 * Save a batch of embeddings to PostgreSQL
 * @param {Array} embeddingData - Array of objects containing text, embedding, and metadata
 */
const saveEmbeddingsBatch = async (embeddingData) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const queryText = `
            INSERT INTO document_embeddings (
                document_id, user_id, file_name, page_number, 
                chunk_index, text, embedding, book_name, 
                author_name, category, summary
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT DO NOTHING
        `;

        for (const item of embeddingData) {
            const values = [
                item.documentId.toString(),
                item.userId.toString(),
                item.fileName,
                item.pageNumber,
                item.chunkIndex,
                item.text,
                JSON.stringify(item.embedding), // pgvector requires [0.1, 0.2] format, not {0.1, 0.2}
                item.metadata?.bookName,
                item.metadata?.authorName,
                item.metadata?.category,
                item.metadata?.summary
            ];

            // Note: pg library handles converting arrays to [0.1, 0.2] format for vector(N) 
            // if the extension is properly configured. If not, we might need JSON.stringify(item.embedding).
            await client.query(queryText, values);
        }

        await client.query('COMMIT');
        return { success: true };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error saving to PG Vector:', err.message);
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Check if a document already has embeddings in PG
 * @param {string} documentId 
 */
const checkEmbeddingsExist = async (documentId) => {
    try {
        const res = await pool.query(
            'SELECT COUNT(*) FROM document_embeddings WHERE document_id = $1',
            [documentId.toString()]
        );
        return parseInt(res.rows[0].count) > 0;
    } catch (err) {
        console.error('❌ Error checking PG embeddings:', err.message);
        return false;
    }
};

module.exports = {
    saveEmbeddingsBatch,
    checkEmbeddingsExist,
};
