const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
let io;
try {
  io = socketIo(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        process.env.FRONTEND_URL
      ].filter(Boolean),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  app.set('io', io);
} catch (err) {
  console.warn('Socket.IO initialization skipped or failed:', err.message);
}

// Middleware - CORS
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow configured origins or any vercel.app preview/production deployment
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive fallback to prevent CORS blocks
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB connection with caching for serverless environments
let cachedConnection = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    try {
      await cachedConnection;
      if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
      }
    } catch (e) {
      cachedConnection = null;
    }
  }

  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shopsphere';
    if (!process.env.MONGODB_URI) {
      mongoURI = mongoURI.replace('mongodb://localhost:', 'mongodb://127.0.0.1:');
    }

    cachedConnection = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
    }).then((conn) => {
      console.log(`✓ MongoDB connected successfully`);
      return conn;
    }).catch((err) => {
      cachedConnection = null;
      console.error('✗ MongoDB connection error:', err.message);
      throw err;
    });

    return await cachedConnection;
  } catch (err) {
    cachedConnection = null;
    console.error('✗ Failed to connect to MongoDB:', err.message);
  }
};

// Ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (e) {
      // Continue and let individual routes handle DB readiness if needed
    }
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const analyticsRoutes = require('./routes/analytics');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);

// Export app for Vercel serverless function
module.exports = app;

// Start standalone HTTP/Socket server when executed directly (not when imported by Vercel serverless functions)
if (require.main === module) {
  connectDB();
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
