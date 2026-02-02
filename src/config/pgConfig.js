const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'your_password',
    database: process.env.PG_DATABASE || 'rag_db',
    port: process.env.PG_PORT || 5432,
});

/**
 * Initialize PG Vector extension and table
 */
const initPgVector = async () => {
    console.log(`connecting to PostgreSQL:`);


    try {
        const client = await pool.connect();
        const dbRes = await client.query('SELECT current_database(), current_schema()');
        const { current_database, current_schema } = dbRes.rows[0];
        console.log(`✅ Connected to DB: ${current_database}, Schema: ${current_schema}`);

        try {
            // Enable pgvector extension
            await client.query('CREATE EXTENSION IF NOT EXISTS vector');

            // Disable for production after first run if data exists
            // await client.query('DROP TABLE IF EXISTS document_embeddings CASCADE');

            // Create embeddings table with 1536 dimensions (text-embedding-3-small)
            await client.query(`
                CREATE TABLE IF NOT EXISTS document_embeddings (
                    id SERIAL PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    file_name TEXT,
                    page_number INTEGER NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    embedding vector(1536),
                    book_name TEXT,
                    author_name TEXT,
                    category TEXT,
                    summary TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create index for vector search
            // Note: This is an HNSW index, which is efficient for vector search
            await client.query(`
                CREATE INDEX IF NOT EXISTS document_embeddings_vector_idx 
                ON document_embeddings USING hnsw (embedding vector_cosine_ops)
            `);

            console.log('✅ PostgreSQL & PGVector initialized');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Error initializing PostgreSQL:', err.message);
    }
};

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    initPgVector,
};
