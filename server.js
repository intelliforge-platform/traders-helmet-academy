const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "vjxnwqjlaxrvqctiphhb.supabase.co", "api.stripe.com"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: ['https://tradershelmetacademy.com', 'https://www.tradershelmetacademy.com'],
    credentials: true
}));

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use(express.static(path.join(__dirname), {
    maxAge: '1y',
    etag: true
}));

// API routes
app.use('/api/auth', require('./api/auth/routes'));
app.use('/api/users', require('./api/users/routes'));
app.use('/api/payments', require('./api/payments/routes'));

// Serve SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Traders Helmet Academy running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;