# 📄 OCR Documentation - Mistral AI Integration

Complete guide for the PDF/DOCX/Image to Text conversion feature using Mistral OCR API.

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

The following packages are required:
- `@mistralai/mistralai` - Mistral AI SDK
- `multer` - File upload handling

### 2. Get Mistral API Key

1. Sign up at [Mistral AI](https://console.mistral.ai/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy your API key

### 3. Update Environment Variables

Add to your `.env` file:

```env
# Mistral AI Configuration
MISTRAL_API_KEY=your_mistral_api_key_here
```

### 4. Start Server

```bash
npm run dev
```

---

## 📡 API Endpoints

### 1. Process Uploaded File

**Endpoint:** `POST /api/ocr/process`

**Access:** Protected (requires authentication)

**Content-Type:** `multipart/form-data`

**Request:**
- **Field:** `document` (file) - Required
- **Field:** `table_format` (string) - Optional: `html`, `markdown`, or `null` (default: `html`)
- **Field:** `extract_header` (boolean) - Optional (default: `false`)
- **Field:** `extract_footer` (boolean) - Optional (default: `false`)
- **Field:** `include_image_base64` (boolean) - Optional (default: `false`)

**Supported File Types:**
- PDF (`.pdf`)
- DOCX (`.docx`)
- PNG (`.png`)
- JPEG/JPG (`.jpg`, `.jpeg`)

**Max File Size:** 10MB

**Success Response (200):**
```json
{
  "success": true,
  "message": "Document processed successfully",
  "data": {
    "fileName": "document.pdf",
    "fileSize": 1234567,
    "pages": 5,
    "fullText": "Complete extracted text from all pages...",
    "detailedPages": [
      {
        "index": 0,
        "markdown": "Page 1 content...",
        "images": [],
        "tables": [
          {
            "index": 0,
            "content": "<table>...</table>"
          }
        ],
        "hyperlinks": [],
        "header": null,
        "footer": null,
        "dimensions": {
          "width": 612,
          "height": 792
        }
      }
    ],
    "model": "mistral-ocr-latest",
    "usage": {
      "prompt_tokens": 1000,
      "total_tokens": 1000
    }
  }
}
```

---

### 2. Process Document from URL

**Endpoint:** `POST /api/ocr/process-url`

**Access:** Protected (requires authentication)

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "document_url": "https://example.com/document.pdf",
  "table_format": "html",
  "extract_header": false,
  "extract_footer": false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Document processed successfully",
  "data": {
    "documentUrl": "https://example.com/document.pdf",
    "pages": 3,
    "fullText": "Complete extracted text...",
    "detailedPages": [...],
    "model": "mistral-ocr-latest",
    "usage": {...}
  }
}
```

---

## 🧪 Testing Examples

### Using cURL

#### 1. Upload and Process File

```bash
# Login first to get authentication cookie
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' \
  -c cookies.txt

# Upload and process PDF file
curl -X POST http://localhost:8080/api/ocr/process \
  -b cookies.txt \
  -F "document=@/path/to/your/document.pdf" \
  -F "table_format=html" \
  -F "extract_header=false" \
  -F "extract_footer=false"
```

#### 2. Process from URL

```bash
# Login first
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' \
  -c cookies.txt

# Process document from URL
curl -X POST http://localhost:8080/api/ocr/process-url \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "document_url": "https://arxiv.org/pdf/2201.04234.pdf",
    "table_format": "html",
    "extract_header": false,
    "extract_footer": false
  }'
```

---

## 🎯 Using Postman

### Setup Collection

1. **Create New Request: Login**
   - Method: `POST`
   - URL: `http://localhost:8080/api/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "admin@example.com",
       "password": "Admin@123"
     }
     ```
   - ✅ Enable "Automatically follow redirects"
   - ✅ Cookies will be saved automatically

2. **Create New Request: Process File**
   - Method: `POST`
   - URL: `http://localhost:8080/api/ocr/process`
   - Body: Select `form-data`
   - Add fields:
     - `document` (File) - Select your PDF/DOCX file
     - `table_format` (Text) - `html`
     - `extract_header` (Text) - `false`
     - `extract_footer` (Text) - `false`
   - Cookies from login will be sent automatically

3. **Create New Request: Process from URL**
   - Method: `POST`
   - URL: `http://localhost:8080/api/ocr/process-url`
   - Body (JSON):
     ```json
     {
       "document_url": "https://arxiv.org/pdf/2201.04234.pdf",
       "table_format": "html"
     }
     ```
   - Cookies from login will be sent automatically

---

## 📊 Response Structure Details

### Page Object

```json
{
  "index": 0,                      // Page number (0-indexed)
  "markdown": "Page content...",   // Main extracted text in markdown
  "images": [                      // Extracted images (if any)
    {
      "index": 0,
      "bbox": [x, y, width, height],
      "base64": "..."              // If include_image_base64=true
    }
  ],
  "tables": [                      // Extracted tables (if table_format set)
    {
      "index": 0,
      "content": "<table>...</table>"  // HTML or Markdown table
    }
  ],
  "hyperlinks": [                  // Detected hyperlinks
    {
      "text": "Link text",
      "url": "https://example.com"
    }
  ],
  "header": "Header text",         // If extract_header=true
  "footer": "Footer text",         // If extract_footer=true
  "dimensions": {
    "width": 612,
    "height": 792
  }
}
```

---

## ⚙️ Configuration Options

### Table Format Options

| Option | Description | Output |
|--------|-------------|--------|
| `null` | Tables inline in markdown | Tables as text in main content |
| `html` | Tables as HTML | Separate HTML tables in `tables` array |
| `markdown` | Tables as Markdown | Separate Markdown tables in `tables` array |

### Extract Header/Footer

- `extract_header: true` - Extracts headers separately
- `extract_footer: true` - Extracts footers separately
- Default: Headers and footers are part of main content

### Include Images

- `include_image_base64: true` - Returns images as base64
- Default: Only image bounding boxes returned

---

## 🔒 Security & Best Practices

### Authentication Required

All OCR endpoints require authentication. Users must:
1. Login first to get authentication cookie
2. Include cookie in subsequent requests

### File Upload Security

- ✅ File type validation (PDF, DOCX, PNG, JPEG only)
- ✅ File size limit: 10MB
- ✅ Temporary file storage
- ✅ Automatic cleanup after processing
- ✅ Unique filenames to prevent conflicts

### API Key Security

- ✅ API key stored in environment variables
- ✅ Never exposed in responses
- ✅ Server-side only processing

---

## 🐛 Error Handling

### Common Errors

#### 1. Missing API Key
```json
{
  "success": false,
  "message": "Mistral API key is not configured. Please set MISTRAL_API_KEY in environment variables.",
  "error": "MISTRAL_API_KEY is not set in environment variables"
}
```
**Solution:** Add `MISTRAL_API_KEY` to `.env` file

#### 2. No File Uploaded
```json
{
  "success": false,
  "message": "No file uploaded. Please upload a PDF, DOCX, PNG, or JPEG file."
}
```
**Solution:** Ensure file is attached with field name `document`

#### 3. Invalid File Type
```json
{
  "success": false,
  "message": "Invalid file type. Only PDF, DOCX, PNG, and JPEG files are allowed."
}
```
**Solution:** Upload supported file types only

#### 4. File Too Large
```json
{
  "success": false,
  "message": "File too large"
}
```
**Solution:** Reduce file size below 10MB

#### 5. Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```
**Solution:** Login first and include authentication cookie

---

## 📈 Use Cases

### 1. Extract Text from Research Papers
Upload academic PDFs and extract clean text with tables and images preserved.

### 2. Process Business Documents
Convert DOCX contracts, reports, and proposals to searchable text.

### 3. Receipt/Invoice Processing
Upload receipt images and extract structured text data.

### 4. Multi-page Document Analysis
Process large documents with multiple pages, tables, and images.

### 5. Table Extraction
Extract tables from PDFs in HTML or Markdown format for easy parsing.

---

## 🚀 Advanced Features

### Batch Processing

For processing multiple documents, call the API sequentially or implement a queue system.

### Custom Processing Pipeline

1. Upload document → OCR processing
2. Extract tables separately
3. Extract images separately
4. Store in database
5. Full-text search indexing

### Integration with RAG

Perfect for RAG (Retrieval Augmented Generation) systems:
1. Upload documents
2. Extract text with Mistral OCR
3. Create embeddings
4. Store in vector database
5. Use for semantic search

---

## 📝 Notes

1. **Temporary Files:** Uploaded files are automatically deleted after processing
2. **Rate Limits:** Mistral API has rate limits - check your plan
3. **Pricing:** OCR processing consumes Mistral API tokens
4. **Quality:** Mistral OCR provides high-quality text extraction with structure preservation
5. **Languages:** Supports multiple languages (check Mistral documentation)

---

## 🔗 References

- [Mistral OCR Documentation](https://docs.mistral.ai/capabilities/document_ai/basic_ocr)
- [Mistral AI Console](https://console.mistral.ai/)
- [Mistral Node.js SDK](https://github.com/mistralai/client-js)

---

## 💡 Quick Start Summary

```bash
# 1. Add Mistral API key to .env
MISTRAL_API_KEY=your_key_here

# 2. Install dependencies
npm install

# 3. Start server
npm run dev

# 4. Login to get auth cookie
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' \
  -c cookies.txt

# 5. Process document
curl -X POST http://localhost:8080/api/ocr/process \
  -b cookies.txt \
  -F "document=@document.pdf"
```

**That's it! Your OCR system is ready to use!** 🎉
