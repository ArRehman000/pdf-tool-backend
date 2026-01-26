function chunkText(text, size = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = start + size;
        chunks.push(text.slice(start, end));
        start += size - overlap;
    }

    return chunks;
}

module.exports = chunkText;
