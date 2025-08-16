-- =========================================
-- TRADERS HELMET ACADEMY - DATABASE INITIALIZATION
-- Location: /database/database-init.sql
-- 
-- Complete database initialization script that sets up the entire
-- database schema, functions, triggers, and initial data
-- =========================================

-- Set up the environment
\set ON_ERROR_STOP on
\set VERBOSITY verbose

-- Display initialization start
\echo 'Starting Traders Helmet Academy Database Initialization...'
\echo '============================================================='

-- =========================================
-- EXTENSIONS & BASIC SETUP
-- =========================================
\echo 'Setting up extensions and basic configuration...'

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext"; -- Case-insensitive text
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query statistics

-- Set timezone to UTC
SET timezone = 'UTC';

-- =========================================
-- CUSTOM TYPES AND DOMAINS
-- =========================================
\echo 'Creating custom types and domains...'

-- User tier enum
DO $$ BEGIN
    CREATE TYPE user_tier AS ENUM ('free', 'gold', 'platinum', 'diamond', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User role enum  
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User status enum
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Signal type enum
DO $$ BEGIN
    CREATE TYPE signal_type AS ENUM ('forex', 'crypto', 'stocks', 'commodities', 'indices');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Signal action enum
DO $$ BEGIN
    CREATE TYPE signal_action AS ENUM ('buy', 'sell', 'hold');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Risk level enum
DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification type enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'signal', 'payment', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Priority enum
DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment status enum
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Subscription status enum
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'past_due', 'unpaid', 'trialing');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Email domain for validation
CREATE DOMAIN email AS TEXT CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Phone domain for validation  
CREATE DOMAIN phone AS TEXT CHECK (VALUE ~* '^\+?[1-9]\d{1,14}$');

-- =========================================
-- UTILITY FUNCTIONS
-- =========================================
\echo 'Creating utility functions...'

-- Function to generate short UUID
CREATE OR REPLACE FUNCTION generate_short_uuid()
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(LEFT(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 8));
END;
$$ LANGUAGE plpgsql;

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN := TRUE;
BEGIN
    WHILE exists LOOP
        code := UPPER(LEFT(MD5(RANDOM()::TEXT), 8));
        SELECT EXISTS(SELECT 1 FROM user_profiles WHERE referral_code = code) INTO exists;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to validate password strength
CREATE OR REPLACE FUNCTION validate_password_strength(password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Minimum 8 characters
    IF LENGTH(password) < 8 THEN
        RETURN FALSE;
    END IF;
    
    -- Must contain at least one uppercase letter
    IF NOT password ~ '[A-Z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Must contain at least one lowercase letter
    IF NOT password ~ '[a-z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Must contain at least one digit
    IF NOT password ~ '[0-9]' THEN
        RETURN FALSE;
    END IF;
    
    -- Must contain at least one special character
    IF NOT password ~ '[!@#$%^&*(),.?":{}|<>]' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user tier level
CREATE OR REPLACE FUNCTION get_user_tier_level(tier_name TEXT)
RETURNS INTEGER AS $$
BEGIN
    CASE tier_name
        WHEN 'free' THEN RETURN 0;
        WHEN 'gold' THEN RETURN 1;
        WHEN 'platinum' THEN RETURN 2;
        WHEN 'diamond' THEN RETURN 3;
        WHEN 'admin' THEN RETURN 999;
        ELSE RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to format currency
CREATE OR REPLACE FUNCTION format_currency(amount DECIMAL(10,2), currency TEXT DEFAULT 'USD')
RETURNS TEXT AS $$
BEGIN
    CASE currency
        WHEN 'USD' THEN RETURN '$' || amount::TEXT;
        WHEN 'EUR' THEN RETURN '€' || amount::TEXT;
        WHEN 'GBP' THEN RETURN '£' || amount::TEXT;
        ELSE RETURN amount::TEXT || ' ' || currency;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, metadata)
    VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_metadata);
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the main operation if logging fails
        RAISE WARNING 'Failed to log user activity: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type notification_type DEFAULT 'info',
    p_priority priority_level DEFAULT 'normal',
    p_action_url TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}'::JSONB,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, data, expires_at)
    VALUES (p_user_id, p_title, p_message, p_type, p_priority, p_action_url, p_data, p_expires_at)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has signal access
CREATE OR REPLACE FUNCTION user_has_signal_access(p_user_id UUID, p_signal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier TEXT;
    user_role TEXT;
    signal_tier_access TEXT[];
    signal_min_tier INTEGER;
    user_tier_level INTEGER;
BEGIN
    -- Get user tier and role
    SELECT up.tier, up.role INTO user_tier, user_role
    FROM user_profiles up
    WHERE up.id = p_user_id;
    
    -- Admin users have access to everything
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Get signal access requirements
    SELECT tier_access, min_tier_level INTO signal_tier_access, signal_min_tier
    FROM trading_signals 
    WHERE id = p_signal_id AND status = 'active';
    
    -- Check if signal exists
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check tier access array
    IF user_tier = ANY(signal_tier_access) THEN
        RETURN TRUE;
    END IF;
    
    -- Check minimum tier level
    user_tier_level := get_user_tier_level(user_tier);
    IF user_tier_level >= signal_min_tier THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- TRIGGERS AND TRIGGER FUNCTIONS
-- =========================================
\echo 'Creating triggers and trigger functions...'

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, email_verified, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.email_confirmed_at IS NOT NULL,
        COALESCE(NEW.created_at, NOW())
    );
    
    -- Log the registration
    PERFORM log_user_activity(NEW.id, 'user_registered', 'auth', NEW.id::TEXT);
    
    -- Create welcome notification
    PERFORM create_notification(
        NEW.id,
        'Welcome to Traders Helmet Academy!',
        'Thank you for joining us. Start exploring our trading signals and tools.',
        'info',
        'normal'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-generate referral code
CREATE OR REPLACE FUNCTION generate_user_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate user data
CREATE OR REPLACE FUNCTION validate_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate email format
    IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    -- Validate phone format if provided
    IF NEW.phone IS NOT NULL AND NEW.phone != '' AND NEW.phone !~ '^\+?[1-9]\d{1,14}$' THEN
        RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
    END IF;
    
    -- Validate tier and role combination
    IF NEW.tier = 'admin' AND NEW.role != 'admin' THEN
        NEW.role := 'admin';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to track signal performance
CREATE OR REPLACE FUNCTION update_signal_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert signal performance data
    INSERT INTO signal_performance (signal_id, pips_gained, last_updated)
    VALUES (NEW.id, NEW.pips_gained, NOW())
    ON CONFLICT (signal_id) 
    DO UPDATE SET 
        pips_gained = NEW.pips_gained,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify users of new signals
CREATE OR REPLACE FUNCTION notify_new_signal()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Notify users who have access to this signal
    FOR user_record IN 
        SELECT up.id, up.first_name, up.email
        FROM user_profiles up
        LEFT JOIN user_subscriptions us ON up.id = us.user_id AND us.status = 'active'
        WHERE up.status = 'active'
        AND (
            up.tier = ANY(NEW.tier_access) OR
            get_user_tier_level(COALESCE(us.tier, up.tier)) >= NEW.min_tier_level OR
            up.role = 'admin'
        )
    LOOP
        -- Create notification
        PERFORM create_notification(
            user_record.id,
            'New Trading Signal',
            format('New %s signal for %s: %s at %s', NEW.signal_type, NEW.symbol, NEW.action, NEW.entry_price),
            'signal',
            'high',
            format('/pages/signals/?signal=%s', NEW.id)
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle subscription changes
CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user profile tier when subscription changes
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        UPDATE user_profiles 
        SET tier = NEW.tier, updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Log subscription activation
        PERFORM log_user_activity(NEW.user_id, 'subscription_activated', 'subscription', NEW.id::TEXT);
        
        -- Create notification
        PERFORM create_notification(
            NEW.user_id,
            'Subscription Activated',
            format('Your %s subscription is now active!', NEW.tier),
            'success',
            'high'
        );
        
    ELSIF NEW.status != 'active' AND OLD.status = 'active' THEN
        -- Subscription deactivated - revert to free tier
        UPDATE user_profiles 
        SET tier = 'free', updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Log subscription deactivation
        PERFORM log_user_activity(NEW.user_id, 'subscription_deactivated', 'subscription', NEW.id::TEXT);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- VIEWS FOR COMMON QUERIES
-- =========================================
\echo 'Creating database views...'

-- Active users view
CREATE OR REPLACE VIEW active_users AS
SELECT 
    up.*,
    us.tier as subscription_tier,
    us.status as subscription_status,
    us.current_period_end
FROM user_profiles up
LEFT JOIN user_subscriptions us ON up.id = us.user_id AND us.status = 'active'
WHERE up.status = 'active';

-- Signal analytics view
CREATE OR REPLACE VIEW signal_analytics AS
SELECT 
    ts.signal_type,
    ts.symbol,
    COUNT(*) as total_signals,
    COUNT(CASE WHEN ts.result = 'profit' THEN 1 END) as profitable_signals,
    COUNT(CASE WHEN ts.result = 'loss' THEN 1 END) as losing_signals,
    ROUND(
        COALESCE(
            COUNT(CASE WHEN ts.result = 'profit' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(CASE WHEN ts.result IN ('profit', 'loss') THEN 1 END), 0) * 100, 
            0
        ), 2
    ) as win_rate,
    AVG(CASE WHEN ts.result = 'profit' THEN ts.percentage_gain END) as avg_profit,
    AVG(CASE WHEN ts.result = 'loss' THEN ts.percentage_gain END) as avg_loss,
    SUM(COALESCE(ts.pips_gained, 0)) as total_pips
FROM trading_signals ts
WHERE ts.status = 'closed'
GROUP BY ts.signal_type, ts.symbol
ORDER BY win_rate DESC, total_signals DESC;

-- User engagement view
CREATE OR REPLACE VIEW user_engagement AS
SELECT 
    up.id,
    up.email,
    up.tier,
    up.created_at as registration_date,
    up.last_login,
    COALESCE(signal_views.view_count, 0) as signals_viewed,
    COALESCE(chat_messages.message_count, 0) as messages_sent,
    COALESCE(login_count, 0) as total_logins,
    CASE 
        WHEN up.last_login > NOW() - INTERVAL '7 days' THEN 'active'
        WHEN up.last_login > NOW() - INTERVAL '30 days' THEN 'inactive'
        ELSE 'dormant'
    END as engagement_status
FROM user_profiles up
LEFT JOIN (
    SELECT user_id, COUNT(*) as view_count
    FROM signal_views
    GROUP BY user_id
) signal_views ON up.id = signal_views.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as message_count
    FROM chat_messages
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
) chat_messages ON up.id = chat_messages.user_id
WHERE up.status = 'active';

-- Revenue analytics view
CREATE OR REPLACE VIEW revenue_analytics AS
SELECT 
    DATE_TRUNC('month', p.created_at) as month,
    COUNT(*) as payment_count,
    SUM(p.amount) as total_revenue,
    AVG(p.amount) as avg_payment,
    COUNT(DISTINCT p.user_id) as unique_customers,
    COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as successful_payments,
    COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments
FROM payments p
WHERE p.created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', p.created_at)
ORDER BY month DESC;

-- =========================================
-- SECURITY SETUP (RLS POLICIES)
-- =========================================
\echo 'Setting up Row Level Security policies...'

-- Enable RLS on all tables (this will be done in the migration files)
-- Just create any additional policies here if needed

-- Additional policy for user profiles based on friendship/following
CREATE POLICY "Users can view public profiles" ON user_profiles 
    FOR SELECT USING (
        CASE 
            WHEN (preferences->>'profile_visibility')::TEXT = 'public' THEN true
            WHEN (preferences->>'profile_visibility')::TEXT = 'private' THEN auth.uid() = id
            ELSE auth.uid() = id  -- Default to private
        END
    );

-- =========================================
-- MONITORING AND MAINTENANCE SETUP
-- =========================================
\echo 'Setting up monitoring and maintenance...'

-- Create monitoring tables
CREATE TABLE IF NOT EXISTS system_monitoring (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC,
    metric_unit TEXT,
    tags JSONB DEFAULT '{}'::JSONB,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_system_monitoring_metric_time 
ON system_monitoring(metric_name, recorded_at DESC);

-- Function to record system metrics
CREATE OR REPLACE FUNCTION record_system_metric(
    p_metric_name TEXT,
    p_metric_value NUMERIC,
    p_metric_unit TEXT DEFAULT NULL,
    p_tags JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_monitoring (metric_name, metric_value, metric_unit, tags)
    VALUES (p_metric_name, p_metric_value, p_metric_unit, p_tags);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- FINAL SETUP AND VERIFICATION
-- =========================================
\echo 'Performing final setup and verification...'

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create admin user function (for initial setup only)
CREATE OR REPLACE FUNCTION create_admin_user(
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT DEFAULT 'Admin',
    p_last_name TEXT DEFAULT 'User'
)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- This function should only be used for initial setup
    -- In production, admin users should be created through the proper auth flow
    
    user_id := uuid_generate_v4();
    
    -- Insert into user_profiles
    INSERT INTO user_profiles (
        id, email, first_name, last_name, tier, role, status, 
        email_verified, created_at, updated_at
    ) VALUES (
        user_id, p_email, p_first_name, p_last_name, 'admin', 'admin', 'active',
        true, NOW(), NOW()
    );
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial system settings if they don't exist
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
    ('database_version', '"1.0.0"', 'Database schema version', 'system', false),
    ('initialization_date', to_jsonb(NOW()), 'Database initialization timestamp', 'system', false),
    ('maintenance_mode', 'false', 'System maintenance mode flag', 'system', false)
ON CONFLICT (key) DO NOTHING;

-- Record initialization
PERFORM record_system_metric('database_initialization', 1, 'count', 
    jsonb_build_object('timestamp', NOW(), 'version', '1.0.0'));

-- Final verification queries
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    view_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
    
    -- Count views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_schema = 'public';
    
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Functions created: %', function_count;
    RAISE NOTICE 'Views created: %', view_count;
END $$;

\echo '============================================================='
\echo 'Traders Helmet Academy Database Initialization Complete! ✅'
\echo '============================================================='