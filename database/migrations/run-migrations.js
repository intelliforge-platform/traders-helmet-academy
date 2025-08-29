// database/migrations/run-migrations.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
    try {
        console.log('🚀 Running database migrations...');
        
        const migrationsDir = path.join(__dirname);
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql') && file !== 'run-migrations.js')
            .sort();
        
        console.log(`📋 Found ${migrationFiles.length} migration files`);
        
        for (const file of migrationFiles) {
            console.log(`🔄 Processing migration: ${file}`);
            
            const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            
            // Note: Supabase doesn't support direct SQL execution via client
            // This is a placeholder - you'll need to run these manually
            console.log(`📋 Please execute ${file} manually in Supabase SQL Editor`);
        }
        
        console.log('✅ Migration process completed');
        console.log('💡 Note: Execute SQL files manually in Supabase dashboard');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runMigrations();
}

module.exports = { runMigrations };