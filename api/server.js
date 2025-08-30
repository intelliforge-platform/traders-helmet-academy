const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Security middleware with updated CSP for trading platform
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "js.stripe.com"],
            fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "*.stripe.com"],
            connectSrc: ["'self'", "vjxnwqjlaxrvqctiphhb.supabase.co", "api.stripe.com", "*.vercel.app"],
            frameSrc: ["js.stripe.com", "hooks.stripe.com"]
        }
    }
}));

// CORS configuration - Updated for Vercel deployment
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'https://tradershelmetacademy.com',
            'https://www.tradershelmetacademy.com',
            'https://traders-helmet-academy.vercel.app',
            'https://traders-helmet-academy-git-main-intelliforges-projects.vercel.app'
        ];
        
        // Allow Vercel preview URLs
        if (origin.includes('traders-helmet-academy') && origin.includes('vercel.app')) {
            return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving - Fixed paths for Vercel
app.use('/assets', express.static(path.join(__dirname, '../assets'), {
    maxAge: '1d',
    etag: true
}));

app.use('/dist', express.static(path.join(__dirname, '../dist'), {
    maxAge: '1d',
    etag: true
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Traders Helmet Academy API'
    });
});

// API routes - Fixed relative paths
try {
    app.use('/api/auth', require('./auth/routes'));
    console.log('✅ Auth routes loaded');
} catch (error) {
    console.error('❌ Failed to load auth routes:', error.message);
}

try {
    app.use('/api/users', require('./users/routes'));
    console.log('✅ User routes loaded');
} catch (error) {
    console.error('❌ Failed to load user routes:', error.message);
}

try {
    app.use('/api/payment', require('./payment/routes'));
    console.log('✅ Payment routes loaded');
} catch (error) {
    console.error('❌ Failed to load payment routes:', error.message);
}

// API 404 handler - Must come after all API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Root endpoint for testing
app.get('/api', (req, res) => {
    res.json({ 
        message: 'Traders Helmet Academy API',
        version: '1.0.0',
        status: 'running'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    // Handle CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ 
            error: 'CORS policy violation',
            message: 'Origin not allowed'
        });
    }
    
    // Handle JSON parsing errors
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ 
            error: 'Invalid JSON payload'
        });
    }
    
    // Generic error response
    res.status(err.status || 500).json({ 
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Export for Vercel serverless function
module.exports = app;