# 📄 Page-by-Page Document Storage with Metadata

## Overview

Documents are **extracted and saved page by page** in the database with comprehensive metadata for each page. This allows granular access to individual pages and their properties.

---

## 🗄️ Database Schema

### **Document Model**

```javascript
{
  userId: ObjectId,
  fileName: "document.pdf",
  fileSize: 245600,
  fileType: "application/pdf",
  originalText: "Full concatenated text...",
  pages: 5,
  
  // ✅ PAGE-BY-PAGE STORAGE WITH METADATA
  pagesData: [
    {
      pageNumber: 1,
      text: "Page 1 text content...",
      markdown: "# Page 1\n\nContent...",
      tables: [
        {
          rows: [...],
          columns: [...],
          data: [[...]]
        }
      ],
      images: [
        {
          base64: "...",
          position: {...},
          size: {...}
        }
      ],
      header: "Document Header",
      footer: "Page 1",
      metadata: {
        confidence: 0.95,
        processingTime: 1.2,
        wordCount: 450,
        characterCount: 2850
      }
    },
    {
      pageNumber: 2,
      text: "Page 2 text content...",
      // ... same structure for each page
    }
  ],
  
  metadata: {
    parser: "mistral",
    model: "mistral-ocr-latest",
    processedAt: ISODate("2026-01-20T..."),
    pageCount: 5,
    processingTime: "5.2s"
  }
}
```

---

## ✨ Page Structure

### **Each Page Contains:**

| Field | Type | Description |
|-------|------|-------------|
| `pageNumber` | Number | Sequential page number (1-indexed) |
| `text` | String | Plain text content of the page |
| `markdown` | String | Markdown-formatted content |
| `tables` | Array | All tables found on this page |
| `images` | Array | All images found on this page |
| `header` | String | Page header (if extracted) |
| `footer` | String | Page footer (if extracted) |
| `metadata.confidence` | Number | OCR confidence score |
| `metadata.processingTime` | Number | Time taken to process this page |
| `metadata.wordCount` | Number | Number of words on this page |
| `metadata.characterCount` | Number | Number of characters on this page |

---

## 📡 API Endpoints

### **1. Get All Pages from Document**

```bash
GET /api/documents/:id/pages
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "678d65c95cddb0ebfb86ee28",
    "fileName": "document.pdf",
    "totalPages": 5,
    "pages": [
      {
        "pageNumber": 1,
        "text": "Page 1 content...",
        "markdown": "# Page 1...",
        "tables": [],
        "images": [],
        "header": "Document Title",
        "footer": "Page 1",
        "metadata": {
          "confidence": 0.95,
          "processingTime": 1.2,
          "wordCount": 450,
          "characterCount": 2850
        }
      },
      {
        "pageNumber": 2,
        "text": "Page 2 content...",
        // ... etc
      }
    ],
    "metadata": {
      "parser": "mistral",
      "model": "mistral-ocr-latest",
      "processedAt": "2026-01-20T10:30:00.000Z"
    }
  }
}
```

---

### **2. Get Specific Page**

```bash
GET /api/documents/:id/pages/:pageNumber
```

**Example:**
```bash
curl http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/pages/3 \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "678d65c95cddb0ebfb86ee28",
    "fileName": "document.pdf",
    "totalPages": 5,
    "currentPage": {
      "pageNumber": 3,
      "text": "Page 3 content goes here...",
      "markdown": "# Page 3\n\nContent...",
      "tables": [
        {
          "rows": 5,
          "columns": 3,
          "data": [[...]]
        }
      ],
      "images": [],
      "header": "Document Title",
      "footer": "Page 3",
      "metadata": {
        "confidence": 0.93,
        "processingTime": 1.5,
        "wordCount": 520,
        "characterCount": 3200
      }
    }
  }
}
```

---

## 🔄 How It Works

### **1. Document Upload**
```
User uploads PDF → OCR Processing → Page-by-page extraction
```

### **2. Page Processing**
```javascript
For each page:
  1. Extract text content
  2. Extract tables (if any)
  3. Extract images (if any)
  4. Extract header/footer (if enabled)
  5. Calculate metadata:
     - Word count
     - Character count
     - Confidence score (from OCR)
     - Processing time
```

### **3. Database Storage**
```javascript
Document {
  originalText: "All pages concatenated",
  pages: 5,
  pagesData: [
    { pageNumber: 1, text: "...", metadata: {...} },
    { pageNumber: 2, text: "...", metadata: {...} },
    { pageNumber: 3, text: "...", metadata: {...} },
    { pageNumber: 4, text: "...", metadata: {...} },
    { pageNumber: 5, text: "...", metadata: {...} }
  ]
}
```

---

## 📊 Metadata Captured

### **Document-Level Metadata**
```javascript
{
  parser: "mistral" | "llama",
  model: "mistral-ocr-latest" | "llamaindex-parser",
  processedAt: Date,
  pageCount: 5,
  processingTime: "5.2s",
  jobId: "job_abc123" // (LlamaIndex only)
}
```

### **Page-Level Metadata**
```javascript
{
  confidence: 0.95,        // OCR confidence (0-1)
  processingTime: 1.2,     // Seconds to process this page
  wordCount: 450,          // Number of words
  characterCount: 2850     // Number of characters
}
```

---

## 🎯 Use Cases

### **1. Page-by-Page Navigation**
```javascript
// Get page 1
GET /api/documents/:id/pages/1

// Get page 2
GET /api/documents/:id/pages/2

// etc.
```

### **2. Selective Page Access**
```javascript
// Only fetch the pages you need
const page5 = await fetch(`/api/documents/${id}/pages/5`)
```

### **3. Page-Specific Editing**
```javascript
// Edit only specific pages
// Retrieve page → Edit → Update
```

### **4. Analytics**
```javascript
// Analyze per-page metrics
- Which pages have low confidence?
- Which pages took longest to process?
- Which pages have the most words?
```

---

## 🔍 Example Queries

### **MongoDB Queries**

**Find documents with specific page content:**
```javascript
db.documents.find({
  "pagesData.text": /specific text/
})
```

**Find pages with low confidence:**
```javascript
db.documents.find({
  "pagesData.metadata.confidence": { $lt: 0.8 }
})
```

**Find pages with tables:**
```javascript
db.documents.find({
  "pagesData.tables.0": { $exists: true }
})
```

**Get total word count across all pages:**
```javascript
db.documents.aggregate([
  { $unwind: "$pagesData" },
  { $group: {
    _id: "$_id",
    totalWords: { $sum: "$pagesData.metadata.wordCount" }
  }}
])
```

---

## 💡 Benefits

### **For Developers**
1. ✅ Granular access to individual pages
2. ✅ Page-specific metadata for analytics
3. ✅ Efficient page retrieval (no need to load full document)
4. ✅ Table and image extraction per page
5. ✅ Header/footer extraction per page

### **For Users**
1. ✅ View specific pages without loading entire document
2. ✅ Edit individual pages
3. ✅ See per-page statistics
4. ✅ Navigate large documents efficiently
5. ✅ Search within specific pages

### **For Analytics**
1. ✅ Page-level processing metrics
2. ✅ Confidence scores per page
3. ✅ Word/character counts per page
4. ✅ Identify problematic pages
5. ✅ Performance analysis

---

## 🚀 Performance

### **Storage Efficiency**
```javascript
// Instead of storing one large blob:
originalText: "50,000 characters..." // Hard to navigate

// We store structured pages:
pagesData: [
  { pageNumber: 1, text: "...", metadata: {...} },
  { pageNumber: 2, text: "...", metadata: {...} },
  // ... easy to query and retrieve
]
```

### **Query Efficiency**
```javascript
// Bad: Load entire document to get page 5
const doc = await Document.findById(id)
const page5Text = extractPage5(doc.originalText) // Slow

// Good: Direct page access
const page5 = await Document.findOne(
  { _id: id, "pagesData.pageNumber": 5 },
  { "pagesData.$": 1 }
) // Fast!
```

---

## 📋 Sample Data

### **Example Document in Database**

```javascript
{
  "_id": "678d65c95cddb0ebfb86ee28",
  "userId": "678d123456789abcdef12345",
  "fileName": "annual-report.pdf",
  "fileSize": 1245600,
  "fileType": "application/pdf",
  "originalText": "Executive Summary\n\nThis annual report...",
  "pages": 3,
  "pagesData": [
    {
      "pageNumber": 1,
      "text": "Executive Summary\n\nThis annual report presents...",
      "markdown": "# Executive Summary\n\nThis annual report presents...",
      "tables": [],
      "images": [
        {
          "base64": "iVBORw0KGgoAAAANSUhEUg...",
          "position": { "x": 100, "y": 50 },
          "size": { "width": 200, "height": 150 }
        }
      ],
      "header": "Annual Report 2025",
      "footer": "Page 1 of 3",
      "metadata": {
        "confidence": 0.97,
        "processingTime": 1.2,
        "wordCount": 345,
        "characterCount": 2156
      }
    },
    {
      "pageNumber": 2,
      "text": "Financial Overview\n\nRevenue increased by 25%...",
      "markdown": "# Financial Overview\n\nRevenue increased by 25%...",
      "tables": [
        {
          "rows": 5,
          "columns": 4,
          "headers": ["Quarter", "Revenue", "Expenses", "Profit"],
          "data": [
            ["Q1", "$1.2M", "$800K", "$400K"],
            ["Q2", "$1.5M", "$900K", "$600K"],
            // ...
          ]
        }
      ],
      "images": [],
      "header": "Annual Report 2025",
      "footer": "Page 2 of 3",
      "metadata": {
        "confidence": 0.94,
        "processingTime": 1.8,
        "wordCount": 512,
        "characterCount": 3245
      }
    },
    {
      "pageNumber": 3,
      "text": "Conclusion\n\nIn summary, our company has...",
      "markdown": "# Conclusion\n\nIn summary, our company has...",
      "tables": [],
      "images": [],
      "header": "Annual Report 2025",
      "footer": "Page 3 of 3",
      "metadata": {
        "confidence": 0.96,
        "processingTime": 1.1,
        "wordCount": 298,
        "characterCount": 1876
      }
    }
  ],
  "metadata": {
    "parser": "mistral",
    "model": "mistral-ocr-latest",
    "processedAt": "2026-01-20T15:30:45.123Z",
    "pageCount": 3,
    "processingTime": "4.1s"
  },
  "status": "original",
  "createdAt": "2026-01-20T15:30:45.123Z",
  "updatedAt": "2026-01-20T15:30:45.123Z"
}
```

---

## ✅ Client Requirements Met

### **✓ Page-by-Page Extraction**
- Each page is processed individually
- Text, tables, and images extracted per page

### **✓ Page-Wise Storage**
- `pagesData` array stores each page separately
- Indexed by `pageNumber` for quick access

### **✓ Metadata for Each Page**
- Confidence scores
- Processing time
- Word and character counts
- Tables and images metadata

### **✓ Granular Access**
- Retrieve specific pages via API
- Retrieve all pages with metadata
- Query individual page properties

---

## 🎉 Summary

**Your documents are now:**
- ✅ Extracted **page by page**
- ✅ Saved **page-wise** in database
- ✅ Enriched with **comprehensive metadata**
- ✅ Accessible via **dedicated APIs**
- ✅ Optimized for **efficient retrieval**
- ✅ Ready for **advanced analytics**

---

**Last Updated:** January 20, 2026  
**Version:** 4.0.0 (Page-by-Page Storage)
