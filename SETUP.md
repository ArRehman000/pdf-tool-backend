# Quick Setup Guide

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment File
Create a `.env` file in the root directory with the following content:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/rbac-auth

# JWT Secret (change this to a random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_make_it_long_and_random

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# Admin Credentials (for seeding)
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123
```

### 3. Start MongoDB
Make sure MongoDB is running:

**Local MongoDB:**
```bash
mongod
```

**Or use MongoDB Atlas:**
- Create a free cluster at https://www.mongodb.com/cloud/atlas
- Get your connection string
- Update `MONGO_URI` in `.env`

### 4. Seed Admin User
```bash
npm run seed:admin
```

Expected output:
```
✅ Admin user created successfully!
─────────────────────────────────
📧 Email: admin@example.com
👤 Name: Admin User
🔑 Role: admin
🆔 ID: ...
─────────────────────────────────
```

### 5. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start
```

Expected output:
```
MongoDB Connected: localhost
─────────────────────────────────────────
✅ Server is running on port 5000
📍 Environment: development
🌐 API URL: http://localhost:5000
─────────────────────────────────────────
```

### 6. Test the API

#### Test Health Check
```bash
curl http://localhost:5000
```

#### Register a New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password@123"
  }'
```

#### Login as Regular User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password@123"
  }' \
  -c cookies.txt -v
```

#### Access User Dashboard (Protected Route)
```bash
curl -X GET http://localhost:5000/api/user/dashboard \
  -b cookies.txt
```

#### Login as Admin
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }' \
  -c admin-cookies.txt -v
```

#### Access Admin Dashboard (Admin Only)
```bash
curl -X GET http://localhost:5000/api/admin/dashboard \
  -b admin-cookies.txt
```

#### Get All Users (Admin Only)
```bash
curl -X GET http://localhost:5000/api/admin/users \
  -b admin-cookies.txt
```

## Troubleshooting

### Error: connect ECONNREFUSED
**Problem:** Cannot connect to MongoDB

**Solution:**
- Make sure MongoDB is running: `mongod`
- Or use MongoDB Atlas and update `MONGO_URI`

### Error: Missing required environment variables
**Problem:** .env file not found or missing variables

**Solution:**
- Create `.env` file in root directory
- Copy content from step 2 above
- Ensure `MONGO_URI` and `JWT_SECRET` are set

### Error: Admin user already exists
**Problem:** Admin was already seeded

**Solution:**
- This is normal, you can skip this step
- Or delete the user from database and run again

### Cookies not working with Postman/Insomnia
**Solution:**
- Enable "Automatically follow redirects"
- Enable "Send cookies"
- After login, cookies should be stored automatically

## Testing with Postman

1. **Import the following requests:**

**Register:**
- Method: POST
- URL: `http://localhost:5000/api/auth/register`
- Body (JSON):
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password@123"
}
```

**Login:**
- Method: POST
- URL: `http://localhost:5000/api/auth/login`
- Body (JSON):
```json
{
  "email": "john@example.com",
  "password": "Password@123"
}
```
- Make sure "Automatically follow redirects" is ON
- Cookies will be stored automatically

**User Dashboard:**
- Method: GET
- URL: `http://localhost:5000/api/user/dashboard`
- Cookies from login will be sent automatically

**Admin Dashboard:**
- Method: GET
- URL: `http://localhost:5000/api/admin/dashboard`
- Login as admin first, then access

## File Structure Reference

```
rbac-auth-system/
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── cookieOptions.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   └── adminRoutes.js
│   ├── seed/
│   │   └── adminSeed.js
│   ├── utils/
│   │   └── generateToken.js
│   ├── app.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
├── README.md
└── SETUP.md (this file)
```

## Next Steps

1. ✅ System is ready to use
2. Test all endpoints with Postman or cURL
3. Add more features as needed
4. Deploy to production when ready

## Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas or production database
- [ ] Enable HTTPS
- [ ] Update `CLIENT_URL` to production frontend
- [ ] Change admin password
- [ ] Add rate limiting
- [ ] Add helmet.js for security headers
- [ ] Set up proper logging
- [ ] Configure error monitoring

---

**Need help?** Check README.md for detailed documentation.
