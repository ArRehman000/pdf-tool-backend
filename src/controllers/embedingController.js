let runningJobs = new Map();

exports.startEmbedding = async (req, res) => {
    const { documentId } = req.body;

    if (runningJobs.has(documentId)) {
        return res.json({ message: 'Already running' });
    }

    const job = processDocumentEmbeddings(documentId);
    runningJobs.set(documentId, job);

    job.finally(() => runningJobs.delete(documentId));

    res.json({ success: true, message: 'Embedding started' });
};

exports.stopEmbedding = async (req, res) => {
    const { documentId } = req.body;

    runningJobs.delete(documentId);

    res.json({
        success: true,
        message: 'Embedding stopped. Resume anytime.',
    });
};
