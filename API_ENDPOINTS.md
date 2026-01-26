# API Endpoints Documentation

Base URL: `http://localhost:5000`

## Table of Contents
- [Authentication Routes](#authentication-routes)
- [User Routes](#user-routes)
- [Admin Routes](#admin-routes)
- [Error Responses](#error-responses)

---

## Authentication Routes

### 1. Register New User

**Endpoint:** `POST /api/auth/register`

**Access:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password@123"
}
```

**Validation Rules:**
- `name`: Required, minimum 2 characters
- `email`: Required, valid email format
- `password`: Required, minimum 6 characters, must contain uppercase, lowercase, and number

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "65abc123def456789...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

### 2. Login

**Endpoint:** `POST /api/auth/login`

**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password@123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "65abc123def456789...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

**Note:** JWT token is set in HTTP-only cookie named `token`

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. Logout

**Endpoint:** `POST /api/auth/logout`

**Access:** Protected (requires authentication)

**Headers:**
- Cookie: `token=<jwt_token>` (automatically sent by browser)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 4. Get Current User

**Endpoint:** `GET /api/auth/me`

**Access:** Protected (requires authentication)

**Headers:**
- Cookie: `token=<jwt_token>` (automatically sent by browser)

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "userId": "65abc123def456789...",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

---

## User Routes

All user routes require authentication (JWT token in cookie).

### 1. Get User Profile

**Endpoint:** `GET /api/user/profile`

**Access:** Protected (all authenticated users)

**Headers:**
- Cookie: `token=<jwt_token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "user": {
    "userId": "65abc123def456789...",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

---

### 2. User Dashboard

**Endpoint:** `GET /api/user/dashboard`

**Access:** Protected (all authenticated users)

**Headers:**
- Cookie: `token=<jwt_token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Welcome to your dashboard",
  "data": {
    "username": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "message": "This is a protected user route accessible to all authenticated users"
  }
}
```

---

## Admin Routes

All admin routes require authentication AND admin role.

### 1. Admin Dashboard

**Endpoint:** `GET /api/admin/dashboard`

**Access:** Protected (admin only)

**Headers:**
- Cookie: `token=<jwt_token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Welcome to admin dashboard",
  "admin": {
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  },
  "data": {
    "message": "This route is accessible only to users with admin role"
  }
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Access denied. admin role required."
}
```

---

### 2. Get All Users

**Endpoint:** `GET /api/admin/users`

**Access:** Protected (admin only)

**Headers:**
- Cookie: `token=<jwt_token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "count": 3,
  "users": [
    {
      "_id": "65abc123def456789...",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "createdAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "_id": "65abc456def789012...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 3. Get User by ID

**Endpoint:** `GET /api/admin/users/:id`

**Access:** Protected (admin only)

**URL Parameters:**
- `id`: MongoDB ObjectId of the user

**Headers:**
- Cookie: `token=<jwt_token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "user": {
    "_id": "65abc456def789012...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 4. Delete User

**Endpoint:** `DELETE /api/admin/users/:id`

**Access:** Protected (admin only)

**URL Parameters:**
- `id`: MongoDB ObjectId of the user

**Headers:**
- Cookie: `token=<jwt_token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "You cannot delete your own account"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

or

```json
{
  "success": false,
  "message": "Invalid token."
}
```

or

```json
{
  "success": false,
  "message": "Token has expired."
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "Access denied. admin role required."
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Route not found",
  "path": "/api/invalid/route"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Internal Server Error",
  "stack": "Error: ... (only in development mode)"
}
```

---

## Cookie Details

**Cookie Name:** `token`

**Cookie Options:**
- `httpOnly`: true (prevents JavaScript access)
- `secure`: true (only in production, requires HTTPS)
- `sameSite`: "strict" (CSRF protection)
- `maxAge`: 7 days (604800000 milliseconds)

**Example Cookie Header:**
```
Set-Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800
```

---

## cURL Examples

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Password@123"}'
```

### Login (save cookies)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Password@123"}' \
  -c cookies.txt -v
```

### Access Protected Route (use saved cookies)
```bash
curl -X GET http://localhost:5000/api/user/profile \
  -b cookies.txt
```

### Admin Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' \
  -c admin-cookies.txt -v
```

### Get All Users (admin only)
```bash
curl -X GET http://localhost:5000/api/admin/users \
  -b admin-cookies.txt
```

### Delete User (admin only)
```bash
curl -X DELETE http://localhost:5000/api/admin/users/USER_ID_HERE \
  -b admin-cookies.txt
```

---

## Notes

1. **Cookies are automatically managed** by the browser after login
2. **Passwords are never returned** in any API response
3. **Admin role cannot be assigned** via the registration API
4. **Token expires after 7 days** and user must login again
5. **All timestamps** are in ISO 8601 format (UTC)
6. **MongoDB ObjectIds** are 24-character hexadecimal strings

---

## Testing Workflow

1. Register a new user
2. Login with the user credentials
3. Access user routes (profile, dashboard)
4. Try to access admin routes (should get 403)
5. Login as admin
6. Access admin routes (dashboard, users list)
7. Test logout
8. Try to access protected routes after logout (should get 401)

---

## 📝 Document Management & Editing Endpoints

### Base URL
```
http://localhost:8080/api/documents
```

All document endpoints require authentication (JWT cookie).

---

### 1. Get All Documents
**GET** `/api/documents`

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)
- `sort` (optional) - Sort field (default: -createdAt)

**Example:**
```bash
curl -X GET "http://localhost:8080/api/documents?page=1&limit=10" \
  -b cookies.txt
```

---

### 2. Get Single Document
**GET** `/api/documents/:id`

**Example:**
```bash
curl -X GET http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28 \
  -b cookies.txt
```

---

### 3. Update Document (Full Text)
**PUT** `/api/documents/:id`

**Body:**
```json
{
  "editedText": "Complete edited text here..."
}
```

**Example:**
```bash
curl -X PUT http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28 \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"editedText":"My complete edited document text..."}'
```

---

### 4. Find and Replace 🆕
**POST** `/api/documents/:id/find-replace`

**Body:**
```json
{
  "find": "text to find",
  "replace": "replacement text",
  "replaceAll": true,
  "caseSensitive": false,
  "useRegex": false
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/find-replace \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"find":"&amp;","replace":"&","replaceAll":true}'
```

---

### 5. Batch Find and Replace 🆕
**POST** `/api/documents/:id/batch-replace`

**Body:**
```json
{
  "replacements": [
    {"find": "text1", "replace": "replacement1"},
    {"find": "text2", "replace": "replacement2"}
  ],
  "caseSensitive": false
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/batch-replace \
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

### 6. Edit Text Portion by Position 🆕
**POST** `/api/documents/:id/edit-portion`

**Body:**
```json
{
  "startPosition": 0,
  "endPosition": 50,
  "newText": "replacement text"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/edit-portion \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"startPosition":150,"endPosition":200,"newText":"New section text"}'
```

---

### 7. Preview Find and Replace 🆕
**POST** `/api/documents/:id/preview-replace`

**Body:**
```json
{
  "find": "text to find",
  "replace": "replacement",
  "replaceAll": true,
  "caseSensitive": false
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28/preview-replace \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"find":"&amp;","replace":"&"}'
```

**Response:**
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
        "length": 5,
        "context": "...surrounding text &amp; more text..."
      }
    ],
    "willReplace": 3,
    "preview": true
  }
}
```

---

### 8. Delete Document
**DELETE** `/api/documents/:id`

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/documents/678d65c95cddb0ebfb86ee28 \
  -b cookies.txt
```

---

### 9. Search Documents
**GET** `/api/documents/search?query=keyword`

**Example:**
```bash
curl -X GET "http://localhost:8080/api/documents/search?query=invoice" \
  -b cookies.txt
```

---

### 10. Get Document Statistics
**GET** `/api/documents/stats`

**Example:**
```bash
curl -X GET http://localhost:8080/api/documents/stats \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDocuments": 48,
    "editedDocuments": 12,
    "originalDocuments": 36,
    "recentDocuments": [...]
  }
}
```

---

## 📚 Complete API Reference

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Auth** | `/api/auth/register` | POST | Register new user |
| **Auth** | `/api/auth/login` | POST | Login user |
| **Auth** | `/api/auth/logout` | POST | Logout user |
| **Auth** | `/api/auth/me` | GET | Get current user |
| **User** | `/api/user/profile` | GET | Get user profile |
| **User** | `/api/user/dashboard` | GET | User dashboard |
| **Admin** | `/api/admin/dashboard` | GET | Admin dashboard |
| **Admin** | `/api/admin/users` | GET | Get all users |
| **Admin** | `/api/admin/users/:id` | GET | Get user by ID |
| **Admin** | `/api/admin/users/:id` | DELETE | Delete user |
| **OCR** | `/api/ocr/process` | POST | Process document with OCR |
| **OCR** | `/api/ocr/process-url` | POST | Process document from URL |
| **Docs** | `/api/documents` | GET | Get all documents |
| **Docs** | `/api/documents/:id` | GET | Get single document |
| **Docs** | `/api/documents/:id` | PUT | Update full text |
| **Docs** | `/api/documents/:id/find-replace` | POST | Find and replace text 🆕 |
| **Docs** | `/api/documents/:id/batch-replace` | POST | Batch replacements 🆕 |
| **Docs** | `/api/documents/:id/edit-portion` | POST | Edit by position 🆕 |
| **Docs** | `/api/documents/:id/preview-replace` | POST | Preview changes 🆕 |
| **Docs** | `/api/documents/:id` | DELETE | Delete document |
| **Docs** | `/api/documents/search` | GET | Search documents |
| **Docs** | `/api/documents/stats` | GET | Get statistics |

---

**For detailed documentation:**
- **RBAC & Auth:** See `README.md` and `SETUP.md`
- **OCR Features:** See `OCR_DOCUMENTATION.md`
- **Document Editing:** See `DOCUMENT_MANAGEMENT.md`
- **Quick Edit Guide:** See `QUICK_EDIT_GUIDE.md`
