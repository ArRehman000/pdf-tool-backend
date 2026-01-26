# 🚀 LlamaIndex Integration - Quick Setup Guide

## ✅ What's Been Implemented

Your RAG Document Manager now supports **dual parser engines**:

1. **Mistral OCR** - Advanced OCR with tables, headers, footers, images
2. **LlamaIndex (Llama)** - Fast text extraction powered by LlamaIndex AI

---

## 🔧 Setup Instructions

### Step 1: Install Dependencies

Already done! ✅ The following packages have been added:
- `axios` - For HTTP requests to LlamaIndex API
- `form-data` - For file uploads to LlamaIndex

### Step 2: Add API Keys to `.env`

Open your `.env` file and add your LlamaIndex API key:

```env
# Existing keys
MISTRAL_API_KEY=your_mistral_api_key_here

# NEW: Add this
LLAMAINDEX_API_KEY=your_llamaindex_api_key_here
```

**Get your LlamaIndex API key:**
1. Go to https://cloud.llamaindex.ai/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste it into your `.env` file

### Step 3: Restart Backend Server

The backend must be restarted for the changes to take effect:

```bash
# Stop the backend (Ctrl+C in the terminal)
# Then restart:
cd G:\rag\rag-application
npm run dev
```

### Step 4: Restart Frontend (Optional)

If the frontend is running, restart it:

```bash
# Stop the frontend (Ctrl+C in the terminal)
# Then restart:
cd G:\rag\starter-kit
npm run dev
```

---

## 🎨 Frontend Changes

### New UI Feature: Parser Selection

The upload page now includes a **Parser Selection** radio group:

```
┌─────────────────────────────────────────────────┐
│ Select Parser                                   │
│                                                 │
│ ◉ Mistral OCR                                   │
│   Advanced OCR with tables, headers, and images │
│                                                 │
│ ○ LlamaIndex (Llama)                           │
│   Fast text extraction powered by LlamaIndex   │
└─────────────────────────────────────────────────┘
```

**Features:**
- Default: Mistral OCR
- Mistral-specific options (headers, footers, images) are hidden when LlamaIndex is selected
- The result card shows which parser was used

---

## 🧪 Testing

### Test 1: Upload with Mistral Parser

1. Go to `http://localhost:3000/documents/upload`
2. Select **Mistral OCR** parser (default)
3. Upload a PDF document
4. Enable "Save document to database"
5. Click "Upload & Process"

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "fileName": "document.pdf",
    "pages": 5,
    "fullText": "...",
    "parser": "mistral",
    "model": "mistral-ocr-latest"
  }
}
```

### Test 2: Upload with LlamaIndex Parser

1. Go to `http://localhost:3000/documents/upload`
2. Select **LlamaIndex (Llama)** parser
3. Upload a PDF document
4. Enable "Save document to database"
5. Click "Upload & Process"

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "fileName": "document.pdf",
    "pages": 5,
    "fullText": "...",
    "parser": "llama",
    "model": "llamaindex-parser",
    "jobId": "job_123456"
  }
}
```

### Test 3: cURL Test (LlamaIndex)

```bash
curl -X POST http://localhost:8080/api/ocr/process \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -F "document=@test.pdf" \
  -F "parser=llama" \
  -F "save_document=true"
```

---

## 📁 Files Changed

### Backend
- ✅ `package.json` - Added axios, form-data
- ✅ `src/services/llamaIndexService.js` - **NEW** LlamaIndex API integration
- ✅ `src/controllers/ocrController.js` - Added parser selection logic
- ✅ `src/routes/ocrRoutes.js` - Updated documentation
- ✅ `src/app.js` - Increased body limit to 50MB
- ✅ `PARSER_INTEGRATION.md` - **NEW** Comprehensive documentation

### Frontend
- ✅ `src/pages/documents/upload.js` - Added parser selection UI

---

## 🆚 Parser Comparison

| Feature | Mistral OCR | LlamaIndex |
|---------|-------------|------------|
| **PDF Support** | ✅ Excellent | ✅ Good |
| **DOCX Support** | ✅ Yes | ✅ Yes |
| **Table Extraction** | ✅ HTML/Markdown | ✅ Basic |
| **Header/Footer** | ✅ Yes | ❌ No |
| **Images** | ✅ Base64 | ❌ No |
| **Speed** | ⚡ Fast | ⚡ Fast |
| **Multi-language** | ✅ Excellent | ✅ Good |

---

## ⚠️ Troubleshooting

### Error: "LLAMAINDEX_API_KEY is not set"

**Solution:** Add the API key to your `.env` file and restart the backend.

### Error: "Parsing job timed out"

**Cause:** Large document or slow API response

**Solution:** 
- Try a smaller document
- Use Mistral parser instead
- Check your LlamaIndex API quota

### Error: "request entity too large"

**Solution:** Already fixed! Body limit increased to 50MB in `src/app.js`.

### Frontend: Parser not changing

**Solution:**
1. Clear browser cache
2. Restart frontend dev server
3. Check Network tab to verify `parser` value in FormData

---

## 🔐 Security Notes

- Both API keys should be kept in `.env` and **NEVER** committed to Git
- The `.env` file is already in `.gitignore`
- API keys are only used server-side, never exposed to frontend

---

## 📊 API Endpoints

### Upload & Process
```
POST /api/ocr/process
FormData:
  - document: File
  - parser: "mistral" | "llama"
  - save_document: boolean
```

### Process from URL
```
POST /api/ocr/process-url
JSON Body:
  - document_url: string
  - parser: "mistral" | "llama"
```

---

## 📚 Documentation

For complete API documentation, see:
- `PARSER_INTEGRATION.md` - Comprehensive integration guide
- `API_ENDPOINTS.md` - All API endpoints
- `README.md` - General project documentation

---

## 🎯 Next Steps

1. ✅ Add `LLAMAINDEX_API_KEY` to your `.env` file
2. ✅ Restart backend server
3. ✅ Test with both parsers
4. ✅ Monitor API usage and costs

---

## 🎉 You're All Set!

Your RAG Document Manager now supports dual parsing engines. Users can choose between **Mistral OCR** (advanced features) and **LlamaIndex** (simple, fast extraction) based on their needs!

**Questions or issues?** Check the documentation or logs for detailed error messages.

---

**Implementation Date:** January 20, 2026  
**Version:** 2.0.0
