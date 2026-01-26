# 🚀 Quick Guide: Edit Specific Parts of Your OCR Text

## Your Scenario

You have this text in your document:
```
Recent subjects include
Modernisms, Sciences, Music
and Private Press &amp; Illustrated Books
```

You want to edit just this part without rewriting the entire document.

---

## ✅ Solution 1: Find and Replace (Recommended)

### Step 1: Use Find-Replace to Fix This Section

**Postman:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/find-replace`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "find": "Recent subjects include\nModernisms, Sciences, Music\nand Private Press &amp; Illustrated Books",
  "replace": "Recent subjects include:\n- Modernism\n- Sciences\n- Music\n- Private Press & Illustrated Books"
}
```

**cURL:**
```bash
curl -X POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/find-replace \
  -H "Content-Type: application/json" \
  -d "{\"find\":\"Recent subjects include\\nModernisms, Sciences, Music\\nand Private Press &amp; Illustrated Books\",\"replace\":\"Recent subjects include:\\n- Modernism\\n- Sciences\\n- Music\\n- Private Press & Illustrated Books\"}"
```

---

## ✅ Solution 2: Fix Just the HTML Entity

If you only want to fix `&amp;` → `&`:

**Postman:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/find-replace`
- Body:
```json
{
  "find": "&amp;",
  "replace": "&",
  "replaceAll": true
}
```

This will find ALL instances of `&amp;` in the document and replace them with `&`.

---

## ✅ Solution 3: Batch Fix Multiple Issues

**Postman:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/batch-replace`
- Body:
```json
{
  "replacements": [
    {
      "find": "&amp;",
      "replace": "&"
    },
    {
      "find": "Modernisms",
      "replace": "Modernism"
    },
    {
      "find": "Recent subjects include\nModernisms",
      "replace": "Recent subjects include:\n- Modernism"
    }
  ]
}
```

This will make all three replacements in one request!

---

## ✅ Solution 4: Preview First (Safe Way)

**Step 1: Preview what will be replaced**

**Postman:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/preview-replace`
- Body:
```json
{
  "find": "&amp;",
  "replace": "&"
}
```

**Response shows:**
```json
{
  "success": true,
  "message": "Found 3 match(es)",
  "data": {
    "matchCount": 3,
    "matches": [
      {
        "text": "&amp;",
        "position": 150,
        "context": "...Private Press &amp; Illustrated..."
      }
    ]
  }
}
```

**Step 2: If looks good, commit the changes**

**Postman:**
- Method: `POST`
- URL: `http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/find-replace`
- Body:
```json
{
  "find": "&amp;",
  "replace": "&",
  "replaceAll": true
}
```

---

## 📊 Complete Test Flow

### Test 1: Preview and Replace HTML Entities

```bash
# 1. Preview
curl -X POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/preview-replace \
  -H "Content-Type: application/json" \
  -d '{"find":"&amp;","replace":"&"}'

# 2. If OK, replace
curl -X POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/find-replace \
  -H "Content-Type: application/json" \
  -d '{"find":"&amp;","replace":"&","replaceAll":true}'
```

### Test 2: Fix Multiple Things at Once

```bash
curl -X POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/batch-replace \
  -H "Content-Type: application/json" \
  -d '{
    "replacements": [
      {"find": "&amp;", "replace": "&"},
      {"find": "Modernisms", "replace": "Modernism"}
    ]
  }'
```

### Test 3: Verify Changes

```bash
# Get the updated document
curl -X GET http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28
```

---

## 🎯 Real Example for Your Document

Based on your API response showing:
```
"originalText": "...Recent subjects include\nModernisms, Sciences, Music\nand Private Press &amp; Illustrated Books..."
```

**To fix just the "&amp;" part:**

```json
POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/find-replace

{
  "find": "&amp;",
  "replace": "&",
  "replaceAll": true
}
```

**Expected Result:**
```
✅ "Successfully replaced 1 occurrence(s)"

"editedText": "...Recent subjects include\nModernisms, Sciences, Music\nand Private Press & Illustrated Books..."
```

**To fix multiple issues:**

```json
POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/batch-replace

{
  "replacements": [
    {"find": "&amp;", "replace": "&"},
    {"find": "Modernisms", "replace": "Modernism"}
  ]
}
```

**Expected Result:**
```
✅ "Successfully made 2 replacement(s) across 2 search term(s)"

"editedText": "...Recent subjects include\nModernism, Sciences, Music\nand Private Press & Illustrated Books..."
```

---

## 🔥 Advanced: Use Regex

If you want to replace multiple HTML entities at once using a pattern:

```json
POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/find-replace

{
  "find": "&[a-z]+;",
  "replace": " ",
  "useRegex": true,
  "replaceAll": true
}
```

This will replace `&amp;`, `&lt;`, `&gt;`, `&quot;`, etc. with spaces.

---

## 📝 Summary

| What You Want | Endpoint to Use | Best For |
|---------------|----------------|----------|
| Fix one specific text | `/find-replace` | Quick fixes, HTML entities |
| Fix multiple things | `/batch-replace` | Multiple corrections at once |
| Check before changing | `/preview-replace` | Safety check first |
| Replace entire text | `PUT /documents/:id` | Complete rewrite |

---

## ✨ Key Benefits

✅ **No need to rewrite entire document**
✅ **Original text is preserved** (`originalText` never changes)
✅ **Multiple replacements in one request**
✅ **Preview before committing**
✅ **Supports regex for advanced patterns**
✅ **Case-sensitive or insensitive options**

---

## 🚀 Try It Now!

**Quick Test:**
```bash
# 1. Login (get your JWT cookie)
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' \
  -c cookies.txt

# 2. Fix the &amp; in your document
curl -X POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/find-replace \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"find":"&amp;","replace":"&","replaceAll":true}'

# 3. Get the updated document
curl -X GET http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28 \
  -b cookies.txt
```

**That's it! Your specific part is now edited!** 🎉
