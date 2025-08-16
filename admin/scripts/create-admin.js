// =========================================
// 1. ADMIN ACCOUNT CREATION (Server-side)
// =========================================

// Node.js script to create admin accounts
const adminAccountCreator = `
// create-admin.js - Run this script to create admin accounts

const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-admin-key.json'); // Download from Firebase Console
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Supabase with service role key
const supabase = createClient(
  'https://vjxnwqjlaxrvqctiphhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeG53cWpsYXhydnFjdGlwaGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY3NDI0MywiZXhwIjoyMDYzMjUwMjQzfQ.pbf2mdsHS_DURTbGDWT9zSDK9zwqF-b3OsAznuYHIx0'
);

async function createAdminAccount(email, password, firstName, lastName) {
  try {
    console.log('Creating admin account for:', email);
    
    // 1. Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: true,
      displayName: \`\${firstName} \${lastName}\`
    });
    
    console.log('✅ Firebase user created:', userRecord.uid);
    
    // 2. Set custom claims for admin role
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      tier: 'admin',
      permissions: ['user_management', 'content_management', 'analytics', 'system_admin']
    });
    
    console.log('✅ Admin claims set for user');
    
    // 3. Create profile in Supabase
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{
        id: userRecord.uid,
        email: email,
        first_name: firstName,
        last_name: lastName,
        tier: 'admin',
        role: 'admin',
        status: 'active',
        email_verified: true,
        created_at: new Date().toISOString()
      }]);
    
    if (error) {
      console.error('❌ Supabase profile creation failed:', error);
      // Cleanup Firebase user if Supabase fails
      await admin.auth().deleteUser(userRecord.uid);
      throw error;
    }
    
    console.log('✅ Supabase profile created');
    
    // 4. Log admin creation activity
    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: userRecord.uid,
        action: 'admin_account_created',
        metadata: {
          created_by: 'system',
          email: email,
          timestamp: new Date().toISOString()
        }
      }]);
    
    console.log('🎉 Admin account created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('UID:', userRecord.uid);
    
    return {
      success: true,
      uid: userRecord.uid,
      email: email
    };
    
  } catch (error) {
    console.error('❌ Admin account creation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Create the first admin account
async function createFirstAdmin() {
  const result = await createAdminAccount(
    'admin@tradershelmetacademy.com',    // Admin email
    'THA-Admin2024!',                    // Secure password
    'System',                            // First name
    'Administrator'                      // Last name
  );
  
  if (result.success) {
    console.log('🚀 First admin account created successfully!');
    console.log('You can now log in to the admin dashboard.');
  } else {
    console.error('Failed to create admin account:', result.error);
  }
  
  process.exit(0);
}

// Run the admin creation
createFirstAdmin();
`;
