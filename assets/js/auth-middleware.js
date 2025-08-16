/**
 * TRADERS HELMET ACADEMY - AUTHENTICATION MIDDLEWARE & ROUTE GUARDS
 * Location: /assets/js/auth-middleware.js
 * 
 * Comprehensive authentication middleware for route protection,
 * tier-based access control, and user session management
 */

class AuthenticationMiddleware {
    constructor() {
        this.guards = new Map();
        this.protectedRoutes = new Map();
        this.rolePermissions = new Map();
        this.currentRoute = null;
        this.redirectQueue = [];
        
        this.init();
    }

    async init() {
        this.setupRouteGuards();
        this.setupRolePermissions();
        this.setupNavigationInterceptors();
        this.startRouteMonitoring();
        console.log('✅ Authentication Middleware initialized');
    }

    /**
     * ROUTE GUARDS SETUP
     */
    setupRouteGuards() {
        // Define protected routes and their requirements
        this.protectedRoutes.set('/pages/dashboard/', {
            requireAuth: true,
            minTier: 'gold',
            roles: ['user', 'admin'],
            redirect: '/login.html'
        });

        this.protectedRoutes.set('/pages/dashboard/gold.html', {
            requireAuth: true,
            minTier: 'gold',
            roles: ['user', 'admin'],
            redirect: '/pages/payment/upgrade.html'
        });

        this.protectedRoutes.set('/pages/dashboard/platinum.html', {
            requireAuth: true,
            minTier: 'platinum',
            roles: ['user', 'admin'],
            redirect: '/pages/payment/upgrade.html'
        });

        this.protectedRoutes.set('/pages/dashboard/diamond.html', {
            requireAuth: true,
            minTier: 'diamond',
            roles: ['user', 'admin'],
            redirect: '/pages/payment/upgrade.html'
        });

        this.protectedRoutes.set('/pages/admin/', {
            requireAuth: true,
            minTier: 'admin',
            roles: ['admin'],
            redirect: '/pages/dashboard/'
        });

        this.protectedRoutes.set('/pages/signals/', {
            requireAuth: true,
            minTier: 'gold',
            roles: ['user', 'admin'],
            redirect: '/login.html'
        });

        this.protectedRoutes.set('/pages/profile/', {
            requireAuth: true,
            minTier: 'free',
            roles: ['user', 'admin'],
            redirect: '/login.html'
        });

        this.protectedRoutes.set('/pages/payment/', {
            requireAuth: true,
            minTier: 'free',
            roles: ['user', 'admin'],
            redirect: '/login.html'
        });

        // Public routes that should redirect authenticated users
        this.protectedRoutes.set('/login.html', {
            requireAuth: false,
            redirectIfAuthenticated: true,
            redirect: '/pages/dashboard/'
        });

        this.protectedRoutes.set('/pages/auth/register.html', {
            requireAuth: false,
            redirectIfAuthenticated: true,
            redirect: '/pages/dashboard/'
        });
    }

    setupRolePermissions() {
        this.rolePermissions.set('admin', [
            'manage_users',
            'manage_signals',
            'manage_payments',
            'view_analytics',
            'system_settings',
            'all_features'
        ]);

        this.rolePermissions.set('moderator', [
            'moderate_chat',
            'manage_signals',
            'view_reports'
        ]);

        this.rolePermissions.set('support', [
            'view_tickets',
            'respond_tickets',
            'view_user_profiles'
        ]);

        this.rolePermissions.set('user', [
            'view_signals',
            'access_chat',
            'manage_profile',
            'view_dashboard'
        ]);
    }

    /**
     * ROUTE PROTECTION MIDDLEWARE
     */
    async checkRouteAccess(path) {
        try {
            const route = this.findMatchingRoute(path);
            if (!route) {
                return { allowed: true }; // No restrictions for unprotected routes
            }

            const routeConfig = this.protectedRoutes.get(route);
            const currentUser = THGlobal.state.user;
            const userProfile = THGlobal.state.userProfile;
            const userTier = THGlobal.state.userTier || 'free';

            // Check if route requires authentication
            if (routeConfig.requireAuth && !currentUser) {
                return {
                    allowed: false,
                    reason: 'authentication_required',
                    redirect: routeConfig.redirect || '/login.html',
                    message: 'Please log in to access this page.'
                };
            }

            // Check if authenticated users should be redirected
            if (routeConfig.redirectIfAuthenticated && currentUser) {
                return {
                    allowed: false,
                    reason: 'already_authenticated',
                    redirect: routeConfig.redirect || this.getTierDashboard(userTier),
                    message: 'You are already logged in.'
                };
            }

            // If no authentication required, allow access
            if (!routeConfig.requireAuth) {
                return { allowed: true };
            }

            // Check tier requirements
            if (routeConfig.minTier && !this.hasRequiredTier(userTier, routeConfig.minTier)) {
                return {
                    allowed: false,
                    reason: 'insufficient_tier',
                    redirect: routeConfig.redirect || '/pages/payment/upgrade.html',
                    message: `This feature requires ${routeConfig.minTier} membership or higher.`
                };
            }

            // Check role requirements
            if (routeConfig.roles && !this.hasRequiredRole(userProfile?.role, routeConfig.roles)) {
                return {
                    allowed: false,
                    reason: 'insufficient_role',
                    redirect: routeConfig.redirect || '/pages/dashboard/',
                    message: 'You do not have permission to access this page.'
                };
            }

            // Check account status
            if (userProfile?.status !== 'active') {
                return {
                    allowed: false,
                    reason: 'account_inactive',
                    redirect: '/pages/auth/account-suspended.html',
                    message: 'Your account is not active. Please contact support.'
                };
            }

            // Check email verification if required
            if (AuthConfig.getConfig().auth.requireEmailVerification && !userProfile?.email_verified) {
                return {
                    allowed: false,
                    reason: 'email_not_verified',
                    redirect: '/pages/auth/verify-email.html',
                    message: 'Please verify your email address to continue.'
                };
            }

            // All checks passed
            return { allowed: true };

        } catch (error) {
            console.error('Route access check error:', error);
            return {
                allowed: false,
                reason: 'error',
                redirect: '/login.html',
                message: 'Access check failed. Please try logging in again.'
            };
        }
    }

    /**
     * NAVIGATION INTERCEPTORS
     */
    setupNavigationInterceptors() {
        // Intercept all navigation attempts
        window.addEventListener('beforeunload', (e) => {
            this.handlePageUnload(e);
        });

        // Intercept link clicks
        document.addEventListener('click', async (e) => {
            const link = e.target.closest('a[href]');
            if (link && this.shouldInterceptLink(link)) {
                e.preventDefault();
                await this.handleNavigationAttempt(link.href);
            }
        });

        // Intercept programmatic navigation
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = async (...args) => {
            const url = args[2];
            if (url && await this.shouldBlockNavigation(url)) {
                return;
            }
            return originalPushState.apply(history, args);
        };

        history.replaceState = async (...args) => {
            const url = args[2];
            if (url && await this.shouldBlockNavigation(url)) {
                return;
            }
            return originalReplaceState.apply(history, args);
        };

        // Handle browser back/forward
        window.addEventListener('popstate', async (e) => {
            const url = window.location.pathname;
            if (await this.shouldBlockNavigation(url)) {
                history.pushState(null, '', this.currentRoute || '/');
            }
        });
    }

    async handleNavigationAttempt(targetUrl) {
        try {
            const url = new URL(targetUrl, window.location.origin);
            const accessCheck = await this.checkRouteAccess(url.pathname);

            if (accessCheck.allowed) {
                window.location.href = targetUrl;
            } else {
                await this.handleAccessDenied(accessCheck);
            }
        } catch (error) {
            console.error('Navigation error:', error);
            THNotifications.show('Navigation failed. Please try again.', 'error');
        }
    }

    async shouldBlockNavigation(url) {
        try {
            const parsedUrl = new URL(url, window.location.origin);
            const accessCheck = await this.checkRouteAccess(parsedUrl.pathname);
            
            if (!accessCheck.allowed) {
                await this.handleAccessDenied(accessCheck);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Navigation check error:', error);
            return false;
        }
    }

    shouldInterceptLink(link) {
        const href = link.getAttribute('href');
        
        // Don't intercept external links
        if (href.startsWith('http') && !href.startsWith(window.location.origin)) {
            return false;
        }

        // Don't intercept download links
        if (link.hasAttribute('download')) {
            return false;
        }

        // Don't intercept mailto/tel links
        if (href.startsWith('mailto:') || href.startsWith('tel:')) {
            return false;
        }

        // Intercept internal navigation
        return true;
    }

    async handleAccessDenied(accessCheck) {
        const { reason, redirect, message } = accessCheck;

        // Show appropriate notification
        THNotifications.show(message, this.getNotificationType(reason), {
            persistent: true,
            action: {
                text: this.getActionText(reason),
                callback: () => {
                    if (redirect) {
                        window.location.href = redirect;
                    }
                }
            }
        });

        // Log access denial
        await this.logAccessDenial(reason, window.location.pathname);

        // Redirect after a delay
        if (redirect) {
            setTimeout(() => {
                window.location.href = redirect;
            }, 3000);
        }
    }

    /**
     * PERMISSION CHECKING
     */
    hasRequiredTier(userTier, requiredTier) {
        const tierLevels = {
            'free': 0,
            'gold': 1,
            'platinum': 2,
            'diamond': 3,
            'admin': 999
        };

        const userLevel = tierLevels[userTier] || 0;
        const requiredLevel = tierLevels[requiredTier] || 0;

        return userLevel >= requiredLevel;
    }

    hasRequiredRole(userRole, allowedRoles) {
        if (!userRole || !allowedRoles) return false;
        return allowedRoles.includes(userRole);
    }

    hasPermission(permission) {
        const userRole = THGlobal.state.userProfile?.role || 'user';
        const rolePermissions = this.rolePermissions.get(userRole) || [];
        
        return rolePermissions.includes(permission) || rolePermissions.includes('all_features');
    }

    /**
     * ROUTE MONITORING
     */
    startRouteMonitoring() {
        // Monitor current route
        this.currentRoute = window.location.pathname;
        
        // Check access to current page on initialization
        setTimeout(async () => {
            const accessCheck = await this.checkRouteAccess(this.currentRoute);
            if (!accessCheck.allowed) {
                await this.handleAccessDenied(accessCheck);
            }
        }, 1000); // Wait for auth initialization

        // Monitor route changes
        setInterval(() => {
            if (window.location.pathname !== this.currentRoute) {
                this.currentRoute = window.location.pathname;
                this.onRouteChange();
            }
        }, 500);
    }

    async onRouteChange() {
        // Check access to new route
        const accessCheck = await this.checkRouteAccess(this.currentRoute);
        
        if (!accessCheck.allowed) {
            await this.handleAccessDenied(accessCheck);
        } else {
            // Log page view
            await this.logPageView(this.currentRoute);
        }
    }

    handlePageUnload(e) {
        // Log page exit
        if (THGlobal.state.user) {
            navigator.sendBeacon('/api/analytics/page-exit', JSON.stringify({
                user_id: THGlobal.state.user.id,
                page: window.location.pathname,
                timestamp: Date.now()
            }));
        }
    }

    /**
     * UTILITY METHODS
     */
    findMatchingRoute(path) {
        // Find exact match first
        if (this.protectedRoutes.has(path)) {
            return path;
        }

        // Find prefix match
        for (const [route] of this.protectedRoutes) {
            if (path.startsWith(route)) {
                return route;
            }
        }

        return null;
    }

    getTierDashboard(tier) {
        const dashboards = {
            'free': '/pages/dashboard/index.html',
            'gold': '/pages/dashboard/gold.html',
            'platinum': '/pages/dashboard/platinum.html',
            'diamond': '/pages/dashboard/diamond.html',
            'admin': '/pages/admin/dashboard.html'
        };
        return dashboards[tier] || '/pages/dashboard/';
    }

    getNotificationType(reason) {
        const types = {
            'authentication_required': 'warning',
            'insufficient_tier': 'info',
            'insufficient_role': 'error',
            'account_inactive': 'error',
            'email_not_verified': 'warning',
            'already_authenticated': 'info'
        };
        return types[reason] || 'error';
    }

    getActionText(reason) {
        const actions = {
            'authentication_required': 'Login',
            'insufficient_tier': 'Upgrade',
            'insufficient_role': 'Go Back',
            'account_inactive': 'Contact Support',
            'email_not_verified': 'Verify Email',
            'already_authenticated': 'Go to Dashboard'
        };
        return actions[reason] || 'OK';
    }

    async logAccessDenial(reason, attemptedPath) {
        try {
            if (!THGlobal.state.user) return;

            await supabase
                .from('user_activity_log')
                .insert({
                    user_id: THGlobal.state.user.id,
                    action: 'access_denied',
                    resource_type: 'route',
                    resource_id: attemptedPath,
                    metadata: {
                        reason,
                        user_agent: navigator.userAgent,
                        timestamp: Date.now()
                    }
                });
        } catch (error) {
            console.error('Error logging access denial:', error);
        }
    }

    async logPageView(path) {
        try {
            if (!THGlobal.state.user) return;

            await supabase
                .from('user_activity_log')
                .insert({
                    user_id: THGlobal.state.user.id,
                    action: 'page_view',
                    resource_type: 'route',
                    resource_id: path,
                    metadata: {
                        referrer: document.referrer,
                        user_agent: navigator.userAgent,
                        timestamp: Date.now()
                    }
                });
        } catch (error) {
            console.error('Error logging page view:', error);
        }
    }

    /**
     * GUARD DECORATORS
     */
    requireAuth(callback) {
        return async (...args) => {
            if (!THGlobal.state.user) {
                THNotifications.show('Please log in to perform this action.', 'warning');
                window.location.href = '/login.html';
                return;
            }
            return callback.apply(this, args);
        };
    }

    requireTier(minTier, callback) {
        return async (...args) => {
            if (!this.hasRequiredTier(THGlobal.state.userTier, minTier)) {
                THNotifications.show(
                    `This feature requires ${minTier} membership or higher.`,
                    'info',
                    {
                        action: {
                            text: 'Upgrade',
                            callback: () => window.location.href = '/pages/payment/upgrade.html'
                        }
                    }
                );
                return;
            }
            return callback.apply(this, args);
        };
    }

    requireRole(allowedRoles, callback) {
        return async (...args) => {
            const userRole = THGlobal.state.userProfile?.role;
            if (!this.hasRequiredRole(userRole, allowedRoles)) {
                THNotifications.show('You do not have permission to perform this action.', 'error');
                return;
            }
            return callback.apply(this, args);
        };
    }

    requirePermission(permission, callback) {
        return async (...args) => {
            if (!this.hasPermission(permission)) {
                THNotifications.show('You do not have permission to perform this action.', 'error');
                return;
            }
            return callback.apply(this, args);
        };
    }

    /**
     * PUBLIC API
     */
    async canAccess(path) {
        const accessCheck = await this.checkRouteAccess(path);
        return accessCheck.allowed;
    }

    async navigate(path) {
        const accessCheck = await this.checkRouteAccess(path);
        
        if (accessCheck.allowed) {
            window.location.href = path;
        } else {
            await this.handleAccessDenied(accessCheck);
        }
    }

    guardFunction(requirements, callback) {
        return async (...args) => {
            // Check authentication
            if (requirements.requireAuth && !THGlobal.state.user) {
                THNotifications.show('Please log in to perform this action.', 'warning');
                return;
            }

            // Check tier
            if (requirements.minTier && !this.hasRequiredTier(THGlobal.state.userTier, requirements.minTier)) {
                THNotifications.show(`This feature requires ${requirements.minTier} membership.`, 'info');
                return;
            }

            // Check role
            if (requirements.roles && !this.hasRequiredRole(THGlobal.state.userProfile?.role, requirements.roles)) {
                THNotifications.show('You do not have permission to perform this action.', 'error');
                return;
            }

            // Check permission
            if (requirements.permission && !this.hasPermission(requirements.permission)) {
                THNotifications.show('You do not have permission to perform this action.', 'error');
                return;
            }

            // All checks passed, execute callback
            return callback.apply(this, args);
        };
    }

    getRouteConfig(path) {
        const route = this.findMatchingRoute(path);
        return route ? this.protectedRoutes.get(route) : null;
    }
}

// Initialize Authentication Middleware
const AuthMiddleware = new AuthenticationMiddleware();

// Global access and decorators
window.AuthMiddleware = AuthMiddleware;
window.requireAuth = AuthMiddleware.requireAuth.bind(AuthMiddleware);
window.requireTier = AuthMiddleware.requireTier.bind(AuthMiddleware);
window.requireRole = AuthMiddleware.requireRole.bind(AuthMiddleware);
window.requirePermission = AuthMiddleware.requirePermission.bind(AuthMiddleware);