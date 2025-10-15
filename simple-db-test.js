// simple-db-test.js
console.log('🚀 Testing database connection...');

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeG53cWpsYXhydnFjdGlwaGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY3NDI0MywiZXhwIjoyMDYzMjUwMjQzfQ.pbf2mdsHS_DURTbGDWT9zSDK9zwqF-b3OsAznuYHIx0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabase() {
    try {
        console.log('🔄 Testing simple connection...');
        
        // Try to get any data from user_profiles table
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('❌ Table does not exist or error:', error.message);
            console.log('💡 Need to create database schema');
            
            // Try to list all tables to see what exists
            console.log('\n🔄 Checking what tables exist...');
            const { data: tables, error: tableError } = await supabase
                .rpc('get_tables'); // This might not work
            
            if (tableError) {
                console.log('⚠️ Cannot check tables, you need to create the schema manually');
            } else {
                console.log('📊 Existing tables:', tables);
            }
            
        } else {
            console.log('✅ Database connection successful!');
            console.log('📊 Found', data.length, 'records in user_profiles');
            console.log('🎉 Database is ready for admin creation!');
        }
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
    }
    
    process.exit(0);
}

testDatabase();