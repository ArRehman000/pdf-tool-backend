const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function getEmbedding(text) {
    const res = await client.embeddings.create({
        model: "text-embedding-3-small", // 1536 dimensions
        input: text
    });

    return res.data[0].embedding;
}

module.exports = { getEmbedding };
