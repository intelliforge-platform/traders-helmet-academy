// api/payments/routes.js
const express = require('express');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Pricing configuration
const PRICING = {
    gold: { amount: 30000, currency: 'usd', months: 2 }, // $300.00
    platinum: { amount: 60000, currency: 'usd', months: 3 }, // $600.00
    diamond: { amount: 130000, currency: 'usd', months: 6 } // $1300.00
};

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

// Middleware to require admin access
function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
            error: 'Admin access required'
        });
    }
    next();
}

// POST /api/payments/create-payment-intent - Create Stripe payment intent
router.post('/create-payment-intent', verifyFirebaseToken, async (req, res) => {
    try {
        const { tier } = req.body;
        
        if (!tier || !PRICING[tier]) {
            return res.status(400).json({
                error: 'Invalid subscription tier'
            });
        }
        
        const { amount, currency } = PRICING[tier];
        
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            metadata: {
                userId: req.user.uid,
                email: req.user.email,
                tier: tier
            }
        });
        
        // Create payment record in database
        const { data: payment, error } = await supabase
            .from('payments')
            .insert([
                {
                    user_id: req.user.uid,
                    amount: amount / 100, // Convert cents to dollars
                    currency: currency.toUpperCase(),
                    payment_method: 'card',
                    payment_status: 'pending',
                    stripe_payment_intent_id: paymentIntent.id,
                    tier: tier,
                    payment_details: {
                        stripe_payment_intent: paymentIntent.id
                    },
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentId: payment.id
        });
        
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({
            error: 'Failed to create payment intent'
        });
    }
});

// POST /api/payments/confirm-payment - Confirm successful payment
router.post('/confirm-payment', verifyFirebaseToken, async (req, res) => {
    try {
        const { paymentIntentId, paymentId } = req.body;
        
        if (!paymentIntentId) {
            return res.status(400).json({
                error: 'Payment intent ID is required'
            });
        }
        
        // Verify payment with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                error: 'Payment not completed'
            });
        }
        
        // Get payment record
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('stripe_payment_intent_id', paymentIntentId)
            .single();
        
        if (paymentError || !payment) {
            return res.status(404).json({
                error: 'Payment record not found'
            });
        }
        
        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        const months = PRICING[payment.tier].months;
        endDate.setMonth(endDate.getMonth() + months);
        
        // Update payment status
        const { error: updatePaymentError } = await supabase
            .from('payments')
            .update({
                payment_status: 'completed',
                processed_at: new Date().toISOString()
            })
            .eq('id', payment.id);
        
        if (updatePaymentError) {
            throw updatePaymentError;
        }
        
        // Update user subscription
        const { error: updateUserError } = await supabase
            .from('user_profiles')
            .update({
                subscription_tier: payment.tier,
                subscription_status: 'active',
                subscription_start_date: startDate.toISOString(),
                subscription_end_date: endDate.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.uid);
        
        if (updateUserError) {
            throw updateUserError;
        }
        
        // Update Firebase custom claims
        await admin.auth().setCustomUserClaims(req.user.uid, {
            role: 'user',
            isAdmin: false,
            subscriptionTier: payment.tier,
            subscriptionStatus: 'active'
        });
        
        // Log payment activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: req.user.uid,
                    activity_type: 'payment_completed',
                    activity_description: `Payment completed for ${payment.tier} subscription`,
                    metadata: {
                        payment_id: payment.id,
                        stripe_payment_intent: paymentIntentId,
                        amount: payment.amount,
                        tier: payment.tier
                    },
                    created_at: new Date().toISOString()
                }
            ]);
        
        // Determine dashboard URL
        let dashboardUrl = '/pages/dashboard/index.html';
        switch (payment.tier) {
            case 'gold':
                dashboardUrl = '/pages/dashboard/gold.html';
                break;
            case 'platinum':
                dashboardUrl = '/pages/dashboard/platinum.html';
                break;
            case 'diamond':
                dashboardUrl = '/pages/dashboard/diamond.html';
                break;
        }
        
        res.json({
            success: true,
            message: 'Payment confirmed and subscription activated',
            redirectUrl: dashboardUrl,
            subscription: {
                tier: payment.tier,
                status: 'active',
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            }
        });
        
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({
            error: 'Failed to confirm payment'
        });
    }
});

// POST /api/payments/bank-transfer - Record bank transfer payment
router.post('/bank-transfer', verifyFirebaseToken, async (req, res) => {
    try {
        const { tier, transactionReference, bankDetails } = req.body;
        
        if (!tier || !PRICING[tier]) {
            return res.status(400).json({
                error: 'Invalid subscription tier'
            });
        }
        
        if (!transactionReference) {
            return res.status(400).json({
                error: 'Transaction reference is required'
            });
        }
        
        const { amount } = PRICING[tier];
        
        // Create payment record
        const { data: payment, error } = await supabase
            .from('payments')
            .insert([
                {
                    user_id: req.user.uid,
                    amount: amount / 100, // Convert cents to dollars
                    currency: 'USD',
                    payment_method: 'bank_transfer',
                    payment_status: 'pending',
                    tier: tier,
                    transaction_reference: transactionReference,
                    payment_details: {
                        bank_details: bankDetails,
                        transaction_reference: transactionReference
                    },
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        // Update user status to pending
        await supabase
            .from('user_profiles')
            .update({
                subscription_status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.uid);
        
        // Log activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: req.user.uid,
                    activity_type: 'bank_transfer_submitted',
                    activity_description: `Bank transfer payment submitted for ${tier} subscription`,
                    metadata: {
                        payment_id: payment.id,
                        transaction_reference: transactionReference,
                        amount: payment.amount,
                        tier: tier
                    },
                    created_at: new Date().toISOString()
                }
            ]);
        
        res.json({
            success: true,
            message: 'Bank transfer payment recorded. Your account will be activated after verification.',
            paymentId: payment.id,
            redirectUrl: '/pages/profile/index.html'
        });
        
    } catch (error) {
        console.error('Bank transfer error:', error);
        res.status(500).json({
            error: 'Failed to record bank transfer'
        });
    }
});

// POST /api/payments/crypto - Record cryptocurrency payment
router.post('/crypto', verifyFirebaseToken, async (req, res) => {
    try {
        const { tier, cryptoDetails, transactionHash } = req.body;
        
        if (!tier || !PRICING[tier]) {
            return res.status(400).json({
                error: 'Invalid subscription tier'
            });
        }
        
        if (!transactionHash) {
            return res.status(400).json({
                error: 'Transaction hash is required'
            });
        }
        
        const { amount } = PRICING[tier];
        
        // Create payment record
        const { data: payment, error } = await supabase
            .from('payments')
            .insert([
                {
                    user_id: req.user.uid,
                    amount: amount / 100, // Convert cents to dollars
                    currency: 'USD',
                    payment_method: 'cryptocurrency',
                    payment_status: 'pending',
                    tier: tier,
                    transaction_reference: transactionHash,
                    payment_details: {
                        crypto_details: cryptoDetails,
                        transaction_hash: transactionHash
                    },
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        // Update user status to pending
        await supabase
            .from('user_profiles')
            .update({
                subscription_status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.uid);
        
        // Log activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: req.user.uid,
                    activity_type: 'crypto_payment_submitted',
                    activity_description: `Cryptocurrency payment submitted for ${tier} subscription`,
                    metadata: {
                        payment_id: payment.id,
                        transaction_hash: transactionHash,
                        amount: payment.amount,
                        tier: tier,
                        crypto_details: cryptoDetails
                    },
                    created_at: new Date().toISOString()
                }
            ]);
        
        res.json({
            success: true,
            message: 'Cryptocurrency payment recorded. Your account will be activated after verification.',
            paymentId: payment.id,
            redirectUrl: '/pages/profile/index.html'
        });
        
    } catch (error) {
        console.error('Crypto payment error:', error);
        res.status(500).json({
            error: 'Failed to record cryptocurrency payment'
        });
    }
});

// GET /api/payments - Get all payments (admin only)
router.get('/', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || '';
        const method = req.query.method || '';
        
        let query = supabase
            .from('payments')
            .select(`
                *,
                user_profiles(email, full_name)
            `, { count: 'exact' })
            .order('created_at', { ascending: false });
        
        if (status) {
            query = query.eq('payment_status', status);
        }
        
        if (method) {
            query = query.eq('payment_method', method);
        }
        
        const { data: payments, error, count } = await query
            .range(offset, offset + limit - 1);
        
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            payments,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
        
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({
            error: 'Failed to fetch payments'
        });
    }
});

// GET /api/payments/stats - Get payment statistics (admin only)
router.get('/stats', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        // Total revenue
        const { data: completedPayments } = await supabase
            .from('payments')
            .select('amount')
            .eq('payment_status', 'completed');
        
        const totalRevenue = completedPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Pending payments
        const { count: pendingCount } = await supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('payment_status', 'pending');
        
        // Revenue by tier
        const { data: tierRevenue } = await supabase
            .from('payments')
            .select('tier, amount')
            .eq('payment_status', 'completed');
        
        const revenueByTier = tierRevenue.reduce((acc, payment) => {
            acc[payment.tier] = (acc[payment.tier] || 0) + payment.amount;
            return acc;
        }, {});
        
        // Monthly revenue (last 12 months)
        const monthlyRevenue = [];
        for (let i = 11; i >= 0; i--) {
            const month = new Date();
            month.setMonth(month.getMonth() - i);
            const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
            const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
            
            const { data: monthPayments } = await supabase
                .from('payments')
                .select('amount')
                .eq('payment_status', 'completed')
                .gte('processed_at', monthStart.toISOString())
                .lte('processed_at', monthEnd.toISOString());
            
            const monthTotal = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
            
            monthlyRevenue.push({
                month: month.toISOString().slice(0, 7), // YYYY-MM format
                revenue: monthTotal
            });
        }
        
        res.json({
            success: true,
            stats: {
                totalRevenue,
                pendingPayments: pendingCount,
                revenueByTier,
                monthlyRevenue
            }
        });
        
    } catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch payment statistics'
        });
    }
});

// GET /api/payments/user/:id - Get user's payments (admin only)
router.get('/user/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: payments, error } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', id)
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            payments
        });
        
    } catch (error) {
        console.error('Get user payments error:', error);
        res.status(500).json({
            error: 'Failed to fetch user payments'
        });
    }
});

// POST /api/payments/:id/approve - Approve manual payment (admin only)
router.post('/:id/approve', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        
        // Get payment details
        const { data: payment, error: getError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', id)
            .single();
        
        if (getError || !payment) {
            return res.status(404).json({
                error: 'Payment not found'
            });
        }
        
        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        const months = PRICING[payment.tier].months;
        endDate.setMonth(endDate.getMonth() + months);
        
        // Update payment status
        const { error: updatePaymentError } = await supabase
            .from('payments')
            .update({
                payment_status: 'completed',
                processed_at: new Date().toISOString(),
                processed_by: req.user.uid,
                notes: notes
            })
            .eq('id', id);
        
        if (updatePaymentError) {
            throw updatePaymentError;
        }
        
        // Update user subscription
        const { error: updateUserError } = await supabase
            .from('user_profiles')
            .update({
                subscription_tier: payment.tier,
                subscription_status: 'active',
                subscription_start_date: startDate.toISOString(),
                subscription_end_date: endDate.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', payment.user_id);
        
        if (updateUserError) {
            throw updateUserError;
        }
        
        // Update Firebase custom claims
        await admin.auth().setCustomUserClaims(payment.user_id, {
            role: 'user',
            isAdmin: false,
            subscriptionTier: payment.tier,
            subscriptionStatus: 'active'
        });
        
        // Log activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: payment.user_id,
                    activity_type: 'payment_approved',
                    activity_description: `Payment approved by admin for ${payment.tier} subscription`,
                    metadata: {
                        payment_id: id,
                        approved_by: req.user.uid,
                        tier: payment.tier,
                        notes: notes
                    },
                    created_at: new Date().toISOString()
                }
            ]);
        
        res.json({
            success: true,
            message: 'Payment approved and user activated'
        });
        
    } catch (error) {
        console.error('Approve payment error:', error);
        res.status(500).json({
            error: 'Failed to approve payment'
        });
    }
});

// POST /api/payments/:id/reject - Reject manual payment (admin only)
router.post('/:id/reject', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                error: 'Rejection reason is required'
            });
        }
        
        // Get payment details
        const { data: payment, error: getError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', id)
            .single();
        
        if (getError || !payment) {
            return res.status(404).json({
                error: 'Payment not found'
            });
        }
        
        // Update payment status
        const { error: updateError } = await supabase
            .from('payments')
            .update({
                payment_status: 'rejected',
                processed_at: new Date().toISOString(),
                processed_by: req.user.uid,
                notes: reason
            })
            .eq('id', id);
        
        if (updateError) {
            throw updateError;
        }
        
        // Reset user status to inactive
        await supabase
            .from('user_profiles')
            .update({
                subscription_status: 'inactive',
                updated_at: new Date().toISOString()
            })
            .eq('id', payment.user_id);
        
        // Log activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: payment.user_id,
                    activity_type: 'payment_rejected',
                    activity_description: `Payment rejected by admin. Reason: ${reason}`,
                    metadata: {
                        payment_id: id,
                        rejected_by: req.user.uid,
                        reason: reason
                    },
                    created_at: new Date().toISOString()
                }
            ]);
        
        res.json({
            success: true,
            message: 'Payment rejected'
        });
        
    } catch (error) {
        console.error('Reject payment error:', error);
        res.status(500).json({
            error: 'Failed to reject payment'
        });
    }
});

module.exports = router;