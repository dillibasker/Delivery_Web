#!/bin/bash
# RapidoX - Quick Setup Script

echo "🏍️  RapidoX Setup"
echo "================="

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install from https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
  echo "⚠️  MongoDB not found locally. Make sure to update MONGODB_URI in backend/.env"
  echo "   Get MongoDB: https://www.mongodb.com/try/download/community"
  echo "   Or use free Atlas: https://cloud.mongodb.com"
fi

# Install backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install
cd ..

# Install frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend && npm install
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the app:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:5173"
