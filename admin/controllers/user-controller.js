const supabase = require('../config/supabase-client');
const admin = require('../config/firebase-admin');

class UserController {
  
  // Get all users with pagination
  static async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      
      const { data: users, error, count } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      res.json({
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
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
  
  // Get pending activations
  static async getPendingActivations(req, res) {
    try {
      const { data: pendingUsers, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          payments!inner(*)
        `)
        .eq('subscription_status', 'pending')
        .in('payments.payment_method', ['bank_transfer', 'cryptocurrency'])
        .eq('payments.status', 'pending');
      
      if (error) throw error;
      
      res.json({ pendingUsers });
      
    } catch (error) {
      console.error('Get pending activations error:', error);
      res.status(500).json({ error: 'Failed to fetch pending activations' });
    }
  }
  
  // Manually activate user
  static async activateUser(req, res) {
    try {
      const { userId } = req.params;
      const { tier, paymentId } = req.body;
      
      // Update user subscription
      const { error: userError } = await supabase
        .from('user_profiles')
        .update({
          subscription_tier: tier,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: UserController.calculateEndDate(tier),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (userError) throw userError;
      
      // Update payment status
      if (paymentId) {
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            processed_by: req.user.uid
          })
          .eq('id', paymentId);
        
        if (paymentError) throw paymentError;
      }
      
      // Log activity
      await supabase
        .from('user_activity_log')
        .insert([
          {
            user_id: userId,
            activity_type: 'manual_activation',
            activity_description: `User manually activated by admin for ${tier} tier`,
            metadata: { 
              activated_by: req.user.uid,
              payment_id: paymentId,
              tier: tier
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
      res.status(500).json({ error: 'Failed to activate user' });
    }
  }
  
  // Deactivate user
  static async deactivateUser(req, res) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          subscription_status: 'inactive',
          deactivated_at: new Date().toISOString(),
          deactivation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Log activity
      await supabase
        .from('user_activity_log')
        .insert([
          {
            user_id: userId,
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
      res.status(500).json({ error: 'Failed to deactivate user' });
    }
  }
  
  // Helper method to calculate subscription end date
  static calculateEndDate(tier) {
    const now = new Date();
    const months = tier === 'gold' ? 2 : tier === 'platinum' ? 3 : 6;
    now.setMonth(now.getMonth() + months);
    return now.toISOString();
  }
}

module.exports = UserController;