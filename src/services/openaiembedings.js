const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function createEmbedding(text) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // 1536 dims
        input: text,
    });

    return response.data[0].embedding;
}

module.exports = { createEmbedding };
