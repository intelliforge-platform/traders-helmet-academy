
-- =========================================
-- TRADERS HELMET ACADEMY - DATABASE SCHEMA
-- Complete Supabase database schema
-- =========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- USER PROFILES TABLE
-- =========================================
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    date_of_birth DATE,
    country TEXT,
    timezone TEXT DEFAULT 'UTC',
    tier TEXT NOT NULL DEFAULT 'gold' CHECK (tier IN ('gold', 'platinum', 'diamond', 'admin')),
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'support')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'banned')),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES user_profiles(id),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- SUBSCRIPTIONS TABLE
-- =========================================
CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('gold', 'platinum', 'diamond')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'unpaid')),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    price_id TEXT,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annually')),
    auto_renew BOOLEAN DEFAULT TRUE,
    discount_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- TRADING SIGNALS TABLE
-- =========================================
CREATE TABLE trading_signals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('forex', 'crypto', 'stocks', 'commodities', 'indices')),
    symbol TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
    entry_price DECIMAL(15,8),
    stop_loss DECIMAL(15,8),
    take_profit DECIMAL(15,8),
    risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
    confidence INTEGER CHECK (confidence >= 1 AND confidence <= 100),
    tier_access TEXT[] DEFAULT ARRAY['gold', 'platinum', 'diamond'],
    priority INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled', 'draft')),
    result TEXT CHECK (result IN ('profit', 'loss', 'breakeven', 'pending')),
    pips_gained DECIMAL(10,2),
    percentage_gain DECIMAL(5,2),
    closed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    author_id UUID REFERENCES user_profiles(id),
    tags TEXT[],
    attachments JSONB DEFAULT '[]',
    analytics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- SIGNAL VIEWS TABLE (User interaction tracking)
-- =========================================
CREATE TABLE signal_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES trading_signals(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, signal_id)
);

-- =========================================
-- SIGNAL FAVORITES TABLE
-- =========================================
CREATE TABLE signal_favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES trading_signals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, signal_id)
);

-- =========================================
-- CHAT ROOMS TABLE
-- =========================================
CREATE TABLE chat_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'support', 'group')),
    tier_access TEXT[] DEFAULT ARRAY['gold', 'platinum', 'diamond', 'admin'],
    max_participants INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- CHAT MESSAGES TABLE
-- =========================================
CREATE TABLE chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
    reply_to UUID REFERENCES chat_messages(id),
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- CHAT PARTICIPANTS TABLE
-- =========================================
CREATE TABLE chat_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(room_id, user_id)
);

-- =========================================
-- PAYMENTS TABLE
-- =========================================
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'refunded')),
    payment_method TEXT,
    description TEXT,
    receipt_url TEXT,
    invoice_id TEXT,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refunded_at TIMESTAMPTZ,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- DISCOUNTS TABLE
-- =========================================
CREATE TABLE discounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(10,2) NOT NULL,
    minimum_amount DECIMAL(10,2),
    maximum_discount DECIMAL(10,2),
    applicable_tiers TEXT[] DEFAULT ARRAY['gold', 'platinum', 'diamond'],
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    user_limit INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- DISCOUNT USAGE TABLE
-- =========================================
CREATE TABLE discount_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discount_id UUID REFERENCES discounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(discount_id, user_id, payment_id)
);

-- =========================================
-- NOTIFICATIONS TABLE
-- =========================================
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'signal', 'payment', 'system')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    data JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- USER ACTIVITY LOG TABLE
-- =========================================
CREATE TABLE user_activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- SYSTEM SETTINGS TABLE
-- =========================================
CREATE TABLE system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- SUPPORT TICKETS TABLE
-- =========================================
CREATE TABLE support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'signals', 'account')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to UUID REFERENCES user_profiles(id),
    last_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- SUPPORT TICKET MESSAGES TABLE
-- =========================================
CREATE TABLE support_ticket_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_tier ON user_profiles(tier);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_referral_code ON user_profiles(referral_code);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Trading signals indexes
CREATE INDEX idx_trading_signals_status ON trading_signals(status);
CREATE INDEX idx_trading_signals_signal_type ON trading_signals(signal_type);
CREATE INDEX idx_trading_signals_symbol ON trading_signals(symbol);
CREATE INDEX idx_trading_signals_created_at ON trading_signals(created_at);
CREATE INDEX idx_trading_signals_tier_access ON trading_signals USING GIN(tier_access);

-- Signal views indexes
CREATE INDEX idx_signal_views_user_id ON signal_views(user_id);
CREATE INDEX idx_signal_views_signal_id ON signal_views(signal_id);
CREATE INDEX idx_signal_views_viewed_at ON signal_views(viewed_at);

-- Chat messages indexes
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Payments indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_favorites ENABLE ROW LEVEL SECURITY;
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

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON user_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON subscriptions FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trading signals policies
CREATE POLICY "Users can view signals based on tier" ON trading_signals FOR SELECT USING (
    status = 'active' AND (
        auth.uid() IN (
            SELECT id FROM user_profiles 
            WHERE tier = ANY(tier_access) OR role = 'admin'
        )
    )
);
CREATE POLICY "Admins can manage signals" ON trading_signals FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Signal views policies
CREATE POLICY "Users can manage own signal views" ON signal_views FOR ALL USING (auth.uid() = user_id);

-- Signal favorites policies
CREATE POLICY "Users can manage own favorites" ON signal_favorites FOR ALL USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view messages in joined rooms" ON chat_messages FOR SELECT USING (
    room_id IN (
        SELECT room_id FROM chat_participants 
        WHERE user_id = auth.uid() AND is_active = true
    )
);
CREATE POLICY "Users can send messages to joined rooms" ON chat_messages FOR INSERT WITH CHECK (
    auth.uid() = user_id AND room_id IN (
        SELECT room_id FROM chat_participants 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all payments" ON payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- =========================================
-- FUNCTIONS AND TRIGGERS
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trading_signals_updated_at BEFORE UPDATE ON trading_signals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON discounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, email_verified)
    VALUES (NEW.id, NEW.email, NEW.email_confirmed_at IS NOT NULL);
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.referral_code = UPPER(LEFT(MD5(RANDOM()::TEXT), 8));
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to generate referral code
CREATE TRIGGER generate_referral_code_trigger
    BEFORE INSERT ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, metadata)
    VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_metadata);
END;
$$ language 'plpgsql' security definer;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_priority TEXT DEFAULT 'normal',
    p_action_url TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, data)
    VALUES (p_user_id, p_title, p_message, p_type, p_priority, p_action_url, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ language 'plpgsql' security definer;

-- =========================================
-- INITIAL DATA INSERTS
-- =========================================

-- Default chat rooms
INSERT INTO chat_rooms (id, name, description, type, tier_access) VALUES
    (uuid_generate_v4(), 'General Discussion', 'General chat for all members', 'public', ARRAY['gold', 'platinum', 'diamond']),
    (uuid_generate_v4(), 'Trading Signals', 'Discuss trading signals and strategies', 'public', ARRAY['gold', 'platinum', 'diamond']),
    (uuid_generate_v4(), 'Premium Support', 'Premium member support', 'public', ARRAY['platinum', 'diamond']),
    (uuid_generate_v4(), 'Diamond Lounge', 'Exclusive chat for Diamond members', 'public', ARRAY['diamond']),
    (uuid_generate_v4(), 'Support', 'General support chat', 'support', ARRAY['gold', 'platinum', 'diamond']);

-- System settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
    ('site_title', '"Traders Helmet Academy"', 'Website title', 'general', true),
    ('site_description', '"Your Gateway to Trading Excellence"', 'Website description', 'general', true),
    ('maintenance_mode', 'false', 'Enable maintenance mode', 'system', false),
    ('registration_enabled', 'true', 'Allow new user registration', 'auth', false),
    ('max_login_attempts', '5', 'Maximum login attempts before lockout', 'auth', false),
    ('signal_retention_days', '30', 'Days to keep closed signals', 'signals', false),
    ('chat_message_retention_days', '90', 'Days to keep chat messages', 'chat', false);

-- Sample discount codes
INSERT INTO discounts (code, name, description, type, value, applicable_tiers, usage_limit, is_active, expires_at) VALUES
    ('WELCOME10', 'Welcome Discount', '10% off for new users', 'percentage', 10, ARRAY['gold', 'platinum', 'diamond'], 1000, true, NOW() + INTERVAL '30 days'),
    ('PREMIUM25', 'Premium Upgrade', '25% off premium tiers', 'percentage', 25, ARRAY['platinum', 'diamond'], 500, true, NOW() + INTERVAL '60 days'),
    ('DIAMOND50', 'Diamond Special', '$50 off Diamond membership', 'fixed', 50, ARRAY['diamond'], 100, true, NOW() + INTERVAL '90 days');

-- =========================================
-- VIEWS FOR COMMON QUERIES
-- =========================================

-- Active subscriptions view
CREATE VIEW active_subscriptions AS
SELECT 
    s.*,
    up.email,
    up.first_name,
    up.last_name
FROM subscriptions s
JOIN user_profiles up ON s.user_id = up.id
WHERE s.status = 'active' AND s.current_period_end > NOW();

-- Signal performance view
CREATE VIEW signal_performance AS
SELECT 
    signal_type,
    COUNT(*) as total_signals,
    COUNT(CASE WHEN result = 'profit' THEN 1 END) as profitable_signals,
    COUNT(CASE WHEN result = 'loss' THEN 1 END) as losing_signals,
    ROUND(
        COUNT(CASE WHEN result = 'profit' THEN 1 END)::decimal / 
        NULLIF(COUNT(CASE WHEN result IN ('profit', 'loss') THEN 1 END), 0) * 100, 2
    ) as win_rate,
    AVG(CASE WHEN result = 'profit' THEN percentage_gain END) as avg_profit,
    AVG(CASE WHEN result = 'loss' THEN percentage_gain END) as avg_loss
FROM trading_signals
WHERE status = 'closed' AND result IN ('profit', 'loss')
GROUP BY signal_type;

-- User tier statistics view
CREATE VIEW user_tier_stats AS
SELECT 
    tier,
    COUNT(*) as user_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as weekly_active,
    COUNT(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 END) as monthly_active
FROM user_profiles
GROUP BY tier;

COMMENT ON SCHEMA public IS 'Traders Helmet Academy Database Schema - Complete system for trading signals platform with user management, subscriptions, chat, and analytics.';