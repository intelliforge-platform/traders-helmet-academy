/ =========================================
// 2. ADMIN AUTHENTICATION MIDDLEWARE
// =========================================

// Admin authentication check for client-side
class AdminAuthManager {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.adminPermissions = [];
    }

    // Check if current user is admin
    async checkAdminAccess() {
        try {
            return new Promise((resolve, reject) => {
                firebase.auth().onAuthStateChanged(async (user) => {
                    if (user) {
                        // Get user token with claims
                        const tokenResult = await user.getIdTokenResult();
                        const claims = tokenResult.claims;
                        
                        this.currentUser = user;
                        this.isAdmin = claims.role === 'admin';
                        this.adminPermissions = claims.permissions || [];
                        
                        if (this.isAdmin) {
                            // Load admin profile from Supabase
                            await this.loadAdminProfile(user.uid);
                            resolve(true);
                        } else {
                            reject(new Error('Insufficient permissions - Admin access required'));
                        }
                    } else {
                        reject(new Error('Authentication required'));
                    }
                });
            });
        } catch (error) {
            console.error('Admin access check failed:', error);
            throw error;
        }
    }

    // Load admin profile from Supabase
    async loadAdminProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .eq('role', 'admin')
                .single();

            if (error) throw error;
            
            this.adminProfile = data;
            return data;
            
        } catch (error) {
            console.error('Failed to load admin profile:', error);
            throw error;
        }
    }

    // Check specific admin permission
    hasPermission(permission) {
        return this.isAdmin && this.adminPermissions.includes(permission);
    }

    // Redirect non-admin users
    requireAdminAccess(redirectUrl = '/pages/auth/login.html') {
        this.checkAdminAccess().catch((error) => {
            console.warn('Admin access denied:', error.message);
            window.location.href = redirectUrl + '?error=admin_required';
        });
    }
}
