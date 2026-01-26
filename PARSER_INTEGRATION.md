# Document Parser Integration Guide

## Overview

The RAG Document Manager now supports **two parsing engines** for document processing:

1. **Mistral OCR** - Advanced OCR with table extraction, header/footer detection, and image handling
2. **LlamaIndex** - Cloud-based document parsing powered by LlamaIndex AI

## 🔑 API Keys Required

Add these keys to your `.env` file:

```env
# Mistral API (for Mistral parser)
MISTRAL_API_KEY=your_mistral_api_key_here

# LlamaIndex API (for Llama parser)
LLAMAINDEX_API_KEY=your_llamaindex_api_key_here
```

### Getting API Keys

- **Mistral API Key**: https://console.mistral.ai/
- **LlamaIndex API Key**: https://cloud.llamaindex.ai/

---

## 📡 API Endpoints

### 1. Upload & Process Document

**Endpoint:** `POST /api/ocr/process`

**Form Data:**
```javascript
{
  document: File,              // Required: PDF, DOCX, PNG, JPEG
  parser: "mistral" | "llama", // Optional: Default "mistral"
  save_document: boolean,      // Optional: Save to database
  
  // Mistral-specific options (ignored by LlamaIndex)
  table_format: "html" | "markdown" | "null",
  extract_header: boolean,
  extract_footer: boolean,
  include_image_base64: boolean
}
```

**cURL Example (Mistral):**
```bash
curl -X POST http://localhost:8080/api/ocr/process \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -F "document=@document.pdf" \
  -F "parser=mistral" \
  -F "save_document=true" \
  -F "table_format=html" \
  -F "extract_header=true"
```

**cURL Example (LlamaIndex):**
```bash
curl -X POST http://localhost:8080/api/ocr/process \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -F "document=@document.pdf" \
  -F "parser=llama" \
  -F "save_document=true"
```

**Response:**
```json
{
  "success": true,
  "message": "Document processed and saved successfully",
  "data": {
    "fileName": "document.pdf",
    "fileSize": 123456,
    "pages": 5,
    "fullText": "Extracted text content...",
    "detailedPages": [...],
    "parser": "llama",
    "model": "llamaindex-parser",
    "jobId": "job_123456",
    "pageCount": 5,
    "processingTime": "2.5s",
    "documentId": "678d65c95cddb0ebfb86ee28",
    "saved": true
  }
}
```

---

### 2. Process Document from URL

**Endpoint:** `POST /api/ocr/process-url`

**JSON Body:**
```json
{
  "document_url": "https://example.com/document.pdf",
  "parser": "mistral",  // or "llama"
  "table_format": "html",
  "extract_header": false,
  "extract_footer": false
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/ocr/process-url \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{
    "document_url": "https://example.com/document.pdf",
    "parser": "llama"
  }'
```

---

## 🆚 Parser Comparison

| Feature | Mistral OCR | LlamaIndex |
|---------|-------------|------------|
| **Supported Files** | PDF, DOCX, PNG, JPEG | PDF, DOCX, TXT, and more |
| **Table Extraction** | ✅ Advanced (HTML/Markdown) | ✅ Basic |
| **Header/Footer Detection** | ✅ Yes | ❌ No |
| **Image Extraction** | ✅ Base64 support | ❌ Not available |
| **Processing Speed** | ⚡ Fast | ⚡ Fast (async) |
| **Cloud Processing** | ✅ Yes | ✅ Yes |
| **Multi-language OCR** | ✅ Excellent | ✅ Good |
| **Handwriting Recognition** | ✅ Yes | ✅ Limited |
| **API Pricing** | Pay per use | Pay per use |

---

## 🎯 When to Use Which Parser?

### Use **Mistral OCR** when you need:
- ✅ Advanced table extraction (HTML/Markdown format)
- ✅ Header and footer detection
- ✅ Image extraction as base64
- ✅ Precise control over OCR options
- ✅ Best for structured documents with complex layouts

### Use **LlamaIndex** when you need:
- ✅ Simple text extraction
- ✅ Integration with LlamaIndex RAG pipelines
- ✅ Fast, straightforward parsing
- ✅ Best for unstructured text documents

---

## 🔧 Technical Implementation

### Backend Architecture

```
src/
├── controllers/
│   └── ocrController.js       # Main controller with parser selection
├── services/
│   └── llamaIndexService.js   # LlamaIndex API integration
├── routes/
│   └── ocrRoutes.js            # API routes
└── models/
    └── Document.js             # Document schema
```

### LlamaIndex Service Workflow

1. **Upload File** → `POST /api/v1/parsing/upload`
2. **Poll Job Status** → `GET /api/v1/parsing/job/{jobId}`
3. **Get Text Result** → `GET /api/v1/parsing/job/{jobId}/result/text`

**Polling Configuration:**
- **Interval:** 2 seconds
- **Max Attempts:** 60 (2 minutes timeout)
- **Status Types:** `PENDING` → `SUCCESS` | `ERROR` | `FAILED`

---

## 🧪 Testing

### Test with Mistral
```bash
# Process with Mistral
curl -X POST http://localhost:8080/api/ocr/process \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -F "document=@test.pdf" \
  -F "parser=mistral" \
  -F "save_document=true" \
  -F "table_format=html"
```

### Test with LlamaIndex
```bash
# Process with LlamaIndex
curl -X POST http://localhost:8080/api/ocr/process \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -F "document=@test.pdf" \
  -F "parser=llama" \
  -F "save_document=true"
```

### Test Invalid Parser
```bash
# Should return 400 error
curl -X POST http://localhost:8080/api/ocr/process \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -F "document=@test.pdf" \
  -F "parser=invalid"
```

---

## ⚠️ Error Handling

### Mistral API Key Missing
```json
{
  "success": false,
  "message": "Mistral API key is not configured. Please set MISTRAL_API_KEY in environment variables.",
  "error": "MISTRAL_API_KEY is not set in environment variables"
}
```

### LlamaIndex API Key Missing
```json
{
  "success": false,
  "message": "LlamaIndex API key is not configured. Please set LLAMAINDEX_API_KEY in environment variables.",
  "error": "LLAMAINDEX_API_KEY is not set in environment variables"
}
```

### Invalid Parser
```json
{
  "success": false,
  "message": "Invalid parser option. Use \"mistral\" or \"llama\"."
}
```

### Parsing Job Timeout
```json
{
  "success": false,
  "message": "Failed to process document",
  "error": "Parsing job timed out"
}
```

---

## 📝 Environment Variables

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/rag-auth

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# Mistral API
MISTRAL_API_KEY=your_mistral_api_key_here

# LlamaIndex API
LLAMAINDEX_API_KEY=your_llamaindex_api_key_here

# Server Port
PORT=8080
```

---

## 🚀 Frontend Integration

The frontend now includes a **Parser Selection** dropdown in the upload page:

```javascript
// State for parser selection
const [selectedParser, setSelectedParser] = useState('mistral');

// In FormData
formData.append('parser', selectedParser);
```

**UI Options:**
- **Mistral OCR** (default)
- **LlamaIndex (Llama)**

---

## 📚 References

- [LlamaIndex Cloud API Documentation](https://developers.llamaindex.ai/cloud-api-reference)
- [LlamaIndex Upload File API](https://developers.llamaindex.ai/cloud-api-reference/upload-file-api-v-1-files-post)
- [LlamaIndex Parsing API](https://developers.llamaindex.ai/cloud-api-reference/category/parsing)
- [Mistral OCR Documentation](https://docs.mistral.ai/capabilities/ocr/)

---

## 🐛 Troubleshooting

### Issue: "request entity too large"
**Solution:** Body size limit increased to 50MB in `src/app.js`:
```javascript
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```

### Issue: LlamaIndex job timeout
**Cause:** Document is too large or API is slow
**Solution:** 
- Increase `maxAttempts` in `llamaIndexService.js`
- Use smaller documents
- Try Mistral parser instead

### Issue: Parser not switching
**Cause:** Old value cached in frontend state
**Solution:** 
- Clear browser cache
- Restart frontend dev server
- Check Network tab to verify correct `parser` value in FormData

---

## 📊 Database Schema

Documents are saved with parser metadata:

```javascript
{
  userId: ObjectId,
  fileName: "document.pdf",
  fileSize: 123456,
  fileType: "application/pdf",
  originalText: "Full extracted text...",
  pages: 5,
  detailedPages: [...],
  metadata: {
    parser: "llama",              // or "mistral"
    model: "llamaindex-parser",
    jobId: "job_123456",
    pageCount: 5,
    processingTime: "2.5s",
    processedAt: ISODate("2026-01-20T...")
  },
  status: "original",
  createdAt: ISODate("2026-01-20T..."),
  updatedAt: ISODate("2026-01-20T...")
}
```

---

## ✅ Checklist

- [x] Install `axios` and `form-data` packages
- [x] Create `llamaIndexService.js`
- [x] Update `ocrController.js` to support parser selection
- [x] Update `ocrRoutes.js` documentation
- [x] Add `LLAMAINDEX_API_KEY` to `.env`
- [ ] Update frontend upload page with parser selection
- [ ] Test with both parsers
- [ ] Monitor API usage and costs

---

**Last Updated:** January 20, 2026
**Version:** 2.0.0
