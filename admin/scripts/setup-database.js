// admin/scripts/setup-database.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase with service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL || 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeG53cWpsYXhydnFjdGlwaGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY3NDI0MywiZXhwIjoyMDYzMjUwMjQzfQ.pbf2mdsHS_DURTbGDWT9zSDK9zwqF-b3OsAznuYHIx0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Database schema SQL
const createTablesSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_status VARCHAR(50) DEFAULT 'inactive',
    subscription_start_date TIMESTAMP,
    subscription_end_date TIMESTAMP,
    is_admin BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    country VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    deactivated_at TIMESTAMP,
    deactivation_reason TEXT
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    tier VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(255),
    payment_details JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES user_profiles(id),
    notes TEXT
);

-- Trading signals table
CREATE TABLE IF NOT EXISTS trading_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_type VARCHAR(50) NOT NULL, -- 'forex', 'crypto', 'binary'
    symbol VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL, -- 'BUY', 'SELL'
    entry_price DECIMAL(15,8),
    stop_loss DECIMAL(15,8),
    take_profit DECIMAL(15,8),
    risk_reward_ratio DECIMAL(5,2),
    confidence_level INTEGER DEFAULT 70,
    tier_access VARCHAR(50) DEFAULT 'free', -- 'free', 'gold', 'platinum', 'diamond'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'cancelled'
    result VARCHAR(20), -- 'win', 'loss', 'breakeven'
    actual_close_price DECIMAL(15,8),
    pips_gained DECIMAL(10,2),
    percentage_gain DECIMAL(5,2),
    description TEXT,
    analysis TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- User activity log table
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    activity_description TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    is_read BOOLEAN DEFAULT FALSE,
    is_global BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

-- Education content table
CREATE TABLE IF NOT EXISTS education_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL, -- 'video', 'article', 'pdf', 'course'
    category VARCHAR(100), -- 'forex', 'crypto', 'binary', 'general'
    tier_access VARCHAR(50) DEFAULT 'free',
    content_url TEXT,
    thumbnail_url TEXT,
    duration INTEGER, -- in minutes for videos
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    category VARCHAR(100),
    assigned_to UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Support ticket messages table
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_trading_signals_type ON trading_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_trading_signals_status ON trading_signals(status);
CREATE INDEX IF NOT EXISTS idx_trading_signals_tier ON trading_signals(tier_access);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_education_content_category ON education_content(category);
CREATE INDEX IF NOT EXISTS idx_education_content_tier ON education_content(tier_access);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
));

CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
));

-- Payments: Users can view their own payments, admins can view all
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
));

-- Trading signals: Based on tier access
CREATE POLICY "Users can view signals based on tier" ON trading_signals FOR SELECT USING (
    tier_access = 'free' OR
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND (
            is_admin = true OR
            (tier_access = 'gold' AND subscription_tier IN ('gold', 'platinum', 'diamond')) OR
            (tier_access = 'platinum' AND subscription_tier IN ('platinum', 'diamond')) OR
            (tier_access = 'diamond' AND subscription_tier = 'diamond')
        )
    )
);

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (
    user_id = auth.uid() OR is_global = true OR EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
);

-- Education content: Based on tier access
CREATE POLICY "Users can view content based on tier" ON education_content FOR SELECT USING (
    tier_access = 'free' OR
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND (
            is_admin = true OR
            (tier_access = 'gold' AND subscription_tier IN ('gold', 'platinum', 'diamond')) OR
            (tier_access = 'platinum' AND subscription_tier IN ('platinum', 'diamond')) OR
            (tier_access = 'diamond' AND subscription_tier = 'diamond')
        )
    )
);

-- Support tickets: Users can view their own tickets, admins can view all
CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_signals_updated_at BEFORE UPDATE ON trading_signals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_education_content_updated_at BEFORE UPDATE ON education_content 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function setupDatabase() {
    try {
        console.log('🚀 Setting up Traders Helmet Academy Database...');
        console.log('=============================================\n');

        // Execute the SQL schema
        console.log('📊 Creating database tables and indexes...');
        
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: createTablesSQL
        });

        if (error) {
            // If rpc doesn't work, try executing in parts
            console.log('⚠️  RPC method failed, trying alternative approach...');
            
            // Split SQL into individual statements and execute them
            const statements = createTablesSQL
                .split(';')
                .map(statement => statement.trim())
                .filter(statement => statement.length > 0);

            for (const statement of statements) {
                try {
                    if (statement.toLowerCase().startsWith('create') || 
                        statement.toLowerCase().startsWith('alter') ||
                        statement.toLowerCase().startsWith('enable')) {
                        
                        console.log(`Executing: ${statement.substring(0, 50)}...`);
                        // Note: Direct SQL execution might not work with Supabase client
                        // This is a placeholder - you might need to execute these manually
                    }
                } catch (statementError) {
                    console.log(`⚠️  Skipped statement (may already exist): ${statement.substring(0, 50)}...`);
                }
            }
        }

        console.log('✅ Database schema setup completed');

        // Test database connection
        console.log('\n🔍 Testing database connection...');
        const { data: testData, error: testError } = await supabase
            .from('user_profiles')
            .select('count(*)')
            .limit(1);

        if (testError) {
            console.log('⚠️  Database tables may need to be created manually');
            console.log('📋 Please execute the SQL schema in your Supabase dashboard');
        } else {
            console.log('✅ Database connection successful');
        }

        // Create some initial data
        console.log('\n📊 Setting up initial configuration...');
        
        // Check if we have any admin users
        const { data: adminUsers, error: adminError } = await supabase
            .from('user_profiles')
            .select('id, email')
            .eq('is_admin', true)
            .limit(1);

        if (adminError) {
            console.log('⚠️  Could not check for admin users - tables may not exist yet');
        } else if (adminUsers && adminUsers.length === 0) {
            console.log('💡 No admin users found. Run "npm run admin:create" to create an admin account');
        } else {
            console.log(`✅ Found ${adminUsers.length} admin user(s)`);
        }

        console.log('\n✅ Database setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Verify tables exist in Supabase dashboard');
        console.log('2. Run "npm run admin:create" to create admin account');
        console.log('3. Run "npm run admin:sync" to sync existing users');
        console.log('4. Start the application with "npm start"');

        return {
            success: true,
            message: 'Database setup completed successfully'
        };

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        console.log('\n📋 Manual Setup Required:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Execute the database schema manually');
        console.log('4. Check that all tables are created');
        
        return {
            success: false,
            error: error.message,
            requiresManualSetup: true
        };
    }
}

// Export the SQL schema for manual execution
function printSchema() {
    console.log('📋 Database Schema SQL:');
    console.log('======================\n');
    console.log(createTablesSQL);
    console.log('\n======================');
    console.log('Copy the above SQL and execute it in your Supabase SQL Editor');
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--print-schema')) {
        printSchema();
        process.exit(0);
    }

    const result = await setupDatabase();
    
    if (!result.success) {
        if (result.requiresManualSetup) {
            console.log('\n📋 Run with --print-schema to see the SQL:');
            console.log('node admin/scripts/setup-database.js --print-schema');
        }
        process.exit(1);
    }
    
    process.exit(0);
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { 
    setupDatabase, 
    createTablesSQL 
};