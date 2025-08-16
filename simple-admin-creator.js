// simple-admin-creator.js
console.log('🚀 Creating admin account (Supabase only)...');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeG53cWpsYXhydnFjdGlwaGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY3NDI0MywiZXhwIjoyMDYzMjUwMjQzfQ.pbf2mdsHS_DURTbGDWT9zSDK9zwqF-b3OsAznuYHIx0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSimpleAdmin() {
    try {
        const adminEmail = 'admin@tradershelmetacademy.com';
        const adminName = 'System Administrator';
        
        console.log('📧 Creating admin account for:', adminEmail);
        console.log('👤 Name:', adminName);
        
        // Check if admin already exists
        const { data: existingAdmin, error: checkError } = await supabase
            .from('user_profiles')
            .select('id, email, is_admin')
            .eq('email', adminEmail)
            .single();
        
        if (existingAdmin) {
            if (existingAdmin.is_admin) {
                console.log('⚠️ Admin account already exists!');
                console.log('📧 Email:', existingAdmin.email);
                console.log('🆔 ID:', existingAdmin.id);
                console.log('✅ You can already login with this account');
                return {
                    success: true,
                    message: 'Admin account already exists',
                    adminId: existingAdmin.id
                };
            } else {
                // Update existing user to admin
                console.log('🔄 Updating existing user to admin...');
                const { data: updatedUser, error: updateError } = await supabase
                    .from('user_profiles')
                    .update({
                        is_admin: true,
                        role: 'admin',
                        subscription_tier: 'admin',
                        subscription_status: 'active',
                        updated_at: new Date().toISOString()
                    })
                    .eq('email', adminEmail)
                    .select()
                    .single();
                
                if (updateError) {
                    throw updateError;
                }
                
                console.log('✅ User updated to admin successfully!');
                console.log('🆔 Admin ID:', updatedUser.id);
                return {
                    success: true,
                    message: 'User updated to admin',
                    adminId: updatedUser.id
                };
            }
        }
        
        // Create new admin user
        console.log('🔄 Creating new admin user...');
        const { data: newAdmin, error: createError } = await supabase
            .from('user_profiles')
            .insert([
                {
                    email: adminEmail,
                    full_name: adminName,
                    role: 'admin',
                    subscription_tier: 'admin',
                    subscription_status: 'active',
                    is_admin: true,
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (createError) {
            throw createError;
        }
        
        console.log('✅ Admin user created successfully!');
        console.log('🆔 Admin ID:', newAdmin.id);
        
        // Log the admin creation activity
        try {
            await supabase
                .from('user_activity_log')
                .insert([
                    {
                        user_id: newAdmin.id,
                        activity_type: 'admin_account_created',
                        activity_description: `Admin account created for ${adminEmail}`,
                        metadata: { 
                            created_by: 'system',
                            method: 'simple_creator'
                        },
                        created_at: new Date().toISOString()
                    }
                ]);
            console.log('📝 Activity logged');
        } catch (logError) {
            console.log('⚠️ Activity logging failed (table might not exist)');
        }
        
        return {
            success: true,
            message: 'Admin account created successfully',
            adminId: newAdmin.id
        };
        
    } catch (error) {
        console.error('❌ Admin creation failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function main() {
    console.log('🏛️ TRADERS HELMET ACADEMY');
    console.log('========================');
    console.log('🔧 Simple Admin Creator (Database Only)');
    console.log('');
    
    const result = await createSimpleAdmin();
    
    if (result.success) {
        console.log('\n🎉 SUCCESS!');
        console.log('==================');
        console.log('✅ Admin account is ready');
        console.log('📧 Email: admin@tradershelmetacademy.com');
        console.log('🆔 User ID:', result.adminId);
        console.log('');
        console.log('🔑 NEXT STEPS:');
        console.log('1. Go to Firebase Console');
        console.log('2. Create a user with email: admin@tradershelmetacademy.com');
        console.log('3. Set a password for this user');
        console.log('4. Use the same User ID if possible');
        console.log('5. Login at: /pages/auth/login.html');
        console.log('');
        console.log('🌐 Or try the web interface to complete setup');
        
    } else {
        console.log('\n❌ FAILED!');
        console.log('Error:', result.error);
        console.log('');
        console.log('🔧 Try running the database setup first:');
        console.log('npm run db:setup');
    }
    
    process.exit(result.success ? 0 : 1);
}

// Run the script
main().catch(console.error);