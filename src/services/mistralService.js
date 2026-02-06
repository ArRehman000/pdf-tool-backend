const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs');

/**
 * Mistral Service for OCR and text processing
 */
class MistralService {
    constructor() {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) {
            throw new Error('MISTRAL_API_KEY is not set in environment variables');
        }
        this.client = new Mistral({ apiKey });
    }

    /**
     * Helper to filter out blank pages
     * @param {Array} pages 
     * @returns {Array} Non-empty pages
     */
    filterBlankPages(pages) {
        if (!pages || !Array.isArray(pages)) return [];

        return pages.filter(page => {
            const hasMarkdown = page.markdown && page.markdown.trim().length > 0;
            // Also keep if it has images even if text is empty, as it might be an image-only page
            const hasImages = page.images && page.images.length > 0;
            return hasMarkdown || hasImages;
        });
    }

    /**
     * Process a document file using Mistral OCR
     * @param {string} filePath - Path to the local file
     * @param {string} fileName - Original file name
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} OCR result
     */
    async processDocument(filePath, fileName, options = {}) {
        let uploadedFileId = null;

        try {
            console.log('Uploading document to Mistral...');

            // Read file
            const fileBuffer = fs.readFileSync(filePath);

            // Upload file to Mistral
            const uploadedFile = await this.client.files.upload({
                file: {
                    fileName: fileName,
                    content: fileBuffer,
                },
                purpose: 'ocr',
            });

            uploadedFileId = uploadedFile.id;
            console.log(`File uploaded with ID: ${uploadedFileId}`);

            // Process with OCR
            const response = await this.client.ocr.process({
                model: 'mistral-ocr-latest',
                document: {
                    type: 'file',
                    fileId: uploadedFileId,
                },
                includeImageBase64: options.includeImageBase64 || false,
                pages: options.pages,
                extractHeader: options.extractHeader,
                extractFooter: options.extractFooter,
                tableFormat: options.tableFormat,
                // Add annotation support
                documentAnnotationFormat: options.documentAnnotation,
                bboxAnnotationFormat: options.bboxAnnotation,

            });

            // Cleanup: Delete file from Mistral storage
            await this.deleteMistralFile(uploadedFileId);

            // Filter blank pages and keep high-quality markdown
            const filteredPages = this.filterBlankPages(response.pages).map(page => ({
                ...page,
                // Strip markdown headers from text field but keep them in markdown field
                text: this.stripMarkdownHeaders(page.markdown),
                markdown: page.markdown
            }));

            console.log(`Filtered ${response.pages.length - filteredPages.length} blank pages`);

            return {
                pages: filteredPages,
                model: response.model,
                usage: response.usageInfo,
                documentAnnotation: response.documentAnnotation,
                originalResponse: response
            };

        } catch (error) {
            // Attempt cleanup on error
            if (uploadedFileId) {
                await this.deleteMistralFile(uploadedFileId).catch(console.error);
            }
            throw error;
        }
    }

    /**
     * Process a document from URL using Mistral OCR
     * @param {string} documentUrl - Public URL of the document
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} OCR result
     */
    async processDocumentFromUrl(documentUrl, options = {}) {
        try {
            console.log(`Processing document from URL: ${documentUrl}`);

            const response = await this.client.ocr.process({
                model: 'mistral-ocr-latest',
                document: {
                    type: 'document_url',
                    documentUrl: documentUrl,
                },
                includeImageBase64: options.includeImageBase64 || false,
                extractHeader: options.extractHeader,
                extractFooter: options.extractFooter,
                tableFormat: options.tableFormat,
                // Add annotation support
                documentAnnotationFormat: options.documentAnnotation,
                bboxAnnotationFormat: options.bboxAnnotation,
            });

            // Filter blank pages and keep high-quality markdown
            const filteredPages = this.filterBlankPages(response.pages).map(page => ({
                ...page,
                text: this.stripMarkdownHeaders(page.markdown),
                markdown: page.markdown
            }));

            console.log(`Filtered ${response.pages.length - filteredPages.length} blank pages`);

            return {
                pages: filteredPages,
                model: response.model,
                usage: response.usageInfo,
                documentAnnotation: response.documentAnnotation,
                originalResponse: response
            };
        } catch (error) {
            console.error('Mistral URL processing error:', error);
            throw error;
        }
    }

    /**
     * Delete a file from Mistral storage
     * @param {string} fileId 
     */
    async deleteMistralFile(fileId) {
        try {
            await this.client.files.delete({ fileId });
            console.log(`Deleted file from Mistral: ${fileId}`);
        } catch (error) {
            console.error(`Failed to delete Mistral file ${fileId}:`, error.message);
        }
    }

    /**
     * Remove markdown header markers (#) from text
     * @param {string} markdown - Markdown text
     * @returns {string} Text without header markers
     */
    stripMarkdownHeaders(markdown) {
        if (!markdown) return '';
        // Remove lines that are just headers or remove # from the start of lines
        return markdown
            .replace(/^#{1,6}\s+/gm, '') // Remove #, ## etc at the start of lines
            .trim();
    }
}

module.exports = new MistralService();
