
-- =========================================
-- MIGRATION 002: Add Indexes and Row Level Security
-- Location: /database/migrations/002_add_indexes_rls.sql
-- Description: Adds performance indexes and implements Row Level Security
-- =========================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES 
('002', 'Add performance indexes and Row Level Security policies', NOW())
ON CONFLICT (version) DO NOTHING;

-- =========================================
-- PERFORMANCE INDEXES
-- =========================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

-- Subscription plans indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier_level ON subscription_plans(tier_level);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_billing_cycle ON subscription_plans(billing_cycle);

-- Trading signals indexes
CREATE INDEX IF NOT EXISTS idx_trading_signals_status ON trading_signals(status);
CREATE INDEX IF NOT EXISTS idx_trading_signals_signal_type ON trading_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol ON trading_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_signals_created_at ON trading_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_trading_signals_tier_access ON trading_signals USING GIN(tier_access);
CREATE INDEX IF NOT EXISTS idx_trading_signals_min_tier ON trading_signals(min_tier_level);
CREATE INDEX IF NOT EXISTS idx_trading_signals_author ON trading_signals(author_id);
CREATE INDEX IF NOT EXISTS idx_trading_signals_expires_at ON trading_signals(expires_at);

-- Signal views indexes
CREATE INDEX IF NOT EXISTS idx_signal_views_user_id ON signal_views(user_id);
CREATE INDEX IF NOT EXISTS idx_signal_views_signal_id ON signal_views(signal_id);
CREATE INDEX IF NOT EXISTS idx_signal_views_viewed_at ON signal_views(viewed_at);

-- Signal favorites indexes
CREATE INDEX IF NOT EXISTS idx_signal_favorites_user_id ON signal_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_signal_favorites_signal_id ON signal_favorites(signal_id);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);

-- Chat rooms indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_active ON chat_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_tier_access ON chat_rooms USING GIN(tier_access);

-- Chat participants indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_active ON chat_participants(is_active);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

-- Discounts indexes
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_expires_at ON discounts(expires_at);
CREATE INDEX IF NOT EXISTS idx_discounts_type ON discounts(type);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- User activity log indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);

-- System settings indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public);

-- =========================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- =========================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update all profiles" ON user_profiles 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Subscription policies
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON user_subscriptions 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON user_subscriptions 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Subscription plans policies (public read)
CREATE POLICY "Everyone can view active subscription plans" ON subscription_plans 
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans" ON subscription_plans 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Trading signals policies
CREATE POLICY "Users can view signals based on tier" ON trading_signals 
    FOR SELECT USING (
        status = 'active' AND (
            auth.uid() IN (
                SELECT up.id FROM user_profiles up 
                JOIN user_subscriptions us ON up.id = us.user_id 
                WHERE us.status = 'active' AND (
                    (tier_access @> ARRAY[us.tier] OR tier_access @> ARRAY[up.tier])
                    OR up.role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Admins can manage signals" ON trading_signals 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Signal interactions policies
CREATE POLICY "Users can manage own signal views" ON signal_views 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites" ON signal_favorites 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own watchlist" ON user_watchlists 
    FOR ALL USING (auth.uid() = user_id);

-- Chat policies
CREATE POLICY "Users can view accessible chat rooms" ON chat_rooms 
    FOR SELECT USING (
        is_active = true AND (
            tier_access @> ARRAY['public'] OR
            auth.uid() IN (
                SELECT up.id FROM user_profiles up 
                JOIN user_subscriptions us ON up.id = us.user_id 
                WHERE us.status = 'active' AND (
                    tier_access @> ARRAY[us.tier] OR 
                    tier_access @> ARRAY[up.tier] OR 
                    up.role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Users can view messages in joined rooms" ON chat_messages 
    FOR SELECT USING (
        room_id IN (
            SELECT room_id FROM chat_participants 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can send messages to joined rooms" ON chat_messages 
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND room_id IN (
            SELECT room_id FROM chat_participants 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Payment policies
CREATE POLICY "Users can view own payments" ON payments 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON payments 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Discount policies
CREATE POLICY "Users can view active discounts" ON discounts 
    FOR SELECT USING (
        is_active = true AND 
        (starts_at IS NULL OR starts_at <= NOW()) AND 
        (expires_at IS NULL OR expires_at > NOW())
    );

CREATE POLICY "Admins can manage discounts" ON discounts 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Notification policies
CREATE POLICY "Users can view own notifications" ON notifications 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications 
    FOR UPDATE USING (auth.uid() = user_id);

-- Support ticket policies
CREATE POLICY "Users can view own tickets" ON support_tickets 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = assigned_to OR
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'support'))
    );

CREATE POLICY "Users can create own tickets" ON support_tickets 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" ON support_tickets 
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.uid() = assigned_to OR
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'support'))
    );

-- Activity log policies (admin only)
CREATE POLICY "Admins can view activity logs" ON user_activity_log 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =========================================
-- ADDITIONAL HELPER FUNCTIONS
-- =========================================

-- Function to get user tier level
CREATE OR REPLACE FUNCTION get_user_tier_level(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    tier_level INTEGER;
BEGIN
    SELECT 
        CASE 
            WHEN up.role = 'admin' THEN 999
            WHEN us.tier = 'diamond' THEN 3
            WHEN us.tier = 'platinum' THEN 2
            WHEN us.tier = 'gold' THEN 1
            ELSE 0
        END INTO tier_level
    FROM user_profiles up
    LEFT JOIN user_subscriptions us ON up.id = us.user_id AND us.status = 'active'
    WHERE up.id = user_id;
    
    RETURN COALESCE(tier_level, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to signal
CREATE OR REPLACE FUNCTION user_has_signal_access(user_id UUID, signal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM trading_signals ts
        JOIN user_profiles up ON up.id = user_id
        LEFT JOIN user_subscriptions us ON up.id = us.user_id AND us.status = 'active'
        WHERE ts.id = signal_id 
        AND ts.status = 'active'
        AND (
            up.role = 'admin' OR
            ts.tier_access @> ARRAY[us.tier] OR
            ts.tier_access @> ARRAY[up.tier] OR
            ts.min_tier_level <= get_user_tier_level(user_id)
        )
    ) INTO has_access;
    
    RETURN COALESCE(has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark migration as completed
UPDATE schema_migrations 
SET executed_at = NOW() 
WHERE version = '002';