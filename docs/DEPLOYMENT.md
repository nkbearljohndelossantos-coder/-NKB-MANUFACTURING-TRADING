# 🚀 Hostinger & GitHub Production Deployment Guide

**Target Application:** B2B Client Order, Delivery, Variance, Billing & Payment Management System  
**Target Environment:** Hostinger Cloud / VPS / Shared cPanel Node.js Selector  
**Stack:** Node.js 20+ / Express.js • MySQL 8.0+ / MariaDB 10.5+ • React 18 / Vite / Tailwind CSS  

---

## 1. Prerequisites on Hostinger

1. **MySQL Database**:
   - Open Hostinger hPanel -> **Databases** -> **MySQL Databases**.
   - Create Database: e.g. `u335953510_clientpo_db`
   - Create User: e.g. `u335953510_clientpo_user`
   - Password: `<STRONG_SECURE_PASSWORD>`
2. **Node.js Setup**:
   - Open **Node.js Selector** in hPanel.
   - Node.js Version: **20.x** (or 18.x LTS).
   - Application Mode: **Production**.
   - Application Root: `public_html/client-po` (or subdomain folder).
   - Application Startup File: `backend/src/server.js`.

---

## 2. GitHub Deployment Workflow

```bash
git init
git add .
git commit -m "feat: complete production-ready B2B client order, variance and billing engine"
git branch -M main
git remote add origin https://github.com/nkbearljohndelossantos-coder/Client-PO.git
git push -u origin main
```

---

## 3. Hostinger Server-Side Setup

### Step 1: Connect via SSH
```bash
ssh -p 65002 u335953510@your-hostinger-ip
cd public_html/client-po
```

### Step 2: Clone or Pull Latest Code
```bash
git clone https://github.com/nkbearljohndelossantos-coder/Client-PO.git .
```

### Step 3: Configure Production Environment (`.env`)
Create `backend/.env` on Hostinger:
```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://clientpo.nkbmanufacturing.com

# JWT Authentication
JWT_SECRET=super_secret_production_key_min_32_characters_long_nkb_2026
JWT_EXPIRES_IN=24h

# MySQL Connection (Hostinger)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=u335953510_clientpo_user
DB_PASSWORD=YourSecureHostingerDbPassword
DB_NAME=u335953510_clientpo_db
```

> [!IMPORTANT]
> In production mode (`NODE_ENV=production`), the application strictly verifies MySQL connectivity. If MySQL is unreachable, it fails fast and will **NEVER** silently fallback to SQLite.

### Step 4: Install Dependencies & Run Migrations
```bash
# Backend setup & migrations
cd backend
npm install --production
npm run migrate
npm run seed

# Frontend build
cd ../frontend
npm install
npm run build
```

### Step 5: Start & Restart with PM2 / Passenger
```bash
# In backend directory
pm2 start src/server.js --name "client-po-api"
pm2 save
pm2 startup
```

---

## 4. Zero-Downtime Update Procedure

When pushing updates to GitHub:
```bash
cd public_html/client-po
git pull origin main
cd backend && npm install --production && npm run migrate
cd ../frontend && npm install && npm run build
pm2 restart client-po-api
```
