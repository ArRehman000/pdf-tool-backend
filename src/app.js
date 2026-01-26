const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const documentRoutes = require('./routes/documentRoutes');
const embeddingRoutes = require('./routes/embeddingRouted');

/**
 * Initialize Express application
 */
const app = express();

/**
 * Middleware Configuration
 */

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'https://pdocs.petalwebdev.com',
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser middleware - Increase limit for large OCR text
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser middleware
app.use(cookieParser());

/**
 * Routes
 */

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'RBAC Authentication API is running',
    version: '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/embeddings', embeddingRoutes);
/**
 * 404 Handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
