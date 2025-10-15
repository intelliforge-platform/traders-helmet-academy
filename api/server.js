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
        service: 'Traders Helmet Academy API',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Environment check endpoint
app.get('/api/env-check', (req, res) => {
    const envStatus = {
        NODE_ENV: !!process.env.NODE_ENV,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
        STRIPE_PUBLISHABLE_KEY: !!process.env.STRIPE_PUBLISHABLE_KEY,
        JWT_SECRET: !!process.env.JWT_SECRET
    };
    
    res.json({
        message: 'Environment Variables Status',
        status: envStatus,
        allConfigured: Object.values(envStatus).every(Boolean)
    });
});

// Graceful route loading with fallbacks
function loadRoutesSafely() {
    // Check for required environment variables
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
        console.warn('⚠️  Missing environment variables:', missingEnvVars.join(', '));
        console.warn('⚠️  Loading routes with fallback handlers');
        
        // Create fallback routes that return helpful error messages
        app.use('/api/auth', (req, res) => {
            res.status(503).json({
                error: 'Service temporarily unavailable',
                message: 'Authentication service is not properly configured',
                code: 'ENV_CONFIG_ERROR'
            });
        });
        
        app.use('/api/users', (req, res) => {
            res.status(503).json({
                error: 'Service temporarily unavailable',
                message: 'User service is not properly configured',
                code: 'ENV_CONFIG_ERROR'
            });
        });
        
        app.use('/api/payments', (req, res) => {
            res.status(503).json({
                error: 'Service temporarily unavailable',
                message: 'Payment service is not properly configured',
                code: 'ENV_CONFIG_ERROR'
            });
        });
        
        return;
    }
    
    // Try to load actual routes if environment is configured
    try {
        app.use('/api/auth', require('./auth/routes'));
        console.log('✅ Auth routes loaded');
    } catch (error) {
        console.error('❌ Failed to load auth routes:', error.message);
        app.use('/api/auth', (req, res) => {
            res.status(500).json({ error: 'Auth service temporarily unavailable' });
        });
    }

    try {
        app.use('/api/users', require('./users/routes'));
        console.log('✅ User routes loaded');
    } catch (error) {
        console.error('❌ Failed to load user routes:', error.message);
        app.use('/api/users', (req, res) => {
            res.status(500).json({ error: 'User service temporarily unavailable' });
        });
    }

    try {
        app.use('/api/payments', require('./payments/routes'));
        console.log('✅ Payment routes loaded');
    } catch (error) {
        console.error('❌ Failed to load payment routes:', error.message);
        app.use('/api/payments', (req, res) => {
            res.status(500).json({ error: 'Payment service temporarily unavailable' });
        });
    }
}

// Load routes
loadRoutesSafely();

// API 404 handler - Must come after all API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            '/api/health',
            '/api/env-check',
            '/api/auth/*',
            '/api/users/*',
            '/api/payments/*'
        ]
    });
});

// Root API endpoint
app.get('/api', (req, res) => {
    res.json({ 
        message: 'Traders Helmet Academy API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
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