
-- =========================================
-- TRADERS HELMET ACADEMY - SEED DATA
-- Initial data for development and testing
-- Location: /database/seed-data.sql
-- =========================================

-- =========================================
-- SUBSCRIPTION PLANS
-- =========================================
INSERT INTO subscription_plans (id, name, description, price, currency, billing_cycle, features, tier_level, is_active) VALUES
    (uuid_generate_v4(), 'Gold Membership', 'Essential trading signals and basic market access', 29.99, 'USD', 'monthly', 
     '["Basic Forex Signals", "Email Support", "Mobile App Access", "Basic Charts"]'::jsonb, 1, true),
    (uuid_generate_v4(), 'Platinum Membership', 'Advanced trading tools and premium signals', 59.99, 'USD', 'monthly', 
     '["Advanced Forex Signals", "Crypto Signals", "Priority Support", "Advanced Charts", "Technical Analysis"]'::jsonb, 2, true),
    (uuid_generate_v4(), 'Diamond Membership', 'Complete trading suite with VIP access', 99.99, 'USD', 'monthly', 
     '["Premium Forex Signals", "Crypto Signals", "Stock Signals", "VIP Support", "Personal Trading Coach", "All Features"]'::jsonb, 3, true),

-- Annual plans with discounts
    (uuid_generate_v4(), 'Gold Membership (Annual)', 'Essential trading signals - Annual billing', 299.99, 'USD', 'annually', 
     '["Basic Forex Signals", "Email Support", "Mobile App Access", "Basic Charts", "2 Months Free"]'::jsonb, 1, true),
    (uuid_generate_v4(), 'Platinum Membership (Annual)', 'Advanced trading tools - Annual billing', 599.99, 'USD', 'annually', 
     '["Advanced Forex Signals", "Crypto Signals", "Priority Support", "Advanced Charts", "Technical Analysis", "2 Months Free"]'::jsonb, 2, true),
    (uuid_generate_v4(), 'Diamond Membership (Annual)', 'Complete trading suite - Annual billing', 999.99, 'USD', 'annually', 
     '["Premium Forex Signals", "Crypto Signals", "Stock Signals", "VIP Support", "Personal Trading Coach", "All Features", "2 Months Free"]'::jsonb, 3, true);

-- =========================================
-- DEFAULT CHAT ROOMS
-- =========================================
INSERT INTO chat_rooms (id, name, description, type, tier_access, max_participants, is_active, created_by) VALUES
    (uuid_generate_v4(), 'General Discussion', 'General chat room for all members to discuss trading topics', 'public', 
     ARRAY['gold', 'platinum', 'diamond'], 500, true, NULL),
    (uuid_generate_v4(), 'Trading Signals', 'Discuss and analyze trading signals', 'public', 
     ARRAY['gold', 'platinum', 'diamond'], 300, true, NULL),
    (uuid_generate_v4(), 'Forex Focus', 'Dedicated room for forex trading discussions', 'public', 
     ARRAY['gold', 'platinum', 'diamond'], 200, true, NULL),
    (uuid_generate_v4(), 'Crypto Corner', 'Cryptocurrency trading and analysis', 'public', 
     ARRAY['platinum', 'diamond'], 150, true, NULL),
    (uuid_generate_v4(), 'Premium Support', 'Priority support for premium members', 'support', 
     ARRAY['platinum', 'diamond'], 50, true, NULL),
    (uuid_generate_v4(), 'Diamond Lounge', 'Exclusive chat for Diamond tier members', 'private', 
     ARRAY['diamond'], 25, true, NULL),
    (uuid_generate_v4(), 'Market Analysis', 'Deep market analysis and professional insights', 'public', 
     ARRAY['platinum', 'diamond'], 100, true, NULL);

-- =========================================
-- SYSTEM SETTINGS
-- =========================================
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
    ('site_name', '"Traders Helmet Academy"', 'Website name', 'general', true),
    ('site_tagline', '"Your Gateway to Trading Excellence"', 'Website tagline', 'general', true),
    ('site_description', '"Professional trading signals and education platform for forex, crypto, and stock markets"', 'SEO description', 'general', true),
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode', 'system', false),
    ('registration_enabled', 'true', 'Allow new user registration', 'auth', false),
    ('email_verification_required', 'true', 'Require email verification for new accounts', 'auth', false),
    ('max_login_attempts', '5', 'Maximum failed login attempts before lockout', 'security', false),
    ('login_lockout_duration', '900', 'Account lockout duration in seconds (15 minutes)', 'security', false),
    ('session_timeout', '86400', 'User session timeout in seconds (24 hours)', 'security', false),
    ('password_min_length', '8', 'Minimum password length', 'security', false),
    ('password_complexity', 'true', 'Require complex passwords', 'security', false),
    ('two_factor_required', 'false', 'Require 2FA for all users', 'security', false),
    ('signal_retention_days', '90', 'Days to keep completed/expired signals', 'signals', false),
    ('max_signals_per_day', '50', 'Maximum signals that can be created per day', 'signals', false),
    ('chat_message_retention_days', '30', 'Days to keep chat messages', 'chat', false),
    ('max_chat_messages_per_minute', '10', 'Rate limit for chat messages', 'chat', false),
    ('notification_retention_days', '30', 'Days to keep read notifications', 'notifications', false),
    ('max_profile_picture_size', '5242880', 'Maximum profile picture size in bytes (5MB)', 'uploads', false),
    ('allowed_image_types', '["image/jpeg", "image/png", "image/gif", "image/webp"]', 'Allowed image file types', 'uploads', false),
    ('default_currency', '"USD"', 'Default currency for pricing', 'payments', true),
    ('trial_period_days', '7', 'Free trial period in days', 'subscriptions', false),
    ('grace_period_days', '3', 'Grace period for failed payments', 'subscriptions', false);

-- =========================================
-- SAMPLE DISCOUNT CODES
-- =========================================
INSERT INTO discounts (code, name, description, type, value, minimum_amount, maximum_discount, applicable_tiers, usage_limit, user_limit, is_active, starts_at, expires_at) VALUES
    ('WELCOME10', 'Welcome Discount', '10% off for new users - Limited time offer', 'percentage', 10, 0, 50, 
     ARRAY['gold', 'platinum', 'diamond'], 1000, 1, true, NOW(), NOW() + INTERVAL '30 days'),
    ('SAVE25', 'Premium Upgrade', '25% off premium memberships', 'percentage', 25, 50, 100, 
     ARRAY['platinum', 'diamond'], 500, 1, true, NOW(), NOW() + INTERVAL '60 days'),
    ('DIAMOND50', 'Diamond Special', '$50 off Diamond membership', 'fixed', 50, 99, 50, 
     ARRAY['diamond'], 100, 1, true, NOW(), NOW() + INTERVAL '90 days'),
    ('BLACKFRIDAY', 'Black Friday Special', '40% off all memberships', 'percentage', 40, 0, 200, 
     ARRAY['gold', 'platinum', 'diamond'], 2000, 1, false, NOW(), NOW() + INTERVAL '7 days'),
    ('STUDENT15', 'Student Discount', '15% off for students', 'percentage', 15, 0, 30, 
     ARRAY['gold', 'platinum'], 500, 1, true, NOW(), NOW() + INTERVAL '365 days'),
    ('LOYALTY20', 'Loyalty Reward', '20% off for returning customers', 'percentage', 20, 0, 60, 
     ARRAY['gold', 'platinum', 'diamond'], 300, 1, true, NOW(), NOW() + INTERVAL '180 days');

-- =========================================
-- SAMPLE TRADING SIGNALS (FOR DEMO)
-- =========================================
INSERT INTO trading_signals (title, description, signal_type, symbol, action, entry_price, stop_loss, take_profit, risk_level, confidence, tier_access, priority, status, author_id, tags) VALUES
    ('EUR/USD Long Setup', 'Strong bullish momentum with RSI oversold bounce. Good risk-reward ratio.', 'forex', 'EURUSD', 'buy', 1.0950, 1.0920, 1.1020, 'medium', 85, 
     ARRAY['gold', 'platinum', 'diamond'], 1, 'active', NULL, ARRAY['forex', 'major', 'bullish']),
    ('GBP/USD Short Signal', 'Bearish divergence on 4H chart. Expecting pullback to support level.', 'forex', 'GBPUSD', 'sell', 1.2650, 1.2690, 1.2580, 'medium', 78, 
     ARRAY['gold', 'platinum', 'diamond'], 1, 'active', NULL, ARRAY['forex', 'major', 'bearish']),
    ('Bitcoin Breakout', 'BTC breaking above key resistance. Momentum building for next leg up.', 'crypto', 'BTCUSD', 'buy', 45000, 43500, 48000, 'high', 82, 
     ARRAY['platinum', 'diamond'], 2, 'active', NULL, ARRAY['crypto', 'bitcoin', 'breakout']),
    ('Gold Support Play', 'Gold holding strong support level. Good opportunity for bounce trade.', 'commodities', 'XAUUSD', 'buy', 1985, 1975, 2010, 'low', 75, 
     ARRAY['diamond'], 1, 'active', NULL, ARRAY['gold', 'commodities', 'support']),
    ('USD/JPY Range Trade', 'Trading within established range. Selling at resistance.', 'forex', 'USDJPY', 'sell', 149.50, 150.20, 148.80, 'low', 72, 
     ARRAY['gold', 'platinum', 'diamond'], 1, 'active', NULL, ARRAY['forex', 'range', 'yen']),
    ('Ethereum Momentum', 'ETH showing strong momentum after consolidation. Multiple targets.', 'crypto', 'ETHUSD', 'buy', 2500, 2420, 2650, 'medium', 88, 
     ARRAY['platinum', 'diamond'], 2, 'active', NULL, ARRAY['crypto', 'ethereum', 'momentum']);

-- =========================================
-- SAMPLE NOTIFICATIONS TEMPLATES
-- =========================================
INSERT INTO notification_templates (name, title, message, type, category) VALUES
    ('welcome_new_user', 'Welcome to Traders Helmet Academy!', 'Welcome {{user_name}}! We''re excited to have you join our trading community. Start exploring our signals and tools.', 'info', 'onboarding'),
    ('signal_new', 'New Trading Signal', 'New {{signal_type}} signal for {{symbol}}: {{action}} at {{entry_price}}', 'signal', 'trading'),
    ('signal_closed', 'Signal Closed', 'Your {{symbol}} signal has been closed with {{result}}: {{pips_gained}} pips', 'success', 'trading'),
    ('subscription_upgraded', 'Subscription Upgraded', 'Congratulations! Your subscription has been upgraded to {{tier_name}}', 'success', 'billing'),
    ('subscription_expiring', 'Subscription Expiring Soon', 'Your {{tier_name}} subscription expires in {{days_remaining}} days. Renew now to continue access.', 'warning', 'billing'),
    ('payment_successful', 'Payment Processed', 'Your payment of {{amount}} {{currency}} has been processed successfully', 'success', 'billing'),
    ('payment_failed', 'Payment Failed', 'We couldn''t process your payment. Please update your payment method.', 'error', 'billing'),
    ('security_login', 'New Login Detected', 'New login to your account from {{location}} on {{device}}', 'info', 'security'),
    ('security_2fa_enabled', '2FA Enabled', 'Two-factor authentication has been enabled for your account', 'success', 'security'),
    ('support_ticket_created', 'Support Ticket Created', 'Your support ticket #{{ticket_id}} has been created. We''ll respond within 24 hours.', 'info', 'support'),
    ('support_ticket_resolved', 'Support Ticket Resolved', 'Your support ticket #{{ticket_id}} has been resolved. Please rate your experience.', 'success', 'support');

-- =========================================
-- SAMPLE ADMIN USER (FOR DEVELOPMENT)
-- Note: This should be removed or changed in production
-- =========================================
-- INSERT INTO user_profiles (id, email, first_name, last_name, tier, role, status, email_verified, created_at) VALUES
--     ('00000000-0000-0000-0000-000000000001', 'admin@tradershelmet.com', 'Admin', 'User', 'diamond', 'admin', 'active', true, NOW());

-- =========================================
-- SAMPLE TRADING STATISTICS
-- =========================================
INSERT INTO market_statistics (metric_name, metric_value, category, period, updated_at) VALUES
    ('total_signals_sent', '1247', 'signals', 'all_time', NOW()),
    ('successful_signals', '956', 'signals', 'all_time', NOW()),
    ('total_pips_gained', '15420', 'performance', 'all_time', NOW()),
    ('average_success_rate', '76.8', 'performance', 'monthly', NOW()),
    ('active_users', '342', 'users', 'current', NOW()),
    ('premium_subscribers', '189', 'subscriptions', 'current', NOW()),
    ('forex_signals_success', '78.2', 'performance', 'monthly', NOW()),
    ('crypto_signals_success', '74.1', 'performance', 'monthly', NOW()),
    ('user_satisfaction', '4.6', 'ratings', 'monthly', NOW()),
    ('average_monthly_growth', '12.3', 'business', 'monthly', NOW());

-- =========================================
-- SAMPLE HELP ARTICLES / FAQ
-- =========================================
INSERT INTO help_articles (title, content, category, tags, is_published, created_at) VALUES
    ('How to Read Trading Signals', 'Trading signals provide you with specific entry, stop loss, and take profit levels for various financial instruments. Here''s how to interpret them...', 'trading', ARRAY['signals', 'beginner'], true, NOW()),
    ('Understanding Risk Management', 'Risk management is crucial for successful trading. Never risk more than 2% of your account on a single trade...', 'education', ARRAY['risk', 'money-management'], true, NOW()),
    ('Setting Up Two-Factor Authentication', 'Secure your account with 2FA. Follow these steps to enable two-factor authentication...', 'account', ARRAY['security', '2fa'], true, NOW()),
    ('Subscription Billing FAQ', 'Common questions about billing, upgrades, and subscription management...', 'billing', ARRAY['subscription', 'payment'], true, NOW()),
    ('Mobile App Features', 'Get the most out of our mobile app with push notifications, offline charts, and more...', 'mobile', ARRAY['app', 'features'], true, NOW()),
    ('Chart Analysis Basics', 'Learn the fundamentals of technical analysis including support, resistance, and trend lines...', 'education', ARRAY['charts', 'technical-analysis'], true, NOW());

-- =========================================
-- INITIAL REFERRAL SYSTEM SETUP
-- =========================================
INSERT INTO referral_rewards (reward_type, reward_value, currency, description, min_referrals, is_active) VALUES
    ('percentage_discount', 20, 'USD', '20% discount on next subscription for each successful referral', 1, true),
    ('fixed_credit', 15, 'USD', '$15 account credit for each successful referral', 1, true),
    ('free_month', 1, 'months', 'Free month of current subscription tier', 3, true),
    ('tier_upgrade', 1, 'tier', 'Free tier upgrade for 1 month', 5, true);

-- =========================================
-- EMAIL TEMPLATES
-- =========================================
INSERT INTO email_templates (name, subject, html_body, text_body, template_type, is_active) VALUES
    ('welcome_email', 'Welcome to Traders Helmet Academy', 
     '<h1>Welcome {{first_name}}!</h1><p>We''re excited to have you join our community of successful traders...</p>', 
     'Welcome {{first_name}}! We''re excited to have you join our community...', 'transactional', true),
    ('signal_alert', 'New Trading Signal Alert', 
     '<h2>New {{signal_type}} Signal</h2><p><strong>{{symbol}}</strong>: {{action}} at {{entry_price}}</p>', 
     'New {{signal_type}} Signal: {{symbol}} {{action}} at {{entry_price}}', 'notification', true),
    ('subscription_reminder', 'Subscription Renewal Reminder', 
     '<h2>Your subscription expires soon</h2><p>Renew your {{tier_name}} subscription to continue receiving signals...</p>', 
     'Your {{tier_name}} subscription expires in {{days_remaining}} days. Renew now to continue access.', 'billing', true),
    ('password_reset', 'Reset Your Password', 
     '<h2>Password Reset Request</h2><p>Click the link below to reset your password...</p>', 
     'Reset your password by clicking this link: {{reset_link}}', 'security', true);

-- =========================================
-- PERFORMANCE TRACKING SETUP
-- =========================================
INSERT INTO performance_metrics (metric_name, current_value, target_value, unit, category, updated_at) VALUES
    ('monthly_active_users', 342, 500, 'users', 'engagement', NOW()),
    ('signal_accuracy', 76.8, 80.0, 'percentage', 'trading', NOW()),
    ('customer_satisfaction', 4.6, 4.8, 'rating', 'service', NOW()),
    ('subscription_retention', 89.2, 90.0, 'percentage', 'business', NOW()),
    ('support_response_time', 4.2, 2.0, 'hours', 'support', NOW()),
    ('platform_uptime', 99.7, 99.9, 'percentage', 'technical', NOW());

-- =========================================
-- INDEXES FOR BETTER PERFORMANCE
-- =========================================
-- Additional indexes for seed data queries
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier_level ON subscription_plans(tier_level);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_billing_cycle ON subscription_plans(billing_cycle);
CREATE INDEX IF NOT EXISTS idx_discounts_code_active ON discounts(code, is_active);
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol_status ON trading_signals(symbol, status);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- =========================================
-- HELPFUL VIEWS FOR COMMON QUERIES
-- =========================================
CREATE OR REPLACE VIEW active_subscription_plans AS
SELECT * FROM subscription_plans 
WHERE is_active = true 
ORDER BY tier_level;

CREATE OR REPLACE VIEW active_discounts AS
SELECT * FROM discounts 
WHERE is_active = true 
AND (starts_at IS NULL OR starts_at <= NOW()) 
AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY value DESC;

CREATE OR REPLACE VIEW recent_signals AS
SELECT * FROM trading_signals 
WHERE status = 'active' 
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- =========================================
-- GRANT PERMISSIONS (adjust based on your setup)
-- =========================================
-- GRANT SELECT ON active_subscription_plans TO authenticated;
-- GRANT SELECT ON active_discounts TO authenticated;
-- GRANT SELECT ON recent_signals TO authenticated;

COMMENT ON TABLE subscription_plans IS 'Available subscription tiers and pricing';
COMMENT ON TABLE chat_rooms IS 'Pre-configured chat rooms by tier access';
COMMENT ON TABLE system_settings IS 'Configurable system settings and limits';
COMMENT ON TABLE discounts IS 'Available discount codes and promotions';
COMMENT ON TABLE trading_signals IS 'Sample trading signals for demo purposes';

-- Note: Remember to update or remove sample data before production deployment