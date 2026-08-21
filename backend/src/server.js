const path = require('path');
const fs = require('fs');

// Load environment variables from backend/.env or root .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productionRoutes = require('./routes/productionRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const varianceRoutes = require('./routes/varianceRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();
const PORT = process.env.PORT || 5050;

// Security & Parsing Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts/styles for PDF preview rendering
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// REST API Routers
app.use('/api/auth', authRoutes);
app.use('/api/b2b/clients', clientRoutes);
app.use('/api/b2b/products', productRoutes);
app.use('/api/b2b/orders', orderRoutes);
app.use('/api/b2b/production', productionRoutes);
app.use('/api/b2b/deliveries', deliveryRoutes);
app.use('/api/b2b/variances', varianceRoutes);
app.use('/api/b2b/invoices', invoiceRoutes);
app.use('/api/b2b/payments', paymentRoutes);
app.use('/api/b2b/reports', reportRoutes);
app.use('/api/b2b/audit-logs', auditRoutes);

// Serve Frontend in Production
const possibleDistPaths = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../..')
];
const frontendDistPath = possibleDistPaths.find(p => fs.existsSync(path.join(p, 'index.html')));
if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Centralized Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[SERVER] B2B Order & Billing Engine listening on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
  });
}

module.exports = app;
