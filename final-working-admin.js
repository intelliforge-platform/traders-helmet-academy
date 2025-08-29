// final-working-admin.js
console.log('🚀 Final admin setup (handling existing user + Firebase)...');

const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
require('dotenv').config();

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeG53cWpsYXhydnFjdGlwaGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY3NDI0MywiZXhwIjoyMDYzMjUwMjQzfQ.pbf2mdsHS_DURTbGDWT9zSDK9zwqF-b3OsAznuYHIx0';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Firebase setup with proper private key formatting
function getFirebaseConfig() {
    try {
        const fs = require('fs');
        const configData = fs.readFileSync('./firebase-admin-key.json.json', 'utf8');
        const firebaseConfig = JSON.parse(configData);
        
        // Properly format the private key by replacing \\n with actual newlines
        if (firebaseConfig.private_key) {
            console.log('🔧 Properly formatting private key...');
            firebaseConfig.private_key = firebaseConfig.private_key.replace(/\\n/g, '\n');
            
            // Verify the key looks correct
            const hasBegin = firebaseConfig.private_key.includes('-----BEGIN PRIVATE KEY-----');
            const hasEnd = firebaseConfig.private_key.includes('-----END PRIVATE KEY-----');
            
            if (hasBegin && hasEnd) {
                console.log('✅ Private key format appears correct');
            } else {
                console.log('⚠️ Private key format may still be incorrect');
            }
        }
        
        return firebaseConfig;
    } catch (error) {
        console.log('⚠️ Could not read Firebase config file, using fallback');
        
        // Fallback config with properly formatted private key
        return {
            type: "service_account",
            project_id: "traders-helmet-academy",
            private_key_id: "1ca1f41fb02134f39517491544372a8bc792226a",
            private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCwdDlHBxcoqYym
najmCVkaD6ttBrVBnarXO38BIfBOFKv9I5DOV8pknuwsAIcEUJzO6jV2r27VN4uNM
mbj++zTwLTK0yCMlQXfWYhI7GhT8rzq+8hElThDFxZAPijEX6PuXMwv66+mecxMe
jEkGRbkpmcRc4/My+XzWuAJq1r+IjnVWdRdPeQ8PLW7rHxqBPCVRwzq/VnOtpAnT
C6HXRJoDIOebKTdd9Tc4YnmkP0lQQyfjEJ5VcbbLfSD5+y55OsNbE1USCVw9MCLF
htun7ugwTK/AWIlKn5P+++r6DbtwBNtLrV6y5ngu2jZ5D5KO3q4VQrcEMwlEgMYj
pgZv56qhAgMBAAECggEAAlrux8irsbZ/otoAngF+S/T2y7vfOp4lQpdgduc3EHw4
L5YiLSJxkmLv/Oa2b8ktKtSHt0tFsn4wh/12R2r9dCY6SsjwFSd4TMN+2EybEptZ
JqLPAUc3OJiQOXDgAmBw+T3sb0M2WU/SZcI8GEoWdFxxz0aYoKnNVYVbvObUZCNy
8medDQ2pWB6NZqO/VK7QpHp1fGJJlwZ83h3r93j/8G13Pzs7fhulGEFmcpHgbTQ1
y1iAOj4rv/7/NEpEyLpLiGjoSo24VyizXhp4bCEitDY8KtPzMja/IGRgJoSL++W9
XwvbxZGNCwmiN4mZ6fDIQfKRNLNTzkhxJK056Uf7EQKBgQDnIPkr+aV6MHSlYcrw
GUjjusXfyPhhh9NeNDI4cGyoTqOZnBKS+sRqS4Zk4B3R9LiBekca7yVPLQaavNq+
lvdagVdMM3Nr8+TAwIVcQ8eApOPwe7uOWKNYYtOeWJp5rZKt6kKIZrt/QZwJjXXm
UjkJeiDE1T7OArRk6yhcgo0juQKBgQDDcRhIfz+HLepQLLuzdlIgp0aHkKm62E/c
PmhsI8MeSHRT3XBr86YYiFWL9Wvf9Uq0ljVojOKvaryz9I5hZgISPOOOsomtmKpE
vPypSOuIOGLbMroXppH4/Ymq+E+gKDl4Sig897cx0nyCeMlREAht4qo0iarYrFNQ
uV7WCvGCKQKBgQC00vY+clUFUK2hye2khJOjHze6ChhQ7ZvvQrTbtRE9aDDUd+eM
OEa8xpPBjhmmbmh/W/QPXXP6Csb0/rXAkIm6tCBhTIuLtMeOCdEMSzblLZvrRFKL
XkuFVeQsKTPJ6IMuL22YG4+rUuBKFPNdm4xmHrdOZ2t4b2NE5Tmxjq3veQKBgA2q
DI6VBvYGiclNN1pWvWs3BsFXpeZAVWUKn/Zfkba+ThPG+aMyh7xTW9fLMt2Xor95
eQZ0Qy0Mg2D5ijLZFO/9fdNuPB38/HqN1ARp6r29Y3v70fLxXGdSIpvnfHmwFkSI
usN4dkBvfPEKTNj0DALSxB+kOGOpuLF+JFlGrpfxAoGAZIQe9S0oToN8t56a5R3z
Jx7bnzaocbtLQqrmxipKJimlk8BjZcJVrbCz+IPGt7B4d4f8QxOc57/bD9aiTyfY
Pd+QmmkWo8knDApkM7WiHbNlgoOWuAtmtPM9bmI2Q5JUpVWvQ4f5A8Gr3v3dddno
exnXe8kSuaeaJvXRvDbjab8=
-----END PRIVATE KEY-----`,
            client_email: "firebase-adminsdk-fbsvc@traders-helmet-academy.iam.gserviceaccount.com",
            client_id: "114195313217053845148",
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40traders-helmet-academy.iam.gserviceaccount.com",
            universe_domain: "googleapis.com"
        };
    }
}

async function setupCompleteAdmin() {
    try {
        const adminEmail = 'admin@tradershelmetacademy.com';
        const adminPassword = 'TradersHelmet2024!';
        const adminName = 'System Administrator';
        
        console.log('📧 Setting up admin account for:', adminEmail);
        
        // Step 1: Get existing Supabase user
        console.log('🔄 Checking existing Supabase user...');
        const { data: existingUser, error: fetchError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', adminEmail)
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        
        let supabaseUserId = existingUser?.id;
        
        if (existingUser) {
            console.log('✅ Found existing Supabase user:', supabaseUserId);
            
            // Update existing user to ensure admin status
            if (!existingUser.is_admin) {
                console.log('🔄 Updating user to admin status...');
                const { error: updateError } = await supabase
                    .from('user_profiles')
                    .update({
                        is_admin: true,
                        role: 'admin',
                        subscription_tier: 'admin',
                        subscription_status: 'active',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', supabaseUserId);
                
                if (updateError) throw updateError;
                console.log('✅ User updated to admin status');
            } else {
                console.log('✅ User is already an admin');
            }
        } else {
            console.log('🔄 Creating new Supabase user...');
            const { data: newUser, error: createError } = await supabase
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
                        created_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();
            
            if (createError) throw createError;
            supabaseUserId = newUser.id;
            console.log('✅ New Supabase user created:', supabaseUserId);
        }
        
        // Step 2: Setup Firebase with timeout
        let firebaseUserId = supabaseUserId;
        let firebaseSuccess = false;
        
        try {
            console.log('🔄 Attempting Firebase setup...');
            
            // Get proper Firebase config
            const firebaseConfig = getFirebaseConfig();
            
            // Initialize Firebase with timeout
            const initPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('Firebase initialization timeout (5 seconds)'));
                }, 5000);
                
                try {
                    if (!admin.apps.length) {
                        admin.initializeApp({
                            credential: admin.credential.cert(firebaseConfig)
                        });
                    }
                    resolve('Firebase initialized');
                } catch (error) {
                    reject(error);
                }
            });
            
            await initPromise;
            console.log('✅ Firebase initialized successfully');
            
            // Create or get Firebase user
            let firebaseUser;
            try {
                console.log('🔄 Creating Firebase user...');
                firebaseUser = await admin.auth().createUser({
                    uid: supabaseUserId,
                    email: adminEmail,
                    password: adminPassword,
                    displayName: adminName,
                    emailVerified: true
                });
                console.log('✅ Firebase user created');
            } catch (fbError) {
                if (fbError.code === 'auth/email-already-exists') {
                    console.log('🔄 Getting existing Firebase user...');
                    firebaseUser = await admin.auth().getUserByEmail(adminEmail);
                    
                    // Update password
                    await admin.auth().updateUser(firebaseUser.uid, {
                        password: adminPassword
                    });
                    console.log('✅ Firebase user password updated');
                } else if (fbError.code === 'auth/uid-already-exists') {
                    console.log('🔄 Firebase user with UID already exists...');
                    firebaseUser = await admin.auth().getUser(supabaseUserId);
                } else {
                    throw fbError;
                }
            }
            
            firebaseUserId = firebaseUser.uid;
            
            // Set admin claims
            await admin.auth().setCustomUserClaims(firebaseUserId, {
                role: 'admin',
                isAdmin: true,
                subscriptionTier: 'admin',
                permissions: ['user_management', 'payment_management', 'signal_management']
            });
            console.log('✅ Firebase admin claims set');
            
            firebaseSuccess = true;
            
        } catch (firebaseError) {
            console.log('⚠️ Firebase setup failed:', firebaseError.message);
            console.log('🔄 Continuing with Supabase-only setup...');
        }
        
        // Step 3: Sync IDs if Firebase was successful and IDs differ
        if (firebaseSuccess && firebaseUserId !== supabaseUserId) {
            console.log('🔄 Syncing Firebase and Supabase user IDs...');
            try {
                await supabase
                    .from('user_profiles')
                    .update({ id: firebaseUserId })
                    .eq('id', supabaseUserId);
                console.log('✅ User IDs synchronized');
                supabaseUserId = firebaseUserId;
            } catch (syncError) {
                console.log('⚠️ ID sync failed, but continuing...');
            }
        }
        
        // Step 4: Log success
        try {
            await supabase
                .from('user_activity_log')
                .insert([
                    {
                        user_id: supabaseUserId,
                        activity_type: 'admin_setup_completed',
                        activity_description: `Admin setup completed - Firebase: ${firebaseSuccess ? 'Success' : 'Failed'}`,
                        metadata: {
                            firebase_success: firebaseSuccess,
                            setup_method: 'final_working_admin'
                        },
                        created_at: new Date().toISOString()
                    }
                ]);
        } catch (logError) {
            console.log('⚠️ Activity logging failed (non-critical)');
        }
        
        return {
            success: true,
            userId: supabaseUserId,
            email: adminEmail,
            password: adminPassword,
            firebaseWorking: firebaseSuccess,
            message: firebaseSuccess ? 'Complete setup successful' : 'Partial setup successful (Supabase only)'
        };
        
    } catch (error) {
        console.error('❌ Admin setup failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function main() {
    console.log('🏛️ TRADERS HELMET ACADEMY');
    console.log('========================');
    console.log('🔧 Final Admin Setup');
    console.log('');
    
    const result = await setupCompleteAdmin();
    
    if (result.success) {
        console.log('\n🎉 SETUP SUCCESSFUL!');
        console.log('====================');
        console.log('✅ Admin account ready');
        console.log('📧 Email:', result.email);
        console.log('🔑 Password:', result.password);
        console.log('🆔 User ID:', result.userId);
        console.log('🔥 Firebase:', result.firebaseWorking ? 'Working' : 'Manual setup needed');
        console.log('');
        
        if (result.firebaseWorking) {
            console.log('🚀 READY TO LAUNCH!');
            console.log('===================');
            console.log('1. Open: /pages/auth/login.html');
            console.log('2. Login with credentials above');
            console.log('3. Access admin dashboard');
            console.log('4. Start managing your platform!');
        } else {
            console.log('🔧 MANUAL FIREBASE SETUP:');
            console.log('=========================');
            console.log('1. Go to Firebase Console → Authentication');
            console.log('2. Add user manually:');
            console.log('   Email:', result.email);
            console.log('   Password:', result.password);
            console.log('3. Then login at: /pages/auth/login.html');
            console.log('');
            console.log('📱 YOUR PLATFORM IS STILL FUNCTIONAL!');
            console.log('You can manage users via Supabase dashboard');
        }
        
    } else {
        console.log('\n❌ SETUP FAILED!');
        console.log('Error:', result.error);
    }
    
    process.exit(result.success ? 0 : 1);
}

main().catch(console.error);