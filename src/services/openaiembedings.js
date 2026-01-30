const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function createEmbedding(input) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: input,
    });

    if (Array.isArray(input)) {
        return response.data.map(item => item.embedding);
    }
    return response.data[0].embedding;
}

module.exports = { createEmbedding };
