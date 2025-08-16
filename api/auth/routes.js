// api/auth/routes.js
const express = require('express');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware to verify Firebase token
async function verifyFirebaseToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'No valid authorization token provided'
            });
        }
        
        const token = authHeader.substring(7);
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Get user profile from Supabase
        const { data: userProfile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', decodedToken.uid)
            .single();
        
        if (error || !userProfile) {
            return res.status(404).json({
                error: 'User profile not found'
            });
        }
        
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: userProfile.role,
            isAdmin: userProfile.is_admin,
            subscriptionTier: userProfile.subscription_tier,
            profile: userProfile
        };
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            error: 'Invalid or expired token'
        });
    }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password, firebaseToken } = req.body;
        
        if (!firebaseToken) {
            return res.status(400).json({
                error: 'Firebase token required'
            });
        }
        
        // Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
        
        // Get user profile from Supabase
        const { data: userProfile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', decodedToken.uid)
            .single();
        
        if (error || !userProfile) {
            return res.status(404).json({
                error: 'User profile not found'
            });
        }
        
        // Check if user is active
        if (userProfile.subscription_status === 'inactive' && !userProfile.is_admin) {
            return res.status(403).json({
                error: 'Account inactive. Please subscribe to continue.',
                redirect: '/subscription.html'
            });
        }
        
        // Update last login
        await supabase
            .from('user_profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', decodedToken.uid);
        
        // Log login activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: decodedToken.uid,
                    activity_type: 'login',
                    activity_description: 'User logged in',
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent'),
                    created_at: new Date().toISOString()
                }
            ]);
        
        // Determine redirect URL based on user type and subscription
        let redirectUrl = '/pages/dashboard/index.html';
        
        if (userProfile.is_admin) {
            redirectUrl = '/pages/admin/dashboard.html';
        } else if (userProfile.subscription_status === 'active') {
            switch (userProfile.subscription_tier) {
                case 'gold':
                    redirectUrl = '/pages/dashboard/gold.html';
                    break;
                case 'platinum':
                    redirectUrl = '/pages/dashboard/platinum.html';
                    break;
                case 'diamond':
                    redirectUrl = '/pages/dashboard/diamond.html';
                    break;
                default:
                    redirectUrl = '/pages/dashboard/index.html';
            }
        } else {
            redirectUrl = '/subscription.html';
        }
        
        res.json({
            success: true,
            user: {
                uid: userProfile.id,
                email: userProfile.email,
                name: userProfile.full_name,
                role: userProfile.role,
                isAdmin: userProfile.is_admin,
                subscriptionTier: userProfile.subscription_tier,
                subscriptionStatus: userProfile.subscription_status
            },
            redirectUrl: redirectUrl
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: error.message
        });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, firebaseToken } = req.body;
        
        if (!firebaseToken) {
            return res.status(400).json({
                error: 'Firebase token required'
            });
        }
        
        // Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
        
        // Check if user already exists in Supabase
        const { data: existingUser } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', decodedToken.uid)
            .single();
        
        if (existingUser) {
            return res.status(409).json({
                error: 'User already exists'
            });
        }
        
        // Create user profile in Supabase
        const { data: newUser, error } = await supabase
            .from('user_profiles')
            .insert([
                {
                    id: decodedToken.uid,
                    email: decodedToken.email,
                    full_name: fullName,
                    role: 'user',
                    subscription_tier: 'free',
                    subscription_status: 'inactive',
                    email_verified: decodedToken.email_verified,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        // Log registration activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: decodedToken.uid,
                    activity_type: 'registration',
                    activity_description: 'User registered',
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent'),
                    created_at: new Date().toISOString()
                }
            ]);
        
        res.json({
            success: true,
            user: {
                uid: newUser.id,
                email: newUser.email,
                name: newUser.full_name,
                role: newUser.role,
                subscriptionTier: newUser.subscription_tier,
                subscriptionStatus: newUser.subscription_status
            },
            message: 'Registration successful',
            redirectUrl: '/pages/auth/verify-email.html'
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            message: error.message
        });
    }
});

// POST /api/auth/verify-token
router.post('/verify-token', verifyFirebaseToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                uid: req.user.uid,
                email: req.user.email,
                role: req.user.role,
                isAdmin: req.user.isAdmin,
                subscriptionTier: req.user.subscriptionTier,
                profile: req.user.profile
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            error: 'Token verification failed'
        });
    }
});

// POST /api/auth/logout
router.post('/logout', verifyFirebaseToken, async (req, res) => {
    try {
        // Log logout activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: req.user.uid,
                    activity_type: 'logout',
                    activity_description: 'User logged out',
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent'),
                    created_at: new Date().toISOString()
                }
            ]);
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed'
        });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Generate password reset link using Firebase Admin
        const resetLink = await admin.auth().generatePasswordResetLink(email);
        
        // Log password reset request
        const { data: user } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', email)
            .single();
        
        if (user) {
            await supabase
                .from('user_activity_log')
                .insert([
                    {
                        user_id: user.id,
                        activity_type: 'password_reset_request',
                        activity_description: 'Password reset requested',
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent'),
                        created_at: new Date().toISOString()
                    }
                ]);
        }
        
        // In production, you would send this via email
        console.log('Password reset link:', resetLink);
        
        res.json({
            success: true,
            message: 'Password reset link sent to your email'
        });
        
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            error: 'Password reset failed'
        });
    }
});

// GET /api/auth/profile
router.get('/profile', verifyFirebaseToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user.profile
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch profile'
        });
    }
});

// PUT /api/auth/profile
router.put('/profile', verifyFirebaseToken, async (req, res) => {
    try {
        const { full_name, phone, country } = req.body;
        
        const { data: updatedUser, error } = await supabase
            .from('user_profiles')
            .update({
                full_name,
                phone,
                country,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.uid)
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        // Log profile update
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: req.user.uid,
                    activity_type: 'profile_update',
                    activity_description: 'Profile updated',
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent'),
                    created_at: new Date().toISOString()
                }
            ]);
        
        res.json({
            success: true,
            user: updatedUser,
            message: 'Profile updated successfully'
        });
        
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            error: 'Profile update failed'
        });
    }
});

// GET /api/auth/check-admin
router.get('/check-admin', verifyFirebaseToken, async (req, res) => {
    try {
        res.json({
            success: true,
            isAdmin: req.user.isAdmin,
            role: req.user.role
        });
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({
            error: 'Admin check failed'
        });
    }
});

module.exports = router;