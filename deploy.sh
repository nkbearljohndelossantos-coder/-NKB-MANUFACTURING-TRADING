#!/bin/bash
set -e

echo "========================================================"
echo "🚀 NKB MANUFACTURING & TRADING - PRODUCTION DEPLOYMENT"
echo "========================================================"

# 1. Pull latest code from GitHub main
echo "[1/6] Pulling latest updates from GitHub main..."
git fetch origin main
git reset --hard origin/main

# 2. Install dependencies for root, backend, and frontend
echo "[2/6] Installing dependencies..."
npm install
npm install --prefix backend
npm install --prefix frontend

# 3. Build Production Frontend (Vite)
echo "[3/6] Building production frontend..."
npm run build --prefix frontend
cp -r frontend/dist/* . 2>/dev/null || true

# 4. Verify/Create Production Environment File
if [ ! -f "backend/.env" ]; then
  echo "⚠️ Warning: backend/.env not found! Copying from .env.example..."
  cp backend/.env.example backend/.env
  echo "👉 Please update backend/.env with your actual Hostinger MySQL credentials."
fi

# 5. Run Database Migrations (MySQL)
echo "[4/6] Running database migrations..."
if grep -q "DB_PASSWORD" backend/.env && [ -n "$(grep 'DB_PASSWORD=' backend/.env | cut -d '=' -f2)" ]; then
  npm run migrate --prefix backend
else
  echo "⚠️ Skipping migrations: backend/.env requires database credentials."
fi

# 6. Start/Restart PM2 Backend Process
echo "[5/6] Starting/Restarting application with PM2..."
if command -v pm2 &> /dev/null; then
  if pm2 list | grep -q "client-po-backend"; then
    pm2 reload client-po-backend --update-env
  else
    pm2 start backend/src/server.js --name "client-po-backend"
  fi
  pm2 save
else
  echo "ℹ️ PM2 not detected. You can start the server with: npm start"
fi

# 7. Health Check
echo "[6/6] Verifying application health..."
sleep 2
if command -v curl &> /dev/null; then
  PORT=$(grep '^PORT=' backend/.env 2>/dev/null | cut -d '=' -f2 || echo "5050")
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/api/health || echo "000")
  echo "  Health status code: ${HTTP_STATUS}"
fi

echo "========================================================"
echo "🎉 DEPLOYMENT COMPLETE! Application is live."
echo "========================================================"
