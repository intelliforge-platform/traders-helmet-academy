const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for proper IP detection behind Vercel
app.set('trust proxy', 1);

// ================================
// SECURITY MIDDLEWARE
// ================================

// Enhanced helmet configuration for trading platform
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://www.gstatic.com", "https://js.stripe.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://vjxnwqjlaxrvqctiphhb.supabase.co", "https://api.stripe.com", "wss://vjxnwqjlaxrvqctiphhb.supabase.co"],
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "https:", "blob:"],
            workerSrc: ["'self'", "blob:"]
        }
    },
    crossOriginEmbedderPolicy: false, // Allow external resources for trading widgets
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS configuration for multiple environments
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://tradershelmetacademy.com',
            'https://www.tradershelmetacademy.com',
            'https://traders-helmet-academy.vercel.app',
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ];
        
        // Allow Vercel preview deployments
        if (!origin || allowedOrigins.includes(origin) || 
            (origin && origin.includes('vercel.app'))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ================================
// RATE LIMITING
// ================================

// General API rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Payment endpoint rate limiting
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 payment requests per hour
    message: {
        error: 'Too many payment attempts, please try again later.',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// ================================
// GENERAL MIDDLEWARE
// ================================

app.use(compression()); // Enable gzip compression
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing with size limits
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        // Store raw body for Stripe webhook verification if needed
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================================
// STATIC FILE SERVING
// ================================

// Serve static assets with proper caching
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
    maxAge: '1y', // Cache static assets for 1 year
    etag: true,
    lastModified: true,
    immutable: true
}));

// Serve built JavaScript files
app.use('/dist', express.static(path.join(__dirname, 'dist'), {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    immutable: true
}));

// Serve service worker with no cache
app.use('/sw.js', express.static(path.join(__dirname, 'sw.js'), {
    maxAge: 0,
    etag: false
}));

// ================================
// HEALTH CHECK
// ================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// ================================
// API ROUTES WITH RATE LIMITING
// ================================

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Authentication routes with stricter rate limiting
app.use('/api/auth', authLimiter, require('./api/auth/routes'));

// User management routes
app.use('/api/users', require('./api/users/routes'));

// Payment routes with payment-specific rate limiting
app.use('/api/payments', paymentLimiter, require('./api/payments/routes'));

// ================================
// SPA ROUTING FOR HTML PAGES
// ================================

// Specific HTML page routes
const htmlRoutes = [
    { path: '/', file: 'index.html' },
    { path: '/subscription', file: 'subscription.html' },
    { path: '/payment-processing', file: 'payment-processing.html' },
    { path: '/privacy-policy', file: 'privacy-policy.html' },
    { path: '/terms-of-service', file: 'terms-of-service.html' }
];

// Register specific HTML routes
htmlRoutes.forEach(route => {
    app.get(route.path, (req, res) => {
        res.sendFile(path.join(__dirname, route.file), (err) => {
            if (err) {
                console.error(`Error serving ${route.file}:`, err);
                res.status(404).sendFile(path.join(__dirname, 'index.html'));
            }
        });
    });
});

// Dynamic routing for pages directory
app.get('/pages/:category/:page', (req, res) => {
    const { category, page } = req.params;
    const filePath = path.join(__dirname, 'pages', category, `${page}.html`);
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Page not found: /pages/${category}/${page}.html`);
            res.status(404).sendFile(path.join(__dirname, 'index.html'));
        }
    });
});

// Admin routes
app.get('/admin/:page?', (req, res) => {
    const page = req.params.page || 'index';
    const filePath = path.join(__dirname, 'admin', `${page}.html`);
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Admin page not found: /admin/${page}.html`);
            res.status(404).sendFile(path.join(__dirname, 'admin/index.html'));
        }
    });
});

// ================================
// ERROR HANDLING
// ================================

// 404 handler for non-existent routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        // API 404s should return JSON
        res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            path: req.path,
            method: req.method
        });
    } else {
        // Non-API 404s should serve the main app (SPA fallback)
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    if (req.path.startsWith('/api/')) {
        res.status(err.status || 500).json({
            success: false,
            error: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : err.message,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(500).sendFile(path.join(__dirname, 'index.html'));
    }
});

// ================================
// SERVER STARTUP & SHUTDOWN
// ================================

const server = app.listen(PORT, () => {
    console.log(`Traders Helmet Academy server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Local URL: http://localhost:${PORT}`);
    console.log(`Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;