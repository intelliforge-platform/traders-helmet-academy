
/**
 * TRADERS HELMET ACADEMY - SUPABASE INTEGRATION
 * Authentication, database, and real-time functionality using Supabase
 * 
 * Prerequisites: 
 * - Include Supabase JS SDK: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * - Configure your Supabase URL and keys in config.js
 */

class SupabaseManager {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.realtimeChannels = new Map();
    this.eventListeners = new Map();
    
    this.init();
  }

  /**
   * Initialize Supabase client
   */
  async init() {
    try {
      // Check if Supabase is loaded and config is available
      if (typeof window.supabase === 'undefined') {
        console.error('Supabase SDK not loaded. Please include the Supabase script.');
        return;
      }

      if (!THA_CONFIG?.supabase?.url || !THA_CONFIG?.supabase?.anonKey) {
        console.error('Supabase configuration missing. Please update config.js');
        return;
      }

      // Initialize Supabase client
      this.supabase = window.supabase.createClient(
        THA_CONFIG.supabase.url,
        THA_CONFIG.supabase.anonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        }
      );

      // Check for existing session
      await this.checkSession();
      
      // Listen for auth state changes
      this.supabase.auth.onAuthStateChange((event, session) => {
        this.handleAuthStateChange(event, session);
      });

      console.log('✅ Supabase initialized successfully');
    } catch (error) {
      console.error('❌ Supabase initialization failed:', error);
    }
  }

  /**
   * Check for existing user session
   */
  async checkSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session) {
        this.currentUser = session.user;
        await this.fetchUserProfile();
        this.emit('userLogin', this.currentUser);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  /**
   * Handle authentication state changes
   */
  handleAuthStateChange(event, session) {
    console.log('Auth state changed:', event);
    
    switch (event) {
      case 'SIGNED_IN':
        this.currentUser = session.user;
        this.fetchUserProfile();
        this.emit('userLogin', this.currentUser);
        break;
        
      case 'SIGNED_OUT':
        this.currentUser = null;
        this.cleanup();
        this.emit('userLogout');
        break;
        
      case 'TOKEN_REFRESHED':
        console.log('Token refreshed');
        break;
        
      case 'USER_UPDATED':
        this.currentUser = session.user;
        this.fetchUserProfile();
        this.emit('userUpdated', this.currentUser);
        break;
    }
  }

  /**
   * AUTHENTICATION METHODS
   */

  /**
   * Sign up new user
   */
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName || '',
            last_name: userData.lastName || '',
            tier: userData.tier || 'gold',
            ...userData
          }
        }
      });

      if (error) throw error;

      // Create user profile
      if (data.user) {
        await this.createUserProfile(data.user, userData);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Sign up failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in user
   */
  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Sign in failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in with OTP (Magic Link)
   */
  async signInWithOTP(email) {
    try {
      const { data, error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('OTP sign in failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign out user
   */
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Sign out failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email) {
    try {
      const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Password reset failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword) {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Password update failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * DATABASE METHODS
   */

  /**
   * Create user profile
   */
  async createUserProfile(user, additionalData = {}) {
    try {
      const profileData = {
        id: user.id,
        email: user.email,
        first_name: additionalData.firstName || '',
        last_name: additionalData.lastName || '',
        tier: additionalData.tier || 'gold',
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Profile creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch user profile
   */
  async fetchUserProfile() {
    if (!this.currentUser) return null;

    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select(`
          *,
          subscriptions (
            id,
            tier,
            status,
            current_period_start,
            current_period_end,
            created_at
          )
        `)
        .eq('id', this.currentUser.id)
        .single();

      if (error) throw error;

      this.currentUser.profile = data;
      return data;
    } catch (error) {
      console.error('Profile fetch failed:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates) {
    if (!this.currentUser) throw new Error('No user logged in');

    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      this.currentUser.profile = data;
      return { success: true, data };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * SUBSCRIPTION METHODS
   */

  /**
   * Get user subscription
   */
  async getUserSubscription() {
    if (!this.currentUser) return null;

    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data;
    } catch (error) {
      console.error('Subscription fetch failed:', error);
      return null;
    }
  }

  /**
   * Create or update subscription
   */
  async updateSubscription(subscriptionData) {
    if (!this.currentUser) throw new Error('No user logged in');

    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .upsert({
          user_id: this.currentUser.id,
          ...subscriptionData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Subscription update failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * TRADING SIGNALS METHODS
   */

  /**
   * Get trading signals based on user tier
   */
  async getTradingSignals(filters = {}) {
    try {
      let query = this.supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Apply tier-based filtering
      if (this.currentUser?.profile?.tier) {
        const tierConfig = THA_CONFIG.tiers[this.currentUser.profile.tier];
        if (tierConfig) {
          // Implement tier-based signal access logic
          const limit = tierConfig.signalsAccess.daily === 'unlimited' 
            ? 1000 
            : tierConfig.signalsAccess.daily;
          query = query.limit(limit);
        }
      }

      // Apply additional filters
      if (filters.symbol) {
        query = query.eq('symbol', filters.symbol);
      }
      if (filters.signal_type) {
        query = query.eq('signal_type', filters.signal_type);
      }
      if (filters.risk_level) {
        query = query.eq('risk_level', filters.risk_level);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Signals fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark signal as viewed
   */
  async markSignalViewed(signalId) {
    if (!this.currentUser) return;

    try {
      const { error } = await this.supabase
        .from('signal_views')
        .insert({
          user_id: this.currentUser.id,
          signal_id: signalId,
          viewed_at: new Date().toISOString()
        });

      if (error && error.code !== '23505') throw error; // Ignore duplicate key errors
    } catch (error) {
      console.error('Signal view tracking failed:', error);
    }
  }

  /**
   * REAL-TIME METHODS
   */

  /**
   * Subscribe to real-time updates
   */
  subscribeToChannel(channelName, options = {}) {
    try {
      const channel = this.supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          ...options
        }, (payload) => {
          this.emit(`realtime:${channelName}`, payload);
        })
        .subscribe();

      this.realtimeChannels.set(channelName, channel);
      
      return channel;
    } catch (error) {
      console.error('Channel subscription failed:', error);
      return null;
    }
  }

  /**
   * Subscribe to trading signals updates
   */
  subscribeToSignals() {
    return this.subscribeToChannel('signals', {
      table: 'trading_signals',
      filter: 'status=eq.active'
    });
  }

  /**
   * Subscribe to chat messages
   */
  subscribeToChat(chatRoomId) {
    return this.subscribeToChannel(`chat:${chatRoomId}`, {
      table: 'chat_messages',
      filter: `room_id=eq.${chatRoomId}`
    });
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribeFromChannel(channelName) {
    const channel = this.realtimeChannels.get(channelName);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.realtimeChannels.delete(channelName);
    }
  }

  /**
   * CHAT METHODS
   */

  /**
   * Send chat message
   */
  async sendChatMessage(roomId, message, messageType = 'text') {
    if (!this.currentUser) throw new Error('No user logged in');

    try {
      const { data, error } = await this.supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: this.currentUser.id,
          message: message,
          message_type: messageType,
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            avatar_url,
            tier
          )
        `)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Send message failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get chat messages
   */
  async getChatMessages(roomId, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('chat_messages')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            avatar_url,
            tier
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data.reverse() };
    } catch (error) {
      console.error('Get messages failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ADMIN METHODS
   */

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.currentUser?.profile?.tier === 'admin' || 
           this.currentUser?.profile?.role === 'admin';
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(page = 1, limit = 50) {
    if (!this.isAdmin()) {
      throw new Error('Admin access required');
    }

    try {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await this.supabase
        .from('user_profiles')
        .select(`
          *,
          subscriptions (
            id,
            tier,
            status,
            current_period_end
          )
        `, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { 
        success: true, 
        data, 
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Get users failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user subscription (admin only)
   */
  async adminUpdateUserSubscription(userId, subscriptionData) {
    if (!this.isAdmin()) {
      throw new Error('Admin access required');
    }

    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          ...subscriptionData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Admin subscription update failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Get user tier
   */
  getUserTier() {
    return this.currentUser?.profile?.tier || 'gold';
  }

  /**
   * Check tier access
   */
  hasTierAccess(requiredTier) {
    const tierLevels = {
      gold: 1,
      platinum: 2,
      diamond: 3,
      admin: 999
    };
    
    const userLevel = tierLevels[this.getUserTier()] || 0;
    const requiredLevel = tierLevels[requiredTier] || 0;
    
    return userLevel >= requiredLevel;
  }

  /**
   * Upload file to storage
   */
  async uploadFile(bucket, path, file) {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file);

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('File upload failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get file URL from storage
   */
  getFileUrl(bucket, path) {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  /**
   * EVENT SYSTEM
   */

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup method
   */
  cleanup() {
    // Unsubscribe from all real-time channels
    this.realtimeChannels.forEach((channel, name) => {
      this.unsubscribeFromChannel(name);
    });
    
    // Clear event listeners
    this.eventListeners.clear();
  }
}

// Create global instance
const supabaseManager = new SupabaseManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.supabaseManager = supabaseManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseManager;
}