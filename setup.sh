#!/bin/bash
# Quick start script — runs both backend and frontend

echo "🔒 Starting VaultShare..."

# Setup backend env if not present
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "✅ Created backend/.env from example"
fi

# Install backend deps
echo "📦 Installing backend dependencies..."
cd backend && npm install

# Install frontend deps
echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the app, open TWO terminals:"
echo ""
echo "  Terminal 1 (backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 (frontend):"
echo "    cd frontend && npm start"
echo ""
echo "Then open: http://localhost:3000"
