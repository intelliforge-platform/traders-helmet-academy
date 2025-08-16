// api/users/routes.js
const express = require('express');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
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

// Middleware to require admin access
function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
            error: 'Admin access required'
        });
    }
    next();
}

// GET /api/users - Get all users (admin only)
router.get('/', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const tier = req.query.tier || '';
        
        let query = supabase
            .from('user_profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        
        // Apply filters
        if (search) {
            query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
        }
        
        if (status) {
            query = query.eq('subscription_status', status);
        }
        
        if (tier) {
            query = query.eq('subscription_tier', tier);
        }
        
        const { data: users, error, count } = await query
            .range(offset, offset + limit - 1);
        
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: 'Failed to fetch users'
        });
    }
});

// GET /api/users/pending - Get pending activations (admin only)
router.get('/pending', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { data: pendingUsers, error } = await supabase
            .from('user_profiles')
            .select(`
                *,
                payments!inner(*)
            `)
            .eq('subscription_status', 'pending')
            .in('payments.payment_method', ['bank_transfer', 'cryptocurrency'])
            .eq('payments.payment_status', 'pending');
        
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            pendingUsers
        });
        
    } catch (error) {
        console.error('Get pending users error:', error);
        res.status(500).json({
            error: 'Failed to fetch pending users'
        });
    }
});

// GET /api/users/stats - Get user statistics (admin only)
router.get('/stats', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        // Get total users
        const { count: totalUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
        
        // Get active users
        const { count: activeUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'active');
        
        // Get pending users
        const { count: pendingUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'pending');
        
        // Get users by tier
        const { data: tierStats } = await supabase
            .from('user_profiles')
            .select('subscription_tier')
            .eq('subscription_status', 'active');
        
        const tierCounts = tierStats.reduce((acc, user) => {
            acc[user.subscription_tier] = (acc[user.subscription_tier] || 0) + 1;
            return acc;
        }, {});
        
        // Get recent registrations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: recentRegistrations } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());
        
        res.json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                pendingUsers,
                inactiveUsers: totalUsers - activeUsers - pendingUsers,
                recentRegistrations,
                tierBreakdown: {
                    gold: tierCounts.gold || 0,
                    platinum: tierCounts.platinum || 0,
                    diamond: tierCounts.diamond || 0,
                    free: tierCounts.free || 0
                }
            }
        });
        
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch user statistics'
        });
    }
});

// GET /api/users/:id - Get specific user (admin only)
router.get('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: user, error } = await supabase
            .from('user_profiles')
            .select(`
                *,
                payments(*),
                user_activity_log(*)
            `)
            .eq('id', id)
            .single();
        
        if (error) {
            throw error;
        }
        
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Failed to fetch user'
        });
    }
});

// POST /api/users/:id/activate - Manually activate user (admin only)
router.post('/:id/activate', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { tier, paymentId, notes } = req.body;
        
        if (!tier) {
            return res.status(400).json({
                error: 'Subscription tier is required'
            });
        }
        
        // Calculate subscription end date
        const startDate = new Date();
        const endDate = new Date();
        const months = tier === 'gold' ? 2 : tier === 'platinum' ? 3 : 6;
        endDate.setMonth(endDate.getMonth() + months);
        
        // Update user subscription
        const { error: userError } = await supabase
            .from('user_profiles')
            .update({
                subscription_tier: tier,
                subscription_status: 'active',
                subscription_start_date: startDate.toISOString(),
                subscription_end_date: endDate.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (userError) {
            throw userError;
        }
        
        // Update payment status if paymentId provided
        if (paymentId) {
            const { error: paymentError } = await supabase
                .from('payments')
                .update({
                    payment_status: 'completed',
                    processed_at: new Date().toISOString(),
                    processed_by: req.user.uid,
                    notes: notes || 'Manually activated by admin'
                })
                .eq('id', paymentId);
            
            if (paymentError) {
                console.error('Payment update error:', paymentError);
            }
        }
        
        // Update Firebase custom claims
        await admin.auth().setCustomUserClaims(id, {
            role: 'user',
            isAdmin: false,
            subscriptionTier: tier,
            subscriptionStatus: 'active'
        });
        
        // Log activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: id,
                    activity_type: 'manual_activation',
                    activity_description: `User manually activated by admin for ${tier} tier`,
                    metadata: { 
                        activated_by: req.user.uid,
                        payment_id: paymentId,
                        tier: tier,
                        notes: notes
                    },
                    created_at: new Date().toISOString()
                }
            ]);
        
        res.json({
            success: true,
            message: 'User activated successfully'
        });
        
    } catch (error) {
        console.error('User activation error:', error);
        res.status(500).json({
            error: 'Failed to activate user'
        });
    }
});

// POST /api/users/:id/deactivate - Deactivate user (admin only)
router.post('/:id/deactivate', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                error: 'Deactivation reason is required'
            });
        }
        
        const { error } = await supabase
            .from('user_profiles')
            .update({
                subscription_status: 'inactive',
                deactivated_at: new Date().toISOString(),
                deactivation_reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) {
            throw error;
        }
        
        // Update Firebase custom claims
        await admin.auth().setCustomUserClaims(id, {
            role: 'user',
            isAdmin: false,
            subscriptionTier: 'free',
            subscriptionStatus: 'inactive'
        });
        
        // Log activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: id,
                    activity_type: 'deactivation',
                    activity_description: `User deactivated by admin. Reason: ${reason}`,
                    metadata: { 
                        deactivated_by: req.user.uid,
                        reason: reason
                    },
                    created_at: new Date().toISOString()
                }
            ]);
        
        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
        
    } catch (error) {
        console.error('User deactivation error:', error);
        res.status(500).json({
            error: 'Failed to deactivate user'
        });
    }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, phone, country, subscription_tier, subscription_status } = req.body;
        
        const updateData = {
            updated_at: new Date().toISOString()
        };
        
        if (full_name) updateData.full_name = full_name;
        if (phone) updateData.phone = phone;
        if (country) updateData.country = country;
        if (subscription_tier) updateData.subscription_tier = subscription_tier;
        if (subscription_status) updateData.subscription_status = subscription_status;
        
        const { data: updatedUser, error } = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        // Update Firebase user if email changed
        if (email && email !== updatedUser.email) {
            await admin.auth().updateUser(id, { email });
        }
        
        // Update Firebase custom claims if subscription changed
        if (subscription_tier || subscription_status) {
            await admin.auth().setCustomUserClaims(id, {
                role: 'user',
                isAdmin: false,
                subscriptionTier: subscription_tier || updatedUser.subscription_tier,
                subscriptionStatus: subscription_status || updatedUser.subscription_status
            });
        }
        
        // Log activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: id,
                    activity_type: 'admin_update',
                    activity_description: 'User profile updated by admin',
                    metadata: { 
                        updated_by: req.user.uid,
                        changes: updateData
                    },
                    created_at: new Date().toISOString()
                }
            ]);
        
        res.json({
            success: true,
            user: updatedUser,
            message: 'User updated successfully'
        });
        
    } catch (error) {
        console.error('User update error:', error);
        res.status(500).json({
            error: 'Failed to update user'
        });
    }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Delete from Firebase
        await admin.auth().deleteUser(id);
        
        // Delete from Supabase (cascade will handle related records)
        const { error } = await supabase
            .from('user_profiles')
            .delete()
            .eq('id', id);
        
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
        
    } catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({
            error: 'Failed to delete user'
        });
    }
});

// GET /api/users/:id/activity - Get user activity log (admin only)
router.get('/:id/activity', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        
        const { data: activities, error, count } = await supabase
            .from('user_activity_log')
            .select('*', { count: 'exact' })
            .eq('user_id', id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            activities,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
        
    } catch (error) {
        console.error('Get user activity error:', error);
        res.status(500).json({
            error: 'Failed to fetch user activity'
        });
    }
});

module.exports = router;