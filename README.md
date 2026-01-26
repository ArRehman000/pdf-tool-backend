# RBAC Authentication System

A production-ready Role-Based Access Control (RBAC) authentication system built with Node.js, Express.js, and MongoDB.

## Features

### Authentication & Authorization
- ✅ JWT-based authentication with HTTP-only cookies
- ✅ Role-Based Access Control (Admin & User)
- ✅ Password hashing with bcrypt
- ✅ Secure cookie management
- ✅ Input validation with express-validator
- ✅ Admin seeding script

### Document Processing (NEW)
- ✅ **PDF to Text conversion** with Mistral OCR
- ✅ **DOCX to Text conversion** with Mistral OCR
- ✅ **Image OCR** (PNG, JPEG) with Mistral OCR
- ✅ **Table extraction** (HTML/Markdown format)
- ✅ **Image extraction** from documents
- ✅ **Hyperlink detection**
- ✅ **Header/Footer extraction**
- ✅ Multi-page document support

### Technical
- ✅ MongoDB with Mongoose ODM
- ✅ Clean, scalable folder structure
- ✅ Environment-based configuration
- ✅ File upload handling with Multer
- ✅ Automatic file cleanup

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: express-validator
- **Security**: cookie-parser, cors
- **OCR**: Mistral AI OCR API
- **File Upload**: Multer

## Project Structure

```
src/
├── config/
│   ├── db.js                 # MongoDB connection
│   └── cookieOptions.js      # Cookie configuration
├── controllers/
│   └── authController.js     # Authentication logic
├── middleware/
│   ├── authMiddleware.js     # JWT verification
│   └── roleMiddleware.js     # Role-based access control
├── models/
│   └── User.js               # User schema
├── routes/
│   ├── authRoutes.js         # Auth endpoints
│   ├── userRoutes.js         # User endpoints
│   └── adminRoutes.js        # Admin endpoints
├── seed/
│   └── adminSeed.js          # Admin user seeder
├── utils/
│   └── generateToken.js      # JWT generation utility
├── app.js                    # Express app configuration
└── server.js                 # Server entry point
```

## Installation

1. **Clone the repository**
   ```bash
   cd rbac-auth-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory (already created with defaults):
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/rbac-auth
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   CLIENT_URL=http://localhost:3000
   MISTRAL_API_KEY=your_mistral_api_key_here
   ADMIN_NAME=Admin User
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=Admin@123
   ```

4. **Make sure MongoDB is running**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas cloud database
   # Update MONGO_URI in .env with your Atlas connection string
   ```

5. **Seed the admin user**
   ```bash
   npm run seed:admin
   ```

6. **Start the server**
   ```bash
   # Development mode with nodemon
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication Routes

#### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "..."
  }
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

**Note:** JWT token is automatically stored in HTTP-only cookie.

#### 3. Logout
```http
POST /api/auth/logout
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### 4. Get Current User
```http
GET /api/auth/me
```

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "...",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

### User Routes (Protected)

#### 1. Get Profile
```http
GET /api/user/profile
```

#### 2. User Dashboard
```http
GET /api/user/dashboard
```

### Admin Routes (Protected + Admin Only)

#### 1. Admin Dashboard
```http
GET /api/admin/dashboard
```

#### 2. Get All Users
```http
GET /api/admin/users
```

#### 3. Get User by ID
```http
GET /api/admin/users/:id
```

#### 4. Delete User
```http
DELETE /api/admin/users/:id
```

### OCR Routes (Protected - All Authenticated Users)

#### 1. Process Uploaded Document
```http
POST /api/ocr/process
Content-Type: multipart/form-data

Form Data:
- document: [PDF/DOCX/PNG/JPEG file]
- table_format: "html" (optional)
- extract_header: false (optional)
- extract_footer: false (optional)
```

#### 2. Process Document from URL
```http
POST /api/ocr/process-url
Content-Type: application/json

{
  "document_url": "https://example.com/document.pdf",
  "table_format": "html",
  "extract_header": false,
  "extract_footer": false
}
```

**Supported Formats:** PDF, DOCX, PNG, JPEG  
**Max File Size:** 10MB  
**See OCR_DOCUMENTATION.md for detailed usage**

## Security Features

### 1. Password Security
- Passwords are hashed using bcrypt with salt rounds of 10
- Password validation requires:
  - Minimum 6 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number

### 2. JWT Security
- Tokens stored in HTTP-only cookies (prevents XSS)
- SameSite: strict (prevents CSRF)
- Secure flag enabled in production (HTTPS only)
- 7-day token expiration

### 3. Role-Based Access
- Users cannot assign themselves admin role
- Admin role can only be created via seed script
- Role verification on every protected route

### 4. Data Protection
- Passwords never returned in API responses
- User model automatically excludes password field
- Input validation on all endpoints

## Testing the API

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Password@123"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Password@123"}' \
  -c cookies.txt
```

**Access Protected Route:**
```bash
curl -X GET http://localhost:5000/api/user/profile \
  -b cookies.txt
```

**Admin Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' \
  -c admin-cookies.txt
```

**Access Admin Route:**
```bash
curl -X GET http://localhost:5000/api/admin/dashboard \
  -b admin-cookies.txt
```

### Using Postman

1. Set request type and URL
2. For protected routes, ensure "Send cookies" is enabled
3. After login, cookies are automatically stored
4. Use the stored cookies for subsequent requests

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment (development/production) | No | development |
| `PORT` | Server port | No | 5000 |
| `MONGO_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT signing | Yes | - |
| `CLIENT_URL` | Frontend URL for CORS | No | http://localhost:3000 |
| `ADMIN_NAME` | Admin user name for seeding | No | Admin User |
| `ADMIN_EMAIL` | Admin email for seeding | Yes | - |
| `ADMIN_PASSWORD` | Admin password for seeding | Yes | - |

## Common Issues & Solutions

### 1. MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running locally or update `MONGO_URI` with your MongoDB Atlas connection string.

### 2. JWT Secret Missing
```
Error: Missing required environment variables: JWT_SECRET
```
**Solution**: Add `JWT_SECRET` to your `.env` file.

### 3. Admin Already Exists
When running `npm run seed:admin` and admin exists:
```
ℹ️  Admin user already exists
```
**Solution**: This is normal. The script checks if admin exists before creating.

### 4. Cookie Not Being Set
**Solution**: 
- Check that `cookie-parser` middleware is configured
- In production, ensure HTTPS is enabled for secure cookies
- Verify CORS settings allow credentials

## Production Deployment

### 1. Environment Variables
- Set `NODE_ENV=production`
- Use a strong, random `JWT_SECRET` (at least 32 characters)
- Update `MONGO_URI` to production database
- Update `CLIENT_URL` to your frontend URL

### 2. Security Checklist
- ✅ Use HTTPS in production
- ✅ Set strong JWT secret
- ✅ Configure proper CORS origins
- ✅ Use environment variables for secrets
- ✅ Enable MongoDB authentication
- ✅ Use rate limiting (consider adding express-rate-limit)
- ✅ Add helmet.js for security headers
- ✅ Monitor and log errors properly

### 3. Deployment Platforms
- **Heroku**: Add `Procfile` with `web: node src/server.js`
- **AWS EC2**: Use PM2 for process management
- **DigitalOcean**: Use PM2 or Docker
- **Vercel/Netlify**: Not recommended for this backend (use Render, Railway instead)

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the server in production mode |
| `npm run dev` | Start the server with nodemon (auto-restart) |
| `npm run seed:admin` | Create admin user from .env credentials |

## License

ISC

## Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ using Node.js and Express.js**
