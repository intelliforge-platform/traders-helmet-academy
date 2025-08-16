// test-admin.js
console.log('🚀 Starting admin creation test...');

try {
    require('dotenv').config();
    console.log('✅ Environment loaded');
    
    console.log('📧 Testing environment variables...');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET');
    console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET');
    
    console.log('\n🔄 Testing Supabase import...');
    const { createClient } = require('@supabase/supabase-js');
    console.log('✅ Supabase imported');
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeG53cWpsYXhydnFjdGlwaGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY3NDI0MywiZXhwIjoyMDYzMjUwMjQzfQ.pbf2mdsHS_DURTbGDWT9zSDK9zwqF-b3OsAznuYHIx0';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client created');
    
    console.log('\n🔄 Testing Supabase connection...');
    supabase.from('user_profiles').select('count(*)').limit(1).then(result => {
        if (result.error) {
            console.log('⚠️ Supabase connection error:', result.error.message);
            console.log('💡 This likely means database tables don\'t exist yet');
            console.log('📋 You need to create the database schema first');
        } else {
            console.log('✅ Supabase connection successful');
            console.log('📊 Found user_profiles table');
        }
        
        console.log('\n🔄 Now testing Firebase import (this might hang)...');
        
        try {
            const admin = require('firebase-admin');
            console.log('✅ Firebase Admin imported successfully');
            
            // Don't initialize Firebase here, just test import
            console.log('\n✅ All imports successful!');
            console.log('💡 The hanging issue is likely in Firebase initialization');
            
        } catch (firebaseError) {
            console.log('❌ Firebase import failed:', firebaseError.message);
        }
        
        console.log('\n=== DIAGNOSIS COMPLETE ===');
        process.exit(0);
        
    }).catch(error => {
        console.error('❌ Supabase test failed:', error.message);
        console.log('💡 Check your internet connection and Supabase credentials');
        process.exit(1);
    });
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}