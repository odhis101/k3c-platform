# K3C Smart Giving Platform - Backend API

Backend API for the K3C Smart Giving Platform, a QR-based gamified church giving system.

## Tech Stack

- **Node.js** + **Express.js** - REST API
- **TypeScript** - Type safety
- **MongoDB** + **Mongoose** - Database
- **Socket.IO** - Real-time updates
- **JWT** - Authentication
- **MPESA Daraja API** - Mobile money payments
- **Flutterwave** - Card payments
- **Cloudinary** - Image storage

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── env.ts       # Environment variables
│   │   └── database.ts  # MongoDB connection
│   ├── models/          # Mongoose models
│   ├── controllers/     # Route controllers
│   ├── services/        # Business logic
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── sockets/         # Socket.IO handlers
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   ├── app.ts           # Express app configuration
│   └── server.ts        # Entry point
├── scripts/             # Utility scripts
└── dist/                # Compiled JavaScript (gitignored)
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (or local MongoDB)
- MPESA Daraja API credentials
- Flutterwave account (optional for card payments)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your credentials
```

### Development

```bash
# Run in development mode with hot reload
npm run dev
```

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret (min 32 characters)
- `MPESA_CONSUMER_KEY` - MPESA API credentials
- `FLUTTERWAVE_SECRET_KEY` - Flutterwave API credentials

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication (Coming soon)
- `POST /api/auth/register` - Register donor
- `POST /api/auth/login` - Login donor

### Campaigns (Coming soon)
- `GET /api/campaigns` - List campaigns
- `GET /api/campaigns/:id` - Get campaign details

### Payments (Coming soon)
- `POST /api/payments/mpesa/initiate` - Initiate MPESA payment
- `POST /api/payments/mpesa/callback` - MPESA callback webhook

## License

ISC
