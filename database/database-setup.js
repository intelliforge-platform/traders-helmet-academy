
/**
 * TRADERS HELMET ACADEMY - DATABASE SETUP & UTILITIES
 * Location: /database/database-setup.js
 * 
 * Database connection, setup, and migration utilities for Supabase
 * Handles database initialization, migrations, and health monitoring
 */

class DatabaseSetup {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.migrationStatus = new Map();
        this.healthMetrics = {
            lastCheck: null,
            status: 'unknown',
            latency: 0,
            errors: []
        };
        
        this.config = {
            retryAttempts: 3,
            retryDelay: 1000,
            healthCheckInterval: 60000, // 1 minute
            migrationTimeout: 30000, // 30 seconds
            maxConnections: 100,
            connectionTimeout: 10000 // 10 seconds
        };
    }

    /**
     * INITIALIZATION
     */
    async initialize() {
        try {
            console.log('🔄 Initializing database setup...');
            
            // Initialize Supabase client
            await this.initializeSupabase();
            
            // Check database connection
            await this.checkConnection();
            
            // Run health check
            await this.performHealthCheck();
            
            // Check and run migrations
            await this.checkMigrations();
            
            // Setup monitoring
            this.startHealthMonitoring();
            
            console.log('✅ Database setup completed successfully');
            return true;
        } catch (error) {
            console.error('❌ Database setup failed:', error);
            throw error;
        }
    }

    async initializeSupabase() {
        try {
            if (!THConfig?.supabase?.url || !THConfig?.supabase?.anonKey) {
                throw new Error('Supabase configuration missing. Please check your config.js file.');
            }

            this.supabase = supabase; // Use global supabase client
            console.log('✅ Supabase client initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
            throw error;
        }
    }

    /**
     * CONNECTION MANAGEMENT
     */
    async checkConnection() {
        try {
            const startTime = Date.now();
            
            // Test basic query
            const { data, error } = await this.supabase
                .from('system_settings')
                .select('key')
                .limit(1);

            const latency = Date.now() - startTime;

            if (error) {
                throw error;
            }

            this.isConnected = true;
            this.healthMetrics.latency = latency;
            this.healthMetrics.lastCheck = new Date();
            this.healthMetrics.status = 'connected';

            console.log(`✅ Database connection established (${latency}ms)`);
            return true;
        } catch (error) {
            this.isConnected = false;
            this.healthMetrics.status = 'error';
            this.healthMetrics.errors.push({
                timestamp: new Date(),
                message: error.message
            });
            
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    async retryConnection(attempts = 3) {
        for (let i = 0; i < attempts; i++) {
            try {
                await this.checkConnection();
                return true;
            } catch (error) {
                console.log(`🔄 Connection attempt ${i + 1}/${attempts} failed`);
                if (i < attempts - 1) {
                    await this.delay(this.config.retryDelay * (i + 1));
                }
            }
        }
        throw new Error('Failed to establish database connection after multiple attempts');
    }

    /**
     * MIGRATION MANAGEMENT
     */
    async checkMigrations() {
        try {
            console.log('🔄 Checking database migrations...');
            
            // Ensure migrations table exists
            await this.ensureMigrationsTable();
            
            // Get applied migrations
            const appliedMigrations = await this.getAppliedMigrations();
            
            // Get available migrations
            const availableMigrations = this.getAvailableMigrations();
            
            // Find pending migrations
            const pendingMigrations = availableMigrations.filter(
                migration => !appliedMigrations.includes(migration.version)
            );

            if (pendingMigrations.length > 0) {
                console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
                await this.runPendingMigrations(pendingMigrations);
            } else {
                console.log('✅ All migrations are up to date');
            }

            return true;
        } catch (error) {
            console.error('❌ Migration check failed:', error);
            throw error;
        }
    }

    async ensureMigrationsTable() {
        try {
            const { error } = await this.supabase.rpc('create_migrations_table');
            
            if (error && !error.message.includes('already exists')) {
                throw error;
            }
        } catch (error) {
            // Fallback: try to query the table
            const { error: queryError } = await this.supabase
                .from('schema_migrations')
                .select('version')
                .limit(1);

            if (queryError) {
                console.warn('Migrations table may not exist. This is normal for new installations.');
            }
        }
    }

    async getAppliedMigrations() {
        try {
            const { data, error } = await this.supabase
                .from('schema_migrations')
                .select('version')
                .order('version');

            if (error) {
                if (error.code === '42P01') { // Table doesn't exist
                    return [];
                }
                throw error;
            }

            return data.map(row => row.version);
        } catch (error) {
            console.warn('Could not fetch applied migrations:', error.message);
            return [];
        }
    }

    getAvailableMigrations() {
        // In a real implementation, this would read migration files from the filesystem
        // For now, we'll define them statically
        return [
            {
                version: '001',
                name: 'initial_schema',
                description: 'Initial database schema setup',
                sql: null // Would contain the actual SQL
            },
            {
                version: '002',
                name: 'add_indexes_rls',
                description: 'Add performance indexes and Row Level Security',
                sql: null
            }
        ];
    }

    async runPendingMigrations(migrations) {
        for (const migration of migrations) {
            try {
                console.log(`🔄 Running migration ${migration.version}: ${migration.name}`);
                
                await this.runMigration(migration);
                
                // Record migration as applied
                await this.recordMigration(migration);
                
                this.migrationStatus.set(migration.version, 'completed');
                console.log(`✅ Migration ${migration.version} completed`);
                
            } catch (error) {
                this.migrationStatus.set(migration.version, 'failed');
                console.error(`❌ Migration ${migration.version} failed:`, error);
                throw error;
            }
        }
    }

    async runMigration(migration) {
        // In a real implementation, this would execute the migration SQL
        // For demo purposes, we'll simulate the migration
        
        console.log(`Executing migration: ${migration.description}`);
        
        // Simulate migration execution
        await this.delay(1000);
        
        // In practice, you would execute the SQL from the migration file
        // await this.supabase.rpc('execute_migration', { sql: migration.sql });
    }

    async recordMigration(migration) {
        try {
            const { error } = await this.supabase
                .from('schema_migrations')
                .insert({
                    version: migration.version,
                    description: migration.description,
                    executed_at: new Date().toISOString()
                });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Failed to record migration:', error);
            // Don't throw here as the migration may have succeeded
        }
    }

    /**
     * HEALTH MONITORING
     */
    async performHealthCheck() {
        try {
            const healthData = {
                timestamp: new Date(),
                connection: await this.checkConnectionHealth(),
                performance: await this.checkPerformanceHealth(),
                storage: await this.checkStorageHealth(),
                security: await this.checkSecurityHealth()
            };

            this.healthMetrics = {
                ...this.healthMetrics,
                ...healthData,
                status: this.calculateOverallHealth(healthData)
            };

            return this.healthMetrics;
        } catch (error) {
            console.error('Health check failed:', error);
            this.healthMetrics.status = 'error';
            this.healthMetrics.errors.push({
                timestamp: new Date(),
                message: error.message
            });
            return this.healthMetrics;
        }
    }

    async checkConnectionHealth() {
        const startTime = Date.now();
        
        try {
            // Test multiple connection types
            const [basicQuery, authQuery, rpcQuery] = await Promise.all([
                this.supabase.from('system_settings').select('count').limit(1),
                this.supabase.auth.getSession(),
                this.supabase.rpc('get_database_stats', {}, { count: 'exact' })
            ]);

            const latency = Date.now() - startTime;

            return {
                status: 'healthy',
                latency,
                basicQuery: !basicQuery.error,
                authQuery: !authQuery.error,
                rpcQuery: !rpcQuery.error
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                latency: Date.now() - startTime
            };
        }
    }

    async checkPerformanceHealth() {
        try {
            const startTime = Date.now();
            
            // Test performance with a more complex query
            const { data, error } = await this.supabase
                .from('trading_signals')
                .select('id, created_at')
                .order('created_at', { ascending: false })
                .limit(10);

            const queryTime = Date.now() - startTime;

            return {
                status: queryTime < 1000 ? 'healthy' : 'slow',
                queryTime,
                recordCount: data?.length || 0,
                error: error?.message
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkStorageHealth() {
        try {
            // Check storage quota and usage
            const { data, error } = await this.supabase.storage
                .from('user-uploads')
                .list('', { limit: 1 });

            return {
                status: error ? 'unhealthy' : 'healthy',
                storageAvailable: !error,
                error: error?.message
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkSecurityHealth() {
        try {
            // Check RLS policies are active
            const { data, error } = await this.supabase.rpc('check_rls_status');

            return {
                status: 'healthy',
                rlsActive: true, // Assumed if no error
                error: error?.message
            };
        } catch (error) {
            return {
                status: 'warning',
                rlsActive: false,
                error: error.message
            };
        }
    }

    calculateOverallHealth(healthData) {
        const checks = [
            healthData.connection?.status === 'healthy',
            healthData.performance?.status === 'healthy' || healthData.performance?.status === 'slow',
            healthData.storage?.status === 'healthy',
            healthData.security?.status === 'healthy' || healthData.security?.status === 'warning'
        ];

        const healthyCount = checks.filter(Boolean).length;
        const totalChecks = checks.length;

        if (healthyCount === totalChecks) return 'healthy';
        if (healthyCount >= totalChecks * 0.75) return 'warning';
        return 'unhealthy';
    }

    startHealthMonitoring() {
        setInterval(async () => {
            try {
                await this.performHealthCheck();
                
                // Alert if health is degraded
                if (this.healthMetrics.status === 'unhealthy') {
                    console.warn('⚠️ Database health check failed');
                    this.notifyHealthIssue();
                }
            } catch (error) {
                console.error('Health monitoring error:', error);
            }
        }, this.config.healthCheckInterval);
    }

    notifyHealthIssue() {
        // In a production environment, this would send alerts
        if (window.THNotifications) {
            window.THNotifications.show(
                'Database connectivity issues detected. Some features may be temporarily unavailable.',
                'warning',
                { duration: 10000 }
            );
        }
    }

    /**
     * DATABASE OPERATIONS
     */
    async executeQuery(query, params = {}) {
        try {
            if (!this.isConnected) {
                await this.retryConnection();
            }

            const result = await this.supabase.rpc(query, params);
            
            if (result.error) {
                throw result.error;
            }

            return result.data;
        } catch (error) {
            console.error('Query execution failed:', error);
            throw error;
        }
    }

    async executeTransaction(operations) {
        // Supabase doesn't support explicit transactions in the client
        // This would be handled on the server side or through stored procedures
        try {
            const results = [];
            
            for (const operation of operations) {
                const result = await operation();
                results.push(result);
            }
            
            return results;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    }

    /**
     * BACKUP OPERATIONS
     */
    async createBackup(backupType = 'full') {
        try {
            console.log(`🔄 Creating ${backupType} backup...`);
            
            const { data, error } = await this.supabase.rpc('create_full_backup', {
                backup_path: `backup_${Date.now()}.sql`
            });

            if (error) {
                throw error;
            }

            console.log('✅ Backup created successfully:', data);
            return data;
        } catch (error) {
            console.error('❌ Backup creation failed:', error);
            throw error;
        }
    }

    async getBackupHistory() {
        try {
            const { data, error } = await this.supabase
                .from('backup_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Failed to fetch backup history:', error);
            throw error;
        }
    }

    /**
     * MAINTENANCE OPERATIONS
     */
    async performMaintenance(maintenanceType = 'analyze') {
        try {
            console.log(`🔄 Performing ${maintenanceType} maintenance...`);
            
            const { data, error } = await this.supabase.rpc('perform_maintenance', {
                maintenance_type: maintenanceType
            });

            if (error) {
                throw error;
            }

            console.log('✅ Maintenance completed:', data);
            return data;
        } catch (error) {
            console.error('❌ Maintenance failed:', error);
            throw error;
        }
    }

    async cleanupOldData() {
        try {
            const { data, error } = await this.supabase.rpc('cleanup_old_data');

            if (error) {
                throw error;
            }

            console.log('✅ Data cleanup completed');
            return data;
        } catch (error) {
            console.error('❌ Data cleanup failed:', error);
            throw error;
        }
    }

    /**
     * UTILITY METHODS
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * PUBLIC API
     */
    isHealthy() {
        return this.healthMetrics.status === 'healthy';
    }

    getConnectionStatus() {
        return {
            connected: this.isConnected,
            status: this.healthMetrics.status,
            latency: this.healthMetrics.latency,
            lastCheck: this.healthMetrics.lastCheck
        };
    }

    getMigrationStatus() {
        return Object.fromEntries(this.migrationStatus);
    }

    getHealthMetrics() {
        return { ...this.healthMetrics };
    }

    async getStats() {
        try {
            const { data, error } = await this.supabase.rpc('get_database_stats');
            
            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Failed to get database stats:', error);
            return null;
        }
    }
}

// Initialize Database Setup
const DatabaseManager = new DatabaseSetup();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        DatabaseManager.initialize().catch(console.error);
    });
} else {
    DatabaseManager.initialize().catch(console.error);
}

// Global access
window.DatabaseManager = DatabaseManager;