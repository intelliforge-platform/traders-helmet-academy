// fixed-admin-creator.js
console.log('🚀 Creating admin account (Firebase + Supabase)...');

const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
require('dotenv').config();

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://vjxnwqjlaxrvqctiphhb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeG53cWpsYXhydnFjdGlwaGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY3NDI0MywiZXhwIjoyMDYzMjUwMjQzfQ.pbf2mdsHS_DURTbGDWT9zSDK9zwqF-b3OsAznuYHIx0';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Firebase setup with proper private key handling
function initializeFirebase() {
    try {
        console.log('🔄 Initializing Firebase Admin SDK...');
        
        // Load and fix the Firebase config
        const fs = require('fs');
        let firebaseConfig;
        
        try {
            const configData = fs.readFileSync('./firebase-admin-key.json.json', 'utf8');
            firebaseConfig = JSON.parse(configData);
            
            // Fix private key newlines if needed
            if (firebaseConfig.private_key && !firebaseConfig.private_key.includes('\\n')) {
                console.log('🔧 Fixing private key format...');
                // If private key doesn't have escaped newlines, add them
                firebaseConfig.private_key = firebaseConfig.private_key
                    .replace(/-----BEGIN PRIVATE KEY-----/g, '-----BEGIN PRIVATE KEY-----\\n')
                    .replace(/-----END PRIVATE KEY-----/g, '\\n-----END PRIVATE KEY-----')
                    .replace(/([A-Za-z0-9+/=]{64})/g, '$1\\n')
                    .replace(/\\n\\n/g, '\\n')
                    .replace(/\\n-----END/g, '\\n-----END');
            }
            
        } catch (fileError) {
            console.log('⚠️ Firebase config file not found, using environment variables...');
            
            // Fallback to manual config
            firebaseConfig = {
                type: "service_account",
                project_id: "traders-helmet-academy",
                private_key_id: "1ca1f41fb02134f39517491544372a8bc792226a",
                private_key: "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCwdDlHBxcoqYym\\najmCVkaD6ttBrVBnarXO38BIfBOFKv9I5DOV8pknuwsAIcEUJzO6jV2r27VN4uNM\\nmbj++zTwLTK0yCMlQXfWYhI7GhT8rzq+8hElThDFxZAPijEX6PuXMwv66+mecxMe\\njEkGRbkpmcRc4/My+XzWuAJq1r+IjnVWdRdPeQ8PLW7rHxqBPCVRwzq/VnOtpAnT\\nC6HXRJoDIOebKTdd9Tc4YnmkP0lQQyfjEJ5VcbbLfSD5+y55OsNbE1USCVw9MCLF\\nhtun7ugwTK/AWIlKn5P+++r6DbtwBNtLrV6y5ngu2jZ5D5KO3q4VQrcEMwlEgMYj\\npgZv56qhAgMBAAECggEAAlrux8irsbZ/otoAngF+S/T2y7vfOp4lQpdgduc3EHw4\\nL5YiLSJxkmLv/Oa2b8ktKtSHt0tFsn4wh/12R2r9dCY6SsjwFSd4TMN+2EybEptZ\\nJqLPAUc3OJiQOXDgAmBw+T3sb0M2WU/SZcI8GEoWdFxxz0aYoKnNVYVbvObUZCNy\\n8medDQ2pWB6NZqO/VK7QpHp1fGJJlwZ83h3r93j/8G13Pzs7fhulGEFmcpHgbTQ1\\ny1iAOj4rv/7/NEpEyLpLiGjoSo24VyizXhp4bCEitDY8KtPzMja/IGRgJoSL++W9\\nXwvbxZGNCwmiN4mZ6fDIQfKRNLNTzkhxJK056Uf7EQKBgQDnIPkr+aV6MHSlYcrw\\nGUjjusXfyPhhh9NeNDI4cGyoTqOZnBKS+sRqS4Zk4B3R9LiBekca7yVPLQaavNq+\\nlvdagVdMM3Nr8+TAwIVcQ8eApOPwe7uOWKNYYtOeWJp5rZKt6kKIZrt/QZwJjXXm\\nUjkJeiDE1T7OArRk6yhcgo0juQKBgQDDcRhIfz+HLepQLLuzdlIgp0aHkKm62E/c\\nPmhsI8MeSHRT3XBr86YYiFWL9Wvf9Uq0ljVojOKvaryz9I5hZgISPOOOsomtmKpE\\nvPypSOuIOGLbMroXppH4/Ymq+E+gKDl4Sig897cx0nyCeMlREAht4qo0iarYrFNQ\\nuV7WCvGCKQKBgQC00vY+clUFUK2hye2khJOjHze6ChhQ7ZvvQrTbtRE9aDDUd+eM\\nOEa8xpPBjhmmbmh/W/QPXXP6Csb0/rXAkIm6tCBhTIuLtMeOCdEMSzblLZvrRFKL\\nXkuFVeQsKTPJ6IMuL22YG4+rUuBKFPNdm4xmHrdOZ2t4b2NE5Tmxjq3veQKBgA2q\\nDI6VBvYGiclNN1pWvWs3BsFXpeZAVWUKn/Zfkba+ThPG+aMyh7xTW9fLMt2Xor95\\neQZ0Qy0Mg2D5ijLZFO/9fdNuPB38/HqN1ARp6r29Y3v70fLxXGdSIpvnfHmwFkSI\\nusN4dkBvfPEKTNj0DALSxB+kOGOpuLF+JFlGrpfxAoGAZIQe9S0oToN8t56a5R3z\\nJx7bnzaocbtLQqrmxipKJimlk8BjZcJVrbCz+IPGt7B4d4f8QxOc57/bD9aiTyfY\\nPd+QmmkWo8knDApkM7WiHbNlgoOWuAtmtPM9bmI2Q5JUpVWvQ4f5A8Gr3v3dddno\\nexnXe8kSuaeaJvXRvDbjab8=\\n-----END PRIVATE KEY-----\\n",
                client_email: "firebase-adminsdk-fbsvc@traders-helmet-academy.iam.gserviceaccount.com",
                client_id: "114195313217053845148",
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40traders-helmet-academy.iam.gserviceaccount.com",
                universe_domain: "googleapis.com"
            };
        }
        
        // Initialize Firebase Admin with timeout
        if (!admin.apps.length) {
            console.log('🔄 Setting up Firebase connection...');
            
            // Add a timeout to prevent hanging
            const initPromise = new Promise((resolve, reject) => {
                try {
                    admin.initializeApp({
                        credential: admin.credential.cert(firebaseConfig),
                        databaseURL: "https://traders-helmet-academy-default-rtdb.firebaseio.com"
                    });
                    resolve('Firebase initialized successfully');
                } catch (error) {
                    reject(error);
                }
            });
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Firebase initialization timeout after 10 seconds')), 10000);
            });
            
            return Promise.race([initPromise, timeoutPromise]);
        }
        
        return Promise.resolve('Firebase already initialized');
        
    } catch (error) {
        throw new Error(`Firebase initialization failed: ${error.message}`);
    }
}

async function createCompleteAdmin() {
    try {
        const adminEmail = 'admin@tradershelmetacademy.com';
        const adminPassword = 'TradersHelmet2024!';
        const adminName = 'System Administrator';
        
        console.log('📧 Creating complete admin account for:', adminEmail);
        
        // Step 1: Initialize Firebase with timeout
        try {
            await initializeFirebase();
            console.log('✅ Firebase initialized successfully');
        } catch (firebaseError) {
            console.log('⚠️ Firebase initialization failed:', firebaseError.message);
            console.log('🔄 Continuing with Supabase-only setup...');
            
            // Continue without Firebase for now
            return await createSupabaseOnlyAdmin(adminEmail, adminName);
        }
        
        // Step 2: Check if user exists in Supabase
        const { data: existingUser } = await supabase
            .from('user_profiles')
            .select('id, email, is_admin')
            .eq('email', adminEmail)
            .single();
        
        let userId = existingUser?.id;
        
        if (existingUser && existingUser.is_admin) {
            console.log('✅ Admin already exists in both systems');
            return {
                success: true,
                userId: existingUser.id,
                message: 'Admin account already exists'
            };
        }
        
        // Step 3: Create or get Firebase user
        let firebaseUser;
        try {
            console.log('🔄 Creating Firebase user...');
            firebaseUser = await admin.auth().createUser({
                uid: userId, // Use existing Supabase ID if available
                email: adminEmail,
                password: adminPassword,
                displayName: adminName,
                emailVerified: true
            });
            console.log('✅ Firebase user created:', firebaseUser.uid);
            userId = firebaseUser.uid;
        } catch (fbUserError) {
            if (fbUserError.code === 'auth/email-already-exists') {
                console.log('🔄 Getting existing Firebase user...');
                firebaseUser = await admin.auth().getUserByEmail(adminEmail);
                userId = firebaseUser.uid;
            } else {
                throw fbUserError;
            }
        }
        
        // Step 4: Set Firebase admin claims
        await admin.auth().setCustomUserClaims(userId, {
            role: 'admin',
            isAdmin: true,
            permissions: ['user_management', 'payment_management', 'signal_management']
        });
        console.log('✅ Firebase admin claims set');
        
        // Step 5: Create/update Supabase profile
        if (existingUser) {
            await supabase
                .from('user_profiles')
                .update({
                    id: userId, // Update with Firebase UID
                    is_admin: true,
                    role: 'admin',
                    subscription_tier: 'admin',
                    subscription_status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('email', adminEmail);
            console.log('✅ Supabase profile updated');
        } else {
            await supabase
                .from('user_profiles')
                .insert([
                    {
                        id: userId,
                        email: adminEmail,
                        full_name: adminName,
                        role: 'admin',
                        subscription_tier: 'admin',
                        subscription_status: 'active',
                        is_admin: true,
                        email_verified: true,
                        created_at: new Date().toISOString()
                    }
                ]);
            console.log('✅ Supabase profile created');
        }
        
        // Step 6: Log activity
        await supabase
            .from('user_activity_log')
            .insert([
                {
                    user_id: userId,
                    activity_type: 'admin_account_created',
                    activity_description: `Complete admin account created for ${adminEmail}`,
                    metadata: { created_by: 'system', method: 'complete_setup' },
                    created_at: new Date().toISOString()
                }
            ]);
        
        return {
            success: true,
            userId: userId,
            email: adminEmail,
            password: adminPassword,
            message: 'Complete admin account created successfully'
        };
        
    } catch (error) {
        console.error('❌ Complete admin creation failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function createSupabaseOnlyAdmin(email, name) {
    // Fallback to Supabase-only admin creation
    const { data: newAdmin, error } = await supabase
        .from('user_profiles')
        .upsert([
            {
                email: email,
                full_name: name,
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
    
    if (error) throw error;
    
    return {
        success: true,
        userId: newAdmin.id,
        email: email,
        message: 'Supabase-only admin created (Firebase setup needed manually)'
    };
}

async function main() {
    console.log('🏛️ TRADERS HELMET ACADEMY');
    console.log('========================');
    console.log('🔧 Complete Admin Setup (Firebase + Supabase)');
    console.log('');
    
    const result = await createCompleteAdmin();
    
    if (result.success) {
        console.log('\n🎉 SUCCESS!');
        console.log('==================');
        console.log('✅ Admin account is ready');
        console.log('📧 Email:', result.email || 'admin@tradershelmetacademy.com');
        console.log('🆔 User ID:', result.userId);
        
        if (result.password) {
            console.log('🔑 Password:', result.password);
            console.log('');
            console.log('🚀 READY TO LAUNCH!');
            console.log('===================');
            console.log('1. Open: /pages/auth/login.html');
            console.log('2. Login with the credentials above');
            console.log('3. Access admin dashboard');
            console.log('4. Start managing your platform!');
        } else {
            console.log('');
            console.log('🔧 NEXT STEPS:');
            console.log('1. Create Firebase user manually with this email');
            console.log('2. Set password in Firebase Console');
            console.log('3. Login at: /pages/auth/login.html');
        }
        
    } else {
        console.log('\n❌ SETUP FAILED!');
        console.log('Error:', result.error);
    }
    
    process.exit(result.success ? 0 : 1);
}

// Run the script
main().catch(console.error);