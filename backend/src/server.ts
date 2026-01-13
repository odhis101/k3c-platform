import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import connectDB from './config/database';
import env from './config/env';
import socketService from './services/socket.service';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS support
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
];

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize Socket.IO service
socketService.initialize(io);

// Make io accessible to routes
export { io };

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start listening
    const PORT = parseInt(env.PORT, 10);
    server.listen(PORT, () => {
      console.log('');
      console.log('🚀 K3C Smart Giving Platform - Backend API');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌍 Server: ${env.BACKEND_URL}`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
      console.log(`🔌 Socket.IO: Ready`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

// Start the server
startServer();
