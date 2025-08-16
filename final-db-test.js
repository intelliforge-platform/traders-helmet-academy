// final-db-test.js
console.log('🚀 Final database test with correct syntax...');

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeG53cWpsYXhydnFjdGlwaGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY3NDI0MywiZXhwIjoyMDYzMjUwMjQzfQ.pbf2mdsHS_DURTbGDWT9zSDK9zwqF-b3OsAznuYHIx0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalTest() {
    try {
        console.log('🔄 Testing user_profiles table access...');
        
        // Use proper select syntax
        const { data, error } = await supabase
            .from('user_profiles')
            .select('id, email, role, is_admin, subscription_status')
            .limit(10);
        
        if (error) {
            console.log('❌ Error:', error.message);
            console.log('🔧 Possible issues:');
            console.log('  - RLS policies are blocking access');
            console.log('  - Service key permissions');
            console.log('  - Table permissions');
        } else {
            console.log('✅ SUCCESS! Database connection working!');
            console.log('📊 Records found:', data.length);
            
            if (data.length > 0) {
                console.log('\n📋 Sample records:');
                data.forEach((user, index) => {
                    console.log(`  ${index + 1}. ${user.email} - Role: ${user.role} - Admin: ${user.is_admin} - Status: ${user.subscription_status}`);
                });
                
                // Check for existing admins
                const adminCount = data.filter(user => user.is_admin === true).length;
                console.log(`\n👑 Admin users found: ${adminCount}`);
                
                if (adminCount === 0) {
                    console.log('💡 Ready to create first admin account!');
                } else {
                    console.log('⚠️ Admin users already exist');
                }
            } else {
                console.log('📝 No users found - table is empty, ready for admin creation');
            }
        }
        
        // Test insert capability (this is what admin creation needs)
        console.log('\n🔄 Testing insert capability...');
        const testEmail = `test-${Date.now()}@example.com`;
        
        const { data: insertData, error: insertError } = await supabase
            .from('user_profiles')
            .insert([
                {
                    email: testEmail,
                    full_name: 'Test User',
                    role: 'user',
                    is_admin: false,
                    subscription_tier: 'free',
                    subscription_status: 'inactive'
                }
            ])
            .select();
        
        if (insertError) {
            console.log('❌ Insert test failed:', insertError.message);
            console.log('💡 This will prevent admin creation from working');
        } else {
            console.log('✅ Insert test successful!');
            
            // Clean up test record
            await supabase
                .from('user_profiles')
                .delete()
                .eq('email', testEmail);
            
            console.log('🧹 Test record cleaned up');
        }
        
        console.log('\n🎯 FINAL STATUS:');
        console.log('================');
        console.log(error ? '❌' : '✅', 'Table access:', error ? 'FAILED' : 'WORKING');
        console.log(insertError ? '❌' : '✅', 'Insert capability:', insertError ? 'FAILED' : 'WORKING');
        
        if (!error && !insertError) {
            console.log('\n🚀 READY FOR ADMIN CREATION!');
            console.log('Run: npm run admin:create');
        } else {
            console.log('\n🔧 NEXT STEPS:');
            console.log('1. Check RLS policies in Supabase dashboard');
            console.log('2. Verify service key permissions');
            console.log('3. Try admin creation anyway - it might still work');
        }
        
    } catch (error) {
        console.error('❌ Test failed completely:', error.message);
    }
    
    process.exit(0);
}

finalTest();