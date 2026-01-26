const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

/**
 * LlamaIndex API Service
 * Handles document parsing using LlamaIndex Cloud API
 * Documentation: https://developers.llamaindex.ai/cloud-api-reference
 */

const LLAMAINDEX_BASE_URL = 'https://api.cloud.llamaindex.ai/api/v1';

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
    // Remove replacement characters (�)
    .replace(/�/g, '')
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
 * Upload and parse a file using LlamaIndex
 * @param {string} filePath - Path to the file to upload
 * @param {string} originalName - Original name of the file
 * @returns {Promise<Object>} Parsed document data
 */
const parseDocument = async (filePath, originalName) => {
  try {
    const client = createClient();

    // Step 1: Upload file
    console.log('Uploading file to LlamaIndex...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: originalName,
    });

    const uploadResponse = await client.post('/parsing/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    const jobId = uploadResponse.data.id;
    console.log(`File uploaded, job ID: ${jobId}`);

    // Step 2: Poll for job completion
    console.log('Waiting for parsing to complete...');
    let jobStatus = 'pending';
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
    let jobResult = null;

    while (jobStatus !== 'SUCCESS' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await client.get(`/parsing/job/${jobId}`);
      jobStatus = statusResponse.data.status;
      
      console.log(`Job status: ${jobStatus} (attempt ${attempts + 1}/${maxAttempts})`);

      if (jobStatus === 'SUCCESS') {
        jobResult = statusResponse.data;
        break;
      } else if (jobStatus === 'ERROR' || jobStatus === 'FAILED') {
        throw new Error(`Parsing job failed with status: ${jobStatus}`);
      }

      attempts++;
    }

    if (jobStatus !== 'SUCCESS') {
      throw new Error('Parsing job timed out');
    }

    // Step 3: Get the parsed text result
    console.log('Fetching parsed text...');
    
    // Try to get JSON result first (better structure for pages), fall back to text
    let parsedText;
    let parsedPages = [];
    
    try {
      console.log('Attempting to fetch JSON result for better structure...');
      const jsonResponse = await client.get(`/parsing/job/${jobId}/result/json`);
      
      // Debug: Log the actual response structure
      console.log('JSON Response structure:', JSON.stringify({
        hasData: !!jsonResponse.data,
        dataType: typeof jsonResponse.data,
        dataKeys: jsonResponse.data ? Object.keys(jsonResponse.data).slice(0, 10) : [],
        hasPages: !!(jsonResponse.data && jsonResponse.data.pages),
        pagesType: jsonResponse.data?.pages ? typeof jsonResponse.data.pages : 'undefined',
        isPagesArray: jsonResponse.data?.pages ? Array.isArray(jsonResponse.data.pages) : false,
        pagesLength: jsonResponse.data?.pages ? (Array.isArray(jsonResponse.data.pages) ? jsonResponse.data.pages.length : 'not an array') : 'no pages'
      }, null, 2));
      
      // If response is a string, try to parse it
      let parsedData = jsonResponse.data;
      if (typeof jsonResponse.data === 'string') {
        console.log('Response is a string, attempting to parse...');
        try {
          parsedData = JSON.parse(jsonResponse.data);
          console.log('Successfully parsed string response');
        } catch (parseError) {
          console.log('Failed to parse string response:', parseError.message);
        }
      }
      
      // Extract text from JSON pages array - LlamaIndex returns pages, not nodes
      if (parsedData && parsedData.pages && Array.isArray(parsedData.pages)) {
        console.log(`Found ${parsedData.pages.length} pages in JSON result`);
        
        // Debug: Log first page structure
        if (parsedData.pages.length > 0) {
          const firstPage = parsedData.pages[0];
          console.log('First page keys:', Object.keys(firstPage));
          if (firstPage.metadata) {
            console.log('First page metadata keys:', Object.keys(firstPage.metadata));
          }
        }
        
        // Process each page
        parsedData.pages.forEach((page, index) => {
          const pageText = page.text || page.md || '';
          if (pageText.trim().length === 0) return;
          
          const cleanedText = cleanParsedText(pageText);
          
          // Try to extract page number from various possible locations
          let pageNum = null;
          
          // Check if page has a page property
          if (page.page !== undefined && page.page !== null) {
            pageNum = parseInt(page.page, 10);
          }
          
          // Check metadata for page number
          if ((!pageNum || isNaN(pageNum)) && page.metadata) {
            if (page.metadata.page_label) {
              pageNum = parseInt(page.metadata.page_label, 10);
            } else if (page.metadata.page_number) {
              pageNum = parseInt(page.metadata.page_number, 10);
            } else if (page.metadata.page) {
              pageNum = parseInt(page.metadata.page, 10);
            }
          }
          
          // Check top-level properties
          if (!pageNum || isNaN(pageNum)) {
            if (page.page_number) {
              pageNum = parseInt(page.page_number, 10);
            } else if (page.page_label) {
              pageNum = parseInt(page.page_label, 10);
            }
          }
          
          // If still no valid page number, use sequential index
          if (!pageNum || isNaN(pageNum)) {
            pageNum = index + 1;
          }
          
          parsedPages.push({
            pageNumber: pageNum,
            text: cleanedText,
            markdown: cleanedText,
            metadata: {
              wordCount: cleanedText.split(/\s+/).filter(w => w.length > 0).length,
              characterCount: cleanedText.length,
            }
          });
        });
        
        // Sort by page number
        parsedPages.sort((a, b) => a.pageNumber - b.pageNumber);
        
        // Create full text by joining all pages
        parsedText = parsedPages.map(p => p.text).join('\n\n');
        
        console.log(`✅ Created ${parsedPages.length} pages from ${parsedData.pages.length} pages`);
      } else {
        // Fallback to text endpoint
        console.log('JSON result has unexpected format or no pages, falling back to text');
        const textResponse = await client.get(`/parsing/job/${jobId}/result/text`);
        parsedText = cleanParsedText(textResponse.data.text || textResponse.data);
      }
    } catch (jsonError) {
      console.log('JSON result not available, using text format:', jsonError.message);
      const textResponse = await client.get(`/parsing/job/${jobId}/result/text`);
      parsedText = cleanParsedText(textResponse.data.text || textResponse.data);
    }

    // Step 4: Get job details for metadata
    const detailsResponse = await client.get(`/parsing/job/${jobId}`);
    const jobDetails = detailsResponse.data;
    
    // If we couldn't extract pages from JSON, create a single page
    if (parsedPages.length === 0) {
      parsedPages = [{
        pageNumber: 1,
        text: parsedText,
        markdown: parsedText,
        metadata: {
          wordCount: parsedText.split(/\s+/).filter(w => w.length > 0).length,
          characterCount: parsedText.length,
        }
      }];
    }

    console.log(`📄 Final result: ${parsedPages.length} pages extracted (jobDetails.page_count: ${jobDetails.page_count})`);

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
        model: 'llamaindex-parser',
      },
    };
  } catch (error) {
    console.error('LlamaIndex parsing error:', error.response?.data || error.message);
    
    if (error.message && error.message.includes('LLAMAINDEX_API_KEY')) {
      throw error;
    }

    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to parse document with LlamaIndex'
    );
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
    const uploadResponse = await client.post('/parsing/upload', {
      url: documentUrl,
    });

    const jobId = uploadResponse.data.id;
    console.log(`URL submitted, job ID: ${jobId}`);

    // Step 2: Poll for job completion
    console.log('Waiting for parsing to complete...');
    let jobStatus = 'pending';
    let attempts = 0;
    const maxAttempts = 60;
    let jobResult = null;

    while (jobStatus !== 'SUCCESS' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await client.get(`/parsing/job/${jobId}`);
      jobStatus = statusResponse.data.status;
      
      console.log(`Job status: ${jobStatus} (attempt ${attempts + 1}/${maxAttempts})`);

      if (jobStatus === 'SUCCESS') {
        jobResult = statusResponse.data;
        break;
      } else if (jobStatus === 'ERROR' || jobStatus === 'FAILED') {
        throw new Error(`Parsing job failed with status: ${jobStatus}`);
      }

      attempts++;
    }

    if (jobStatus !== 'SUCCESS') {
      throw new Error('Parsing job timed out');
    }

    // Step 3: Get the parsed text result
    console.log('Fetching parsed text...');
    
    // Try to get JSON result first (better structure for pages), fall back to text
    let parsedText;
    let parsedPages = [];
    
    try {
      console.log('Attempting to fetch JSON result for better structure...');
      const jsonResponse = await client.get(`/parsing/job/${jobId}/result/json`);
      
      // Debug: Log the actual response structure
      console.log('JSON Response structure:', JSON.stringify({
        hasData: !!jsonResponse.data,
        dataType: typeof jsonResponse.data,
        dataKeys: jsonResponse.data ? Object.keys(jsonResponse.data).slice(0, 10) : [],
        hasPages: !!(jsonResponse.data && jsonResponse.data.pages),
        pagesType: jsonResponse.data?.pages ? typeof jsonResponse.data.pages : 'undefined',
        isPagesArray: jsonResponse.data?.pages ? Array.isArray(jsonResponse.data.pages) : false,
        pagesLength: jsonResponse.data?.pages ? (Array.isArray(jsonResponse.data.pages) ? jsonResponse.data.pages.length : 'not an array') : 'no pages'
      }, null, 2));
      
      // If response is a string, try to parse it
      let parsedData = jsonResponse.data;
      if (typeof jsonResponse.data === 'string') {
        console.log('Response is a string, attempting to parse...');
        try {
          parsedData = JSON.parse(jsonResponse.data);
          console.log('Successfully parsed string response');
        } catch (parseError) {
          console.log('Failed to parse string response:', parseError.message);
        }
      }
      
      // Extract text from JSON pages array - LlamaIndex returns pages, not nodes
      if (parsedData && parsedData.pages && Array.isArray(parsedData.pages)) {
        console.log(`Found ${parsedData.pages.length} pages in JSON result`);
        
        // Debug: Log first page structure
        if (parsedData.pages.length > 0) {
          const firstPage = parsedData.pages[0];
          console.log('First page keys:', Object.keys(firstPage));
          if (firstPage.metadata) {
            console.log('First page metadata keys:', Object.keys(firstPage.metadata));
          }
        }
        
        // Process each page
        parsedData.pages.forEach((page, index) => {
          const pageText = page.text || page.md || '';
          if (pageText.trim().length === 0) return;
          
          const cleanedText = cleanParsedText(pageText);
          
          // Try to extract page number from various possible locations
          let pageNum = null;
          
          // Check if page has a page property
          if (page.page !== undefined && page.page !== null) {
            pageNum = parseInt(page.page, 10);
          }
          
          // Check metadata for page number
          if ((!pageNum || isNaN(pageNum)) && page.metadata) {
            if (page.metadata.page_label) {
              pageNum = parseInt(page.metadata.page_label, 10);
            } else if (page.metadata.page_number) {
              pageNum = parseInt(page.metadata.page_number, 10);
            } else if (page.metadata.page) {
              pageNum = parseInt(page.metadata.page, 10);
            }
          }
          
          // Check top-level properties
          if (!pageNum || isNaN(pageNum)) {
            if (page.page_number) {
              pageNum = parseInt(page.page_number, 10);
            } else if (page.page_label) {
              pageNum = parseInt(page.page_label, 10);
            }
          }
          
          // If still no valid page number, use sequential index
          if (!pageNum || isNaN(pageNum)) {
            pageNum = index + 1;
          }
          
          parsedPages.push({
            pageNumber: pageNum,
            text: cleanedText,
            markdown: cleanedText,
            metadata: {
              wordCount: cleanedText.split(/\s+/).filter(w => w.length > 0).length,
              characterCount: cleanedText.length,
            }
          });
        });
        
        // Sort by page number
        parsedPages.sort((a, b) => a.pageNumber - b.pageNumber);
        
        // Create full text by joining all pages
        parsedText = parsedPages.map(p => p.text).join('\n\n');
        
        console.log(`✅ Created ${parsedPages.length} pages from ${parsedData.pages.length} pages`);
      } else {
        // Fallback to text endpoint
        console.log('JSON result has unexpected format or no pages, falling back to text');
        const textResponse = await client.get(`/parsing/job/${jobId}/result/text`);
        parsedText = cleanParsedText(textResponse.data.text || textResponse.data);
      }
    } catch (jsonError) {
      console.log('JSON result not available, using text format:', jsonError.message);
      const textResponse = await client.get(`/parsing/job/${jobId}/result/text`);
      parsedText = cleanParsedText(textResponse.data.text || textResponse.data);
    }

    // Step 4: Get job details for metadata
    const detailsResponse = await client.get(`/parsing/job/${jobId}`);
    const jobDetails = detailsResponse.data;
    
    // If we couldn't extract pages from JSON, create a single page
    if (parsedPages.length === 0) {
      parsedPages = [{
        pageNumber: 1,
        text: parsedText,
        markdown: parsedText,
        metadata: {
          wordCount: parsedText.split(/\s+/).filter(w => w.length > 0).length,
          characterCount: parsedText.length,
        }
      }];
    }

    console.log(`📄 Final result: ${parsedPages.length} pages extracted (jobDetails.page_count: ${jobDetails.page_count})`);

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
        model: 'llamaindex-parser',
      },
    };
  } catch (error) {
    console.error('LlamaIndex parsing error:', error.response?.data || error.message);
    
    if (error.message && error.message.includes('LLAMAINDEX_API_KEY')) {
      throw error;
    }

    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to parse document from URL with LlamaIndex'
    );
  }
};

module.exports = {
  parseDocument,
  parseDocumentFromUrl,
};
