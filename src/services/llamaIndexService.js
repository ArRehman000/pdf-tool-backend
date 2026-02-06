const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

/**
 * LlamaIndex API Service
 * Handles document parsing using LlamaIndex Cloud API
 * Documentation: https://developers.llamaindex.ai/cloud-api-reference
 */

const LLAMAINDEX_BASE_URL = 'https://api.cloud.llamaindex.ai/api/v1';

/**
 * Shared parsing instruction for consistent JSON output
 */
const PARSING_INSTRUCTION = `
You are a document parsing and normalization engine.

Your task is to convert the document into a clean, structured, and embedding-ready JSON format.

Follow these rules strictly:

1. Extract text page by page.
2. Remove OCR artifacts such as:
    - broken words across lines
    - repeated spaces
    - random symbols or non-printable characters
3. Preserve logical paragraphs and headings.
4. Do NOT invent or rewrite content.
5. Do NOT add explanations or commentary.
6. Maintain the original meaning and wording.
7. Normalize whitespace and line breaks.
8. Remove headers, footers, and page numbers if repeated.
9. Do NOT include raw OCR coordinates or bounding boxes.

For EACH page:
    - Provide the cleaned readable text.
    - Generate a detailed summary (exactly 2 lines) that captures the whole page context and key information.
    - The summary must be informational only (no opinions, no analysis).
    - Do NOT say "this page discusses" or similar phrases.

Output requirements:
    - Output VALID JSON only.
    - No markdown formatting (like \`\`\`json).
    - No extra text outside JSON.
    - The response MUST strictly follow the schema below.

JSON Schema:
    {
      "pages": [
        {
          "page_number": number,
          "clean_text": string,
          "summary": string,
          "word_count": number,
          "character_count": number
        }
      ]
    }
`;

/**
 * Get LlamaIndex API key from environment
 */
const getApiKey = () => {
  const apiKey = process.env.LLAMAINDEX_API_KEY;
  if (!apiKey) {
    throw new Error('LLAMAINDEX_API_KEY is not set in environment variables');
  }
  return apiKey;
};

/**
 * Create axios instance with authentication
 */
const createClient = () => {
  return axios.create({
    baseURL: LLAMAINDEX_BASE_URL,
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
    },
  });
};

/**
 * Clean up parsed text - remove OCR artifacts and improve readability
 * @param {string} text - Raw parsed text
 * @returns {string} Cleaned text
 */
const cleanParsedText = (text) => {
  if (!text) return '';

  return text
    // Remove replacement characters
    .replace(/\uFFFD/g, '')
    // Remove multiple dots/dashes that are OCR artifacts
    .replace(/\.{3,}/g, '...')
    // Fix multiple spaces
    .replace(/  +/g, ' ')
    // Fix excessive line breaks (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing spaces from each line
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0) // Remove empty lines
    .join('\n')
    // Add proper spacing after page breaks
    .replace(/---/g, '\n\n---\n\n')
    .trim();
};

/**
 * Monitor job status until completion
 * @param {Object} client - Axios client
 * @param {string} jobId - Job ID to monitor
 * @returns {Promise<Object>} Final job result
 */
const monitorJob = async (client, jobId) => {
  console.log(`Waiting for parsing job ${jobId} to complete...`);
  let jobStatus = 'pending';
  let attempts = 0;
  // Increase timeout: default 300 attempts * 2 seconds = 10 minutes
  const maxAttempts = parseInt(process.env.LLAMAINDEX_MAX_ATTEMPTS, 10) || 300;
  let jobResult = null;

  while (jobStatus !== 'SUCCESS' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const statusResponse = await client.get(`/parsing/job/${jobId}`);
    jobStatus = statusResponse.data.status;

    console.log(`Job status: ${jobStatus} (attempt ${attempts + 1}/${maxAttempts})`);

    if (jobStatus === 'SUCCESS') {
      jobResult = statusResponse.data;
      return jobResult;
    } else if (jobStatus === 'ERROR' || jobStatus === 'FAILED') {
      const errorMessage = statusResponse.data.error_message || statusResponse.data.detail || `Parsing job failed with status: ${jobStatus}`;
      throw new Error(errorMessage);
    }

    attempts++;
  }

  throw new Error('Parsing job timed out');
};

/**
 * Process the completed job result
 * @param {Object} client - Axios client
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Processed result with pages and text
 */
const processJobResult = async (client, jobId) => {
  console.log('Fetching parsed text...');

  // Try to get JSON result first (better structure for pages), fall back to text
  let parsedText;
  let parsedPages = [];
  let jobStatus = 'SUCCESS';

  try {
    console.log('Attempting to fetch JSON result for better structure...');
    const jsonResponse = await client.get(`/parsing/job/${jobId}/result/json`);

    // Parse the data
    let parsedData = jsonResponse.data;

    // DEBUG: Log the raw first page to see if summary exists
    if (parsedData && parsedData.pages && parsedData.pages.length > 0) {
      console.log('DEBUG - Raw First Page from LlamaIndex:', JSON.stringify(parsedData.pages[0], null, 2));
    } else {
      console.log('DEBUG - No pages found in raw response or invalid structure');
    }

    // Handle case where data is a string (potentially JSON string)
    if (typeof parsedData === 'string') {
      console.log('Response is a string, attempting to parse...');
      try {
        // Remove markdown code blocks if present
        const cleanString = parsedData.replace(/^```json\s*|\s*```$/g, '');
        parsedData = JSON.parse(cleanString);
        console.log('Successfully parsed string response');
      } catch (parseError) {
        console.log('Failed to parse string response, it might be raw text:', parseError.message);
      }
    }

    // Extract pages from the expected JSON schema
    if (parsedData && parsedData.pages && Array.isArray(parsedData.pages)) {
      console.log(`Found ${parsedData.pages.length} pages in JSON structure`);

      parsedData.pages.forEach((page, index) => {
        // Handle both our custom schema and LlamaParse default schema
        let pageText = page.clean_text || page.text || page.md || '';
        let pageSummary = page.summary || '';

        // Check if the markdown content is actually our requested JSON structure
        if (page.md && (page.md.trim().startsWith('{') || page.md.trim().startsWith('```json'))) {
          try {
            let jsonStr = page.md;
            // Remove code blocks if present
            jsonStr = jsonStr.replace(/```json\s?|\s?```/g, '').trim();
            const parsedMd = JSON.parse(jsonStr);

            // If we found our standard structure inside
            if (parsedMd.pages && parsedMd.pages.length > 0) {
              const innerPage = parsedMd.pages[0];
              pageText = innerPage.clean_text || innerPage.text || pageText;
              pageSummary = innerPage.summary || pageSummary;
            }
          } catch (e) {
            // Ignore parse errors, just use raw text
            console.log('Failed to parse inner JSON from markdown, using raw text');
          }
        }

        if (pageText.trim().length === 0) return;

        const cleanedText = cleanParsedText(pageText);

        // Determine page number
        let pageNum = page.page_number || page.page || (index + 1);

        parsedPages.push({
          pageNumber: parseInt(pageNum, 10),
          text: cleanedText,
          markdown: cleanedText,
          summary: pageSummary,
          metadata: {
            wordCount: page.word_count || cleanedText.split(/\s+/).filter(w => w.length > 0).length,
            characterCount: page.character_count || cleanedText.length,
          }
        });
      });

      // Sort by page number
      parsedPages.sort((a, b) => a.pageNumber - b.pageNumber);

      // Create full text
      parsedText = parsedPages.map(p => p.text).join('\n\n');
      console.log(`✅ Extracted ${parsedPages.length} structured pages`);
    } else if (parsedData && Array.isArray(parsedData)) {
      // Sometimes LlamaParse returns an array of page objects directly
      console.log(`Found array structure with ${parsedData.length} items`);
      parsedData.forEach((page, index) => {
        // Similar logic as above
        const pageText = page.clean_text || page.text || page.md || '';
        if (pageText.trim().length === 0) return;

        const cleanedText = cleanParsedText(pageText);
        parsedPages.push({
          pageNumber: index + 1,
          text: cleanedText,
          markdown: cleanedText,
          summary: page.summary || '',
          metadata: {
            wordCount: cleanedText.split(/\s+/).filter(w => w.length > 0).length,
            characterCount: cleanedText.length,
          }
        });
      });
      parsedText = parsedPages.map(p => p.text).join('\n\n');
    } else {
      // Fallback to text if JSON structure isn't what we expect
      console.log('JSON structure did not match expected schema, falling back to text endpoint');
      const textResponse = await client.get(`/parsing/job/${jobId}/result/text`);
      parsedText = cleanParsedText(textResponse.data.text || textResponse.data);
    }
  } catch (error) {
    console.log('Error processing JSON result:', error.message);
    const textResponse = await client.get(`/parsing/job/${jobId}/result/text`);
    parsedText = cleanParsedText(textResponse.data.text || textResponse.data);
  }

  // Get metadata
  const detailsResponse = await client.get(`/parsing/job/${jobId}`);
  const jobDetails = detailsResponse.data;

  // If no pages extracted yet, create a single page from full text
  if (parsedPages.length === 0) {
    parsedPages = [{
      pageNumber: 1,
      text: parsedText,
      markdown: parsedText,
      summary: 'No summary available',
      metadata: {
        wordCount: parsedText.split(/\s+/).filter(w => w.length > 0).length,
        characterCount: parsedText.length,
      }
    }];
  }

  return {
    success: true,
    jobId: jobId,
    text: parsedText,
    pages: parsedPages,
    status: jobStatus,
    metadata: {
      fileSize: jobDetails.file_size,
      pageCount: jobDetails.page_count || parsedPages.length,
      processingTime: jobDetails.processing_time,
      model: 'llamaindex-parser-gen',
      usage: {
        credits_used: jobDetails.credits_used || 0,
        credits_total: jobDetails.credits_total || null,
        is_free: jobDetails.is_free || false
      },
      jobDetails: jobDetails // Keep full details for future-proofing
    },
  };
};

/**
 * Upload and parse a file using LlamaIndex
 * @param {string} filePath - Path to the file to upload
 * @param {string} originalName - Original name of the file
 * @returns {Promise<Object>} Parsed document data
 */
const parseDocument = async (filePath, originalName) => {
  try {
    const client = createClient();

    // Step 1: Check page count if PDF
    let pageCount = 0;
    let isLargeDocument = false;

    if (originalName.toLowerCase().endsWith('.pdf')) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        pageCount = pdfDoc.getPageCount();
        console.log(`PDF page count detected: ${pageCount}`);

        if (pageCount > 700) {
          isLargeDocument = true;
          console.log(`Large document detected (>700 pages). Falling back to standard mode.`);
        }
      } catch (pdfError) {
        console.error('Error detecting PDF page count:', pdfError.message);
      }
    }

    // Step 2: Upload file
    console.log('Uploading file to LlamaIndex...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: originalName,
    });
    formData.append('parsing_instruction', PARSING_INSTRUCTION);

    // Fall back to standard mode (>700 pages) to avoid agentic parsing limits
    const usePremium = !isLargeDocument;
    formData.append('premium_mode', usePremium ? 'true' : 'false');

    const uploadResponse = await client.post('/parsing/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    const jobId = uploadResponse.data.id;
    console.log(`File uploaded, job ID: ${jobId}`);

    // Step 3 & 4: Monitor and Process
    await monitorJob(client, jobId);
    return await processJobResult(client, jobId);

  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.detail || errorData?.message || error.message;

    console.error('LlamaIndex parsing error:', errorData || error.message);

    if (error.response?.status === 402 || (errorMessage && errorMessage.includes('credits'))) {
      throw new Error('LlamaIndex credits exhausted. Please switch to Mistral OCR for processing.');
    }

    if (errorMessage && errorMessage.includes('700')) {
      throw new Error('Document exceeds LlamaIndex agentic limit (700 pages). Our auto-fallback failed, please try Mistral OCR.');
    }

    if (error.message && error.message.includes('LLAMAINDEX_API_KEY')) throw error;
    throw new Error(errorMessage || 'Failed to parse document with LlamaIndex');
  }
};

/**
 * Upload and parse a file from URL using LlamaIndex
 * @param {string} documentUrl - URL of the document to parse
 * @returns {Promise<Object>} Parsed document data
 */
const parseDocumentFromUrl = async (documentUrl) => {
  try {
    const client = createClient();

    // Step 1: Submit URL for parsing
    console.log('Submitting URL to LlamaIndex...');
    const formData = new FormData();
    formData.append('input_url', documentUrl);
    formData.append('parsing_instruction', PARSING_INSTRUCTION);
    formData.append('premium_mode', 'true');

    // Note: When using formData with axios (and form-data package in Node), 
    // we need to set headers from the form
    const uploadResponse = await client.post('/parsing/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    const jobId = uploadResponse.data.id;
    console.log(`URL submitted, job ID: ${jobId}`);

    // Step 2 & 3: Monitor and Process
    await monitorJob(client, jobId);
    return await processJobResult(client, jobId);

  } catch (error) {
    console.error('LlamaIndex parsing error:', error.response?.data || error.message);
    if (error.message && error.message.includes('LLAMAINDEX_API_KEY')) throw error;
    throw new Error(error.response?.data?.message || error.message || 'Failed to parse document from URL with LlamaIndex');
  }
};

module.exports = {
  parseDocument,
  parseDocumentFromUrl,
};
