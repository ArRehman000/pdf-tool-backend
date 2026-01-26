# 📝 Document Management API - Edit OCR Results

Complete guide for managing, editing, and storing OCR-processed documents.

---

## 🎯 Overview

After processing documents with OCR, you can:
- ✅ **Save** OCR results to database
- ✅ **Edit** the extracted text
- ✅ **Retrieve** documents later
- ✅ **Search** through documents
- ✅ **Delete** documents
- ✅ **View statistics**

---

## 📡 API Endpoints

Base URL: `http://localhost:8080`

### 1. **Process & Save Document**

**Endpoint:** `POST /api/ocr/process`

**New Option:** Add `save_document` field to save the result!

**Form Data:**
```
document (File): your-file.pdf
table_format (Text): html
save_document (Text): true    ← NEW! Set to "true" to save
```

**Response:**
```json
{
  "success": true,
  "message": "Document processed and saved successfully",
  "data": {
    "fileName": "document.pdf",
    "fileSize": 123456,
    "pages": 3,
    "fullText": "Extracted text...",
    "detailedPages": [...],
    "model": "mistral-ocr-latest",
    "usage": {...},
    "documentId": "65abc123def456789...",  ← Document ID for editing
    "saved": true
  }
}
```

---

### 2. **Get All Documents**

**Endpoint:** `GET /api/documents`

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)
- `sort` (optional) - Sort field (default: -createdAt)

**Example:**
```
GET /api/documents?page=1&limit=10&sort=-createdAt
```

**Response:**
```json
{
  "success": true,
  "message": "Documents retrieved successfully",
  "data": {
    "documents": [
      {
        "_id": "65abc123...",
        "fileName": "document.pdf",
        "fileSize": 123456,
        "fileType": "application/pdf",
        "originalText": "Original extracted text...",
        "editedText": "Edited text...",
        "pages": 3,
        "status": "edited",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T11:00:00.000Z"
      }
    ],
    "totalPages": 5,
    "currentPage": 1,
    "totalDocuments": 48
  }
}
```

---

### 3. **Get Single Document**

**Endpoint:** `GET /api/documents/:id`

**Example:**
```
GET /api/documents/65abc123def456789
```

**Response:**
```json
{
  "success": true,
  "message": "Document retrieved successfully",
  "data": {
    "_id": "65abc123...",
    "fileName": "document.pdf",
    "originalText": "Original OCR text...",
    "editedText": "User edited text...",
    "pages": 3,
    "detailedPages": [...],
    "tables": [...],
    "images": [...],
    "status": "edited",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 4. **Edit/Update Document Text** ⭐

**Endpoint:** `PUT /api/documents/:id`

**Content-Type:** `application/json`

**Body:**
```json
{
  "editedText": "This is my edited and corrected text..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document updated successfully",
  "data": {
    "_id": "65abc123...",
    "fileName": "document.pdf",
    "originalText": "Original OCR text...",
    "editedText": "This is my edited and corrected text...",
    "status": "edited",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

**Note:** This replaces the **entire** text content. For partial edits, see the advanced editing endpoints below.

---

### 5. **Find and Replace Text** 🔥 NEW!

**Endpoint:** `POST /api/documents/:id/find-replace`

**Content-Type:** `application/json`

**Body:**
```json
{
  "find": "old text",
  "replace": "new text",
  "replaceAll": true,
  "caseSensitive": false,
  "useRegex": false
}
```

**Parameters:**
- `find` (required) - Text to find
- `replace` (required) - Text to replace with
- `replaceAll` (optional, default: true) - Replace all occurrences or just first
- `caseSensitive` (optional, default: false) - Case sensitive search
- `useRegex` (optional, default: false) - Use regex pattern

**Example:**
```json
{
  "find": "Modernisms, Sciences, Music\nand Private Press & Illustrated Books",
  "replace": "Modernism, Sciences, Music\nand Private Press & Illustrated Books (Formatted)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully replaced 1 occurrence(s)",
  "data": {
    "replacementsMade": 1,
    "textChanged": true,
    "document": {
      "_id": "65abc123...",
      "editedText": "Updated text...",
      "status": "edited"
    }
  }
}
```

**Regex Example:**
```json
{
  "find": "&amp;|&lt;|&gt;",
  "replace": " ",
  "replaceAll": true,
  "useRegex": true
}
```

---

### 6. **Batch Find and Replace** 🚀 NEW!

**Endpoint:** `POST /api/documents/:id/batch-replace`

**Content-Type:** `application/json`

**Body:**
```json
{
  "replacements": [
    { "find": "&amp;", "replace": "&" },
    { "find": "&lt;", "replace": "<" },
    { "find": "&gt;", "replace": ">" },
    { "find": "\n\n\n", "replace": "\n\n" }
  ],
  "caseSensitive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully made 15 replacement(s) across 4 search term(s)",
  "data": {
    "totalReplacements": 15,
    "textChanged": true,
    "replacementDetails": [
      { "find": "&amp;", "replace": "&", "count": 8 },
      { "find": "&lt;", "replace": "<", "count": 3 },
      { "find": "&gt;", "replace": ">", "count": 2 },
      { "find": "\n\n\n", "replace": "\n\n", "count": 2 }
    ],
    "document": {...}
  }
}
```

---

### 7. **Edit Specific Text Portion** ✂️ NEW!

**Endpoint:** `POST /api/documents/:id/edit-portion`

**Content-Type:** `application/json`

**Body:**
```json
{
  "startPosition": 150,
  "endPosition": 200,
  "newText": "This is the replacement text"
}
```

**How to find positions:**
1. Get the document text
2. Find your target text position using string methods
3. Specify start and end character positions

**Response:**
```json
{
  "success": true,
  "message": "Text portion edited successfully",
  "data": {
    "replacedText": "Recent subjects include\nModernisms",
    "replacedLength": 50,
    "newTextLength": 28,
    "startPosition": 150,
    "endPosition": 200,
    "document": {...}
  }
}
```

**Example Use Case:**
```javascript
// JavaScript example to find positions
const text = document.originalText;
const searchText = "Recent subjects include";
const startPosition = text.indexOf(searchText);
const endPosition = startPosition + searchText.length;

// Now use these positions in the API call
```

---

### 8. **Preview Find and Replace** 👁️ NEW!

**Endpoint:** `POST /api/documents/:id/preview-replace`

**Content-Type:** `application/json`

**Body:**
```json
{
  "find": "&amp;",
  "replace": "&",
  "replaceAll": true,
  "caseSensitive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Found 8 match(es)",
  "data": {
    "matchCount": 8,
    "matches": [
      {
        "text": "&amp;",
        "position": 150,
        "length": 5,
        "context": "...Recent subjects include Modernisms, &amp; Sciences..."
      },
      {
        "text": "&amp;",
        "position": 320,
        "length": 5,
        "context": "...Music &amp; Illustrated Books..."
      }
    ],
    "willReplace": 8,
    "preview": true
  }
}
```

**Note:** This endpoint does NOT save changes. Use it to preview before committing.

---

### 9. **Delete Document**

**Endpoint:** `DELETE /api/documents/:id`

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

### 10. **Search Documents**

**Endpoint:** `GET /api/documents/search?query=keyword`

**Query Parameters:**
- `query` (required) - Search term

**Example:**
```
GET /api/documents/search?query=invoice
```

**Response:**
```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "documents": [...],
    "count": 5
  }
}
```

Searches in:
- File names
- Original text
- Edited text

---

### 11. **Get Statistics**

**Endpoint:** `GET /api/documents/stats`

**Response:**
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "totalDocuments": 48,
    "editedDocuments": 12,
    "originalDocuments": 36,
    "recentDocuments": [...]
  }
}
```

---

## 🎨 Advanced Editing Examples

### Example 1: Fix HTML Entities (Single Replace)

**Scenario:** You have `&amp;` in your text and want to replace it with `&`

**Postman Request:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/YOUR_DOC_ID/find-replace`
- Body (JSON):
```json
{
  "find": "&amp;",
  "replace": "&",
  "replaceAll": true
}
```

**cURL:**
```bash
curl -X POST http://localhost:8080/api/documents/YOUR_DOC_ID/find-replace \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "find": "&amp;",
    "replace": "&",
    "replaceAll": true
  }'
```

---

### Example 2: Clean Multiple HTML Entities (Batch Replace)

**Scenario:** Clean all HTML entities at once

**Postman Request:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/YOUR_DOC_ID/batch-replace`
- Body (JSON):
```json
{
  "replacements": [
    { "find": "&amp;", "replace": "&" },
    { "find": "&lt;", "replace": "<" },
    { "find": "&gt;", "replace": ">" },
    { "find": "&quot;", "replace": "\"" },
    { "find": "&nbsp;", "replace": " " }
  ]
}
```

**cURL:**
```bash
curl -X POST http://localhost:8080/api/documents/YOUR_DOC_ID/batch-replace \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "replacements": [
      {"find": "&amp;", "replace": "&"},
      {"find": "&lt;", "replace": "<"},
      {"find": "&gt;", "replace": ">"}
    ]
  }'
```

---

### Example 3: Format List Items

**Scenario:** Convert text to bullet list

**Original Text:**
```
Recent subjects include
Modernisms, Sciences, Music
and Private Press & Illustrated Books
```

**Postman Request:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/YOUR_DOC_ID/find-replace`
- Body (JSON):
```json
{
  "find": "Recent subjects include\nModernisms, Sciences, Music\nand Private Press & Illustrated Books",
  "replace": "Recent subjects include:\n- Modernism\n- Sciences\n- Music\n- Private Press & Illustrated Books"
}
```

---

### Example 4: Preview Before Replacing

**Step 1: Preview** (doesn't save)
- Method: `POST`
- URL: `http://localhost:8080/api/documents/YOUR_DOC_ID/preview-replace`
- Body (JSON):
```json
{
  "find": "&amp;",
  "replace": "&"
}
```

**Response shows all matches and positions**

**Step 2: Confirm and Replace** (saves)
- Method: `POST`
- URL: `http://localhost:8080/api/documents/YOUR_DOC_ID/find-replace`
- Body (JSON):
```json
{
  "find": "&amp;",
  "replace": "&",
  "replaceAll": true
}
```

---

### Example 5: Edit Specific Section by Position

**Scenario:** You know the exact character positions

**Postman Request:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/YOUR_DOC_ID/edit-portion`
- Body (JSON):
```json
{
  "startPosition": 150,
  "endPosition": 200,
  "newText": "This is my new text for this section"
}
```

**Finding Positions in JavaScript:**
```javascript
// Get your document first
const response = await fetch('http://localhost:8080/api/documents/YOUR_DOC_ID');
const doc = await response.json();
const text = doc.data.originalText;

// Find position of text you want to edit
const searchText = "Recent subjects include";
const startPos = text.indexOf(searchText);
const endPos = startPos + searchText.length;

console.log(`Start: ${startPos}, End: ${endPos}`);

// Now use these positions in edit-portion endpoint
```

---

### Example 6: Case-Sensitive Replacement

**Postman Request:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/YOUR_DOC_ID/find-replace`
- Body (JSON):
```json
{
  "find": "Science",
  "replace": "SCIENCE",
  "caseSensitive": true,
  "replaceAll": true
}
```

This will only replace "Science" with exact case, not "science" or "SCIENCE".

---

### Example 7: Regex Pattern Replacement

**Scenario:** Remove all extra newlines (3+ newlines → 2 newlines)

**Postman Request:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/YOUR_DOC_ID/find-replace`
- Body (JSON):
```json
{
  "find": "\\n{3,}",
  "replace": "\\n\\n",
  "useRegex": true,
  "replaceAll": true
}
```

**More Regex Examples:**
```json
// Remove all numbers
{ "find": "\\d+", "replace": "", "useRegex": true }

// Replace multiple spaces with single space
{ "find": "\\s{2,}", "replace": " ", "useRegex": true }

// Extract email pattern
{ "find": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "replace": "[EMAIL]", "useRegex": true }
```

---

## 🧪 Complete Workflow Example

### Step 1: Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' \
  -c cookies.txt
```

### Step 2: Process & Save Document

```bash
curl -X POST http://localhost:8080/api/ocr/process \
  -b cookies.txt \
  -F "document=@document.pdf" \
  -F "table_format=html" \
  -F "save_document=true"
```

**Note the `documentId` in response!**

### Step 3: Get Document

```bash
curl -X GET http://localhost:8080/api/documents/DOCUMENT_ID_HERE \
  -b cookies.txt
```

### Step 4: Edit Document Text

```bash
curl -X PUT http://localhost:8080/api/documents/DOCUMENT_ID_HERE \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "editedText": "This is my corrected and edited text. Fixed all OCR errors."
  }'
```

### Step 5: Get All Documents

```bash
curl -X GET http://localhost:8080/api/documents \
  -b cookies.txt
```

### Step 6: Search Documents

```bash
curl -X GET "http://localhost:8080/api/documents/search?query=contract" \
  -b cookies.txt
```

### Step 7: Delete Document

```bash
curl -X DELETE http://localhost:8080/api/documents/DOCUMENT_ID_HERE \
  -b cookies.txt
```

---

## 🎯 Postman Testing

### 1. Process & Save Document

**Request:**
- Method: `POST`
- URL: `http://localhost:8080/api/ocr/process`
- Body: `form-data`
  - `document` (File): your-file.pdf
  - `table_format` (Text): `html`
  - `save_document` (Text): `true` ⭐

**Copy the `documentId` from response!**

---

### 2. Get Document

**Request:**
- Method: `GET`
- URL: `http://localhost:8080/api/documents/PASTE_DOCUMENT_ID_HERE`

---

### 3. Edit Document (Full Text)

**Request:**
- Method: `PUT`
- URL: `http://localhost:8080/api/documents/PASTE_DOCUMENT_ID_HERE`
- Body: `raw` → `JSON`
```json
{
  "editedText": "My complete corrected text here..."
}
```

---

### 3.1. Find and Replace (Partial Edit) ⭐ NEW!

**Request:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/PASTE_DOCUMENT_ID_HERE/find-replace`
- Body: `raw` → `JSON`
```json
{
  "find": "&amp;",
  "replace": "&",
  "replaceAll": true
}
```

**Use this when:** You want to replace specific text without rewriting everything.

---

### 3.2. Batch Replace (Multiple Edits) ⭐ NEW!

**Request:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/PASTE_DOCUMENT_ID_HERE/batch-replace`
- Body: `raw` → `JSON`
```json
{
  "replacements": [
    {"find": "&amp;", "replace": "&"},
    {"find": "&lt;", "replace": "<"},
    {"find": "&gt;", "replace": ">"}
  ]
}
```

**Use this when:** You need to make multiple replacements at once.

---

### 3.3. Preview Replace ⭐ NEW!

**Request:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/PASTE_DOCUMENT_ID_HERE/preview-replace`
- Body: `raw` → `JSON`
```json
{
  "find": "&amp;",
  "replace": "&"
}
```

**Use this when:** You want to see what will be replaced before committing.

---

### 4. Get All Documents

**Request:**
- Method: `GET`
- URL: `http://localhost:8080/api/documents?page=1&limit=10`

---

### 5. Search Documents

**Request:**
- Method: `GET`
- URL: `http://localhost:8080/api/documents/search?query=invoice`

---

### 6. Delete Document

**Request:**
- Method: `DELETE`
- URL: `http://localhost:8080/api/documents/PASTE_DOCUMENT_ID_HERE`

---

## 📊 Document Model Structure

```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // Owner of the document
  fileName: String,              // Original filename
  fileSize: Number,              // File size in bytes
  fileType: String,              // MIME type
  originalText: String,          // Original OCR extracted text
  editedText: String,            // User edited text (null if not edited)
  pages: Number,                 // Number of pages
  detailedPages: Array,          // Full page details from OCR
  tables: Array,                 // Extracted tables
  images: Array,                 // Extracted images
  metadata: {
    model: String,               // OCR model used
    usage: Object                // Token usage info
  },
  status: String,                // 'original' or 'edited'
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔍 Use Cases

### 1. **OCR with Partial Corrections** 🆕
```
1. Upload PDF → OCR processes it
2. Save with save_document=true
3. Review extracted text
4. Fix specific errors with /find-replace
   - Replace "&amp;" with "&"
   - Fix misspelled words
   - Format specific sections
5. Document automatically marked as 'edited'
```

**Example:**
```bash
# Fix HTML entities without rewriting entire document
POST /api/documents/:id/batch-replace
{
  "replacements": [
    {"find": "&amp;", "replace": "&"},
    {"find": "Modernisms", "replace": "Modernism"}
  ]
}
```

### 2. **Document Library**
```
1. Process multiple documents
2. Save all with save_document=true
3. Browse via GET /api/documents
4. Search via /api/documents/search
```

### 3. **Workflow Management**
```
1. Process document
2. Edit text (status: 'original' → 'edited')
3. Track via /api/documents/stats
4. Filter edited vs original
```

### 4. **Bulk Text Cleaning** 🆕
```
1. Process document with OCR
2. Preview replacements to see what will change
3. Batch replace common OCR errors:
   - HTML entities (&amp;, &lt;, etc.)
   - Extra whitespace
   - Common typos
4. Review final result
```

**Example Workflow:**
```bash
# Step 1: Preview
POST /api/documents/:id/preview-replace
{"find": "&amp;", "replace": "&"}

# Step 2: See matches (8 found)
# Step 3: Commit changes
POST /api/documents/:id/find-replace
{"find": "&amp;", "replace": "&", "replaceAll": true}
```

### 5. **Advanced Formatting** 🆕
```
1. Extract text from document
2. Use regex to clean and format:
   - Remove extra newlines
   - Format lists
   - Clean special characters
3. Edit specific portions by position
4. Preserve original text for reference
```

**Example:**
```bash
# Clean multiple newlines
POST /api/documents/:id/find-replace
{
  "find": "\\n{3,}",
  "replace": "\\n\\n",
  "useRegex": true
}
```

---

## 🔒 Security

- ✅ All routes require authentication
- ✅ Users can only access their own documents
- ✅ Document ownership verified on every request
- ✅ No cross-user document access

---

## ⚡ Performance Tips

### Pagination
Always use pagination for large document lists:
```
GET /api/documents?page=1&limit=20
```

### Selective Loading
List view excludes `detailedPages` for faster response.
Use single document endpoint for full details.

### Indexing
MongoDB indexes on:
- `userId` - Fast user queries
- `userId + createdAt` - Fast sorted queries

---

## 📝 Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ocr/process` | POST | Process & optionally save |
| `/api/documents` | GET | Get all documents |
| `/api/documents/:id` | GET | Get single document |
| `/api/documents/:id` | PUT | Edit document text (full) |
| `/api/documents/:id/find-replace` | POST | Find and replace text |
| `/api/documents/:id/batch-replace` | POST | Multiple find-replace operations |
| `/api/documents/:id/edit-portion` | POST | Edit text by character position |
| `/api/documents/:id/preview-replace` | POST | Preview replacements (no save) |
| `/api/documents/:id` | DELETE | Delete document |
| `/api/documents/search` | GET | Search documents |
| `/api/documents/stats` | GET | Get statistics |

---

## 🤔 Which Editing Method Should I Use?

| Method | When to Use | Best For |
|--------|-------------|----------|
| **PUT /documents/:id** | Full text rewrite | Complete document overhaul |
| **find-replace** | Replace specific text | Fixing recurring errors, HTML entities |
| **batch-replace** | Multiple replacements | Cleaning multiple issues at once |
| **edit-portion** | Edit by character position | Programmatic edits, known positions |
| **preview-replace** | Before committing | Checking what will change |

### Quick Decision Guide:

✅ **Use Find-Replace when:**
- You want to fix specific text (like "Modernisms" → "Modernism")
- You need to replace HTML entities (&amp;, &lt;, etc.)
- You don't want to rewrite the entire document
- You want to fix recurring OCR errors

✅ **Use Batch Replace when:**
- You have multiple things to fix (5+ replacements)
- You want to clean the document in one go
- You're standardizing formatting

✅ **Use Full Edit (PUT) when:**
- You've manually edited the entire text
- You want to completely replace the content
- You're pasting from an external editor

✅ **Use Preview First when:**
- You're unsure how many matches exist
- You want to see what will be changed
- You're using regex patterns

---

## 🚀 Quick Start

### Option 1: Quick Fix with Find-Replace (Recommended)

1. **Process & Save:**
   ```bash
   POST /api/ocr/process
   Form: document + save_document=true
   ```

2. **Get Document ID from response**

3. **Fix Specific Text:**
   ```bash
   POST /api/documents/{id}/find-replace
   Body: {
     "find": "&amp;",
     "replace": "&",
     "replaceAll": true
   }
   ```

4. **Done!** ✅

### Option 2: Full Text Edit

1. **Process & Save:**
   ```bash
   POST /api/ocr/process
   Form: document + save_document=true
   ```

2. **Get Document ID from response**

3. **Replace Complete Text:**
   ```bash
   PUT /api/documents/{id}
   Body: {"editedText": "Your complete edited text..."}
   ```

4. **Done!** ✅

### Option 3: Batch Clean (For Multiple Issues)

1. **Process & Save:**
   ```bash
   POST /api/ocr/process
   Form: document + save_document=true
   ```

2. **Get Document ID from response**

3. **Clean Multiple Issues:**
   ```bash
   POST /api/documents/{id}/batch-replace
   Body: {
     "replacements": [
       {"find": "&amp;", "replace": "&"},
       {"find": "&lt;", "replace": "<"},
       {"find": "Modernisms", "replace": "Modernism"}
     ]
   }
   ```

4. **Done!** ✅

---

## 💡 Pro Tips

### 1. Always Preview First
```bash
# See what will be replaced
POST /api/documents/:id/preview-replace
{"find": "target text", "replace": "new text"}

# Check the matches, then commit
POST /api/documents/:id/find-replace
{"find": "target text", "replace": "new text", "replaceAll": true}
```

### 2. Use Batch Replace for Common OCR Errors
```json
{
  "replacements": [
    {"find": "&amp;", "replace": "&"},
    {"find": "&quot;", "replace": "\""},
    {"find": "\\s{2,}", "replace": " "}
  ]
}
```

### 3. The Original Text is Always Preserved
- `originalText` never changes (your OCR result)
- `editedText` contains your modifications
- You can always refer back to the original

### 4. Status Tracking
- `status: "original"` - Not edited yet
- `status: "edited"` - Has modifications
- Use `/api/documents/stats` to track your progress

---

**Your documents are now editable and manageable with powerful partial editing!** 📄✏️🚀
