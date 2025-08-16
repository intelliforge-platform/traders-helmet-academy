// admin/scripts/sync-users.js
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  "type": "service_account",
  "project_id": "traders-helmet-academy",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID || "your-private-key-id",
  "private_key": process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  "client_email": process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-xxxxx@traders-helmet-academy.iam.gserviceaccount.com",
  "client_id": process.env.FIREBASE_CLIENT_ID || "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CERT_URL || "your-cert-url"
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://traders-helmet-academy-default-rtdb.firebaseio.com"
  });
}

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeG53cWpsYXhydnFjdGlwaGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY3NDI0MywiZXhwIjoyMDYzMjUwMjQzfQ.pbf2mdsHS_DURTbGDWT9zSDK9zwqF-b3OsAznuYHIx0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncUsersFromFirebaseToSupabase() {
  try {
    console.log('🔄 Starting user synchronization...');
    
    // Get all users from Firebase
    const listUsersResult = await admin.auth().listUsers();
    const firebaseUsers = listUsersResult.users;
    
    console.log(`📊 Found ${firebaseUsers.length} users in Firebase`);
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const user of firebaseUsers) {
      try {
        // Check if user already exists in Supabase
        const { data: existingUser, error: fetchError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.uid)
          .single();
        
        if (existingUser) {
          console.log(`⏭️  User ${user.email} already exists, skipping...`);
          continue;
        }
        
        // Get custom claims
        const userRecord = await admin.auth().getUser(user.uid);
        const customClaims = userRecord.customClaims || {};
        
        // Create user profile in Supabase
        const { data, error } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: user.uid,
              email: user.email,
              full_name: user.displayName || user.email.split('@')[0],
              role: customClaims.role || 'user',
              subscription_tier: customClaims.role === 'admin' ? 'admin' : 'free',
              subscription_status: customClaims.role === 'admin' ? 'active' : 'inactive',
              created_at: user.metadata.creationTime,
              last_login: user.metadata.lastSignInTime || user.metadata.creationTime,
              is_admin: customClaims.isAdmin || false,
              email_verified: user.emailVerified
            }
          ]);
        
        if (error) {
          console.error(`❌ Error syncing user ${user.email}:`, error);
          errorCount++;
        } else {
          console.log(`✅ Synced user: ${user.email}`);
          syncedCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (userError) {
        console.error(`❌ Error processing user ${user.email}:`, userError);
        errorCount++;
      }
    }
    
    console.log('\n📊 Synchronization Summary:');
    console.log(`✅ Successfully synced: ${syncedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${firebaseUsers.length} users`);
    
    return {
      success: true,
      synced: syncedCount,
      errors: errorCount,
      total: firebaseUsers.length
    };
    
  } catch (error) {
    console.error('❌ Synchronization failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function syncUsersFromSupabaseToFirebase() {
  try {
    console.log('🔄 Starting reverse sync (Supabase to Firebase)...');
    
    // Get all users from Supabase
    const { data: supabaseUsers, error } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    console.log(`📊 Found ${supabaseUsers.length} users in Supabase`);
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const user of supabaseUsers) {
      try {
        // Check if user exists in Firebase
        let firebaseUser;
        try {
          firebaseUser = await admin.auth().getUser(user.id);
        } catch (notFoundError) {
          // User doesn't exist in Firebase, skip
          console.log(`⏭️  User ${user.email} not found in Firebase, skipping...`);
          continue;
        }
        
        // Update custom claims if needed
        const customClaims = firebaseUser.customClaims || {};
        const shouldUpdate = (
          customClaims.role !== user.role ||
          customClaims.isAdmin !== user.is_admin
        );
        
        if (shouldUpdate) {
          await admin.auth().setCustomUserClaims(user.id, {
            role: user.role,
            isAdmin: user.is_admin,
            subscriptionTier: user.subscription_tier,
            permissions: user.is_admin ? ['user_management', 'payment_management', 'signal_management'] : []
          });
          
          console.log(`✅ Updated claims for: ${user.email}`);
          syncedCount++;
        } else {
          console.log(`⏭️  Claims up-to-date for: ${user.email}`);
        }
        
      } catch (userError) {
        console.error(`❌ Error processing user ${user.email}:`, userError);
        errorCount++;
      }
    }
    
    console.log('\n📊 Reverse Sync Summary:');
    console.log(`✅ Successfully updated: ${syncedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    
    return {
      success: true,
      updated: syncedCount,
      errors: errorCount
    };
    
  } catch (error) {
    console.error('❌ Reverse sync failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main execution
async function main() {
  console.log('🚀 Traders Helmet Academy - User Synchronization');
  console.log('===============================================\n');
  
  const args = process.argv.slice(2);
  const direction = args[0] || 'firebase-to-supabase';
  
  console.log(`🔄 Sync direction: ${direction}\n`);
  
  let result;
  
  if (direction === 'firebase-to-supabase' || direction === 'both') {
    result = await syncUsersFromFirebaseToSupabase();
    
    if (!result.success) {
      console.error('❌ Firebase to Supabase sync failed');
      process.exit(1);
    }
  }
  
  if (direction === 'supabase-to-firebase' || direction === 'both') {
    console.log('\n' + '='.repeat(50) + '\n');
    result = await syncUsersFromSupabaseToFirebase();
    
    if (!result.success) {
      console.error('❌ Supabase to Firebase sync failed');
      process.exit(1);
    }
  }
  
  console.log('\n✅ User synchronization completed successfully!');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  syncUsersFromFirebaseToSupabase, 
  syncUsersFromSupabaseToFirebase 
};