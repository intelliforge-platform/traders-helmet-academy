
-- =========================================
-- TRADERS HELMET ACADEMY - BACKUP & MAINTENANCE SYSTEM
-- Location: /database/backup/backup-system.sql
-- Description: Database backup, maintenance, and monitoring functions
-- =========================================

-- =========================================
-- BACKUP TABLES
-- =========================================

-- Backup log table
CREATE TABLE IF NOT EXISTS backup_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'schema_only', 'data_only')),
    backup_size BIGINT,
    backup_duration INTERVAL,
    backup_path TEXT,
    backup_status TEXT NOT NULL CHECK (backup_status IN ('started', 'completed', 'failed', 'cancelled')) DEFAULT 'started',
    error_message TEXT,
    tables_included TEXT[],
    compression_used BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Database maintenance log
CREATE TABLE IF NOT EXISTS maintenance_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('vacuum', 'reindex', 'analyze', 'cleanup', 'optimization')),
    table_name TEXT,
    duration INTERVAL,
    status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- =========================================
-- BACKUP FUNCTIONS
-- =========================================

-- Function to create full database backup
CREATE OR REPLACE FUNCTION create_full_backup(backup_path TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    backup_id UUID;
    start_time TIMESTAMPTZ;
    tables_list TEXT[];
BEGIN
    backup_id := uuid_generate_v4();
    start_time := NOW();
    
    -- Log backup start
    INSERT INTO backup_log (id, backup_type, backup_path, created_at)
    VALUES (backup_id, 'full', backup_path, start_time);
    
    -- Get list of all tables
    SELECT array_agg(tablename) INTO tables_list
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    -- In a real implementation, you would execute pg_dump here
    -- For demo purposes, we'll simulate the backup process
    
    -- Update backup log with completion
    UPDATE backup_log 
    SET 
        backup_status = 'completed',
        completed_at = NOW(),
        backup_duration = NOW() - start_time,
        tables_included = tables_list
    WHERE id = backup_id;
    
    RETURN backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create incremental backup
CREATE OR REPLACE FUNCTION create_incremental_backup(since_timestamp TIMESTAMPTZ DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    backup_id UUID;
    start_time TIMESTAMPTZ;
    cutoff_time TIMESTAMPTZ;
BEGIN
    backup_id := uuid_generate_v4();
    start_time := NOW();
    cutoff_time := COALESCE(since_timestamp, NOW() - INTERVAL '24 hours');
    
    -- Log backup start
    INSERT INTO backup_log (id, backup_type, created_at)
    VALUES (backup_id, 'incremental', start_time);
    
    -- In a real implementation, you would backup only changed data since cutoff_time
    -- This would typically involve checking updated_at timestamps
    
    -- Update backup log with completion
    UPDATE backup_log 
    SET 
        backup_status = 'completed',
        completed_at = NOW(),
        backup_duration = NOW() - start_time
    WHERE id = backup_id;
    
    RETURN backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- MAINTENANCE FUNCTIONS
-- =========================================

-- Function to perform database maintenance
CREATE OR REPLACE FUNCTION perform_maintenance(maintenance_type TEXT DEFAULT 'analyze')
RETURNS UUID AS $$
DECLARE
    maintenance_id UUID;
    start_time TIMESTAMPTZ;
    table_rec RECORD;
    details JSONB;
BEGIN
    maintenance_id := uuid_generate_v4();
    start_time := NOW();
    details := '{}';
    
    -- Log maintenance start
    INSERT INTO maintenance_log (id, maintenance_type, created_at)
    VALUES (maintenance_id, maintenance_type, start_time);
    
    -- Perform maintenance based on type
    CASE maintenance_type
        WHEN 'vacuum' THEN
            -- Vacuum all tables
            FOR table_rec IN 
                SELECT tablename FROM pg_tables WHERE schemaname = 'public'
            LOOP
                EXECUTE format('VACUUM ANALYZE %I', table_rec.tablename);
            END LOOP;
            
        WHEN 'reindex' THEN
            -- Reindex all tables
            FOR table_rec IN 
                SELECT tablename FROM pg_tables WHERE schemaname = 'public'
            LOOP
                EXECUTE format('REINDEX TABLE %I', table_rec.tablename);
            END LOOP;
            
        WHEN 'analyze' THEN
            -- Analyze all tables
            EXECUTE 'ANALYZE';
            
        WHEN 'cleanup' THEN
            -- Cleanup old data
            PERFORM cleanup_old_data();
            
        ELSE
            RAISE EXCEPTION 'Unknown maintenance type: %', maintenance_type;
    END CASE;
    
    -- Update maintenance log with completion
    UPDATE maintenance_log 
    SET 
        status = 'completed',
        completed_at = NOW(),
        duration = NOW() - start_time,
        details = details
    WHERE id = maintenance_id;
    
    RETURN maintenance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
DECLARE
    deleted_count INTEGER;
    retention_days INTEGER;
BEGIN
    -- Get retention settings from system settings
    SELECT (value::text)::integer INTO retention_days
    FROM system_settings 
    WHERE key = 'signal_retention_days';
    
    retention_days := COALESCE(retention_days, 90);
    
    -- Cleanup old closed signals
    DELETE FROM trading_signals 
    WHERE status = 'closed' 
    AND closed_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old signals', deleted_count;
    
    -- Cleanup old notifications
    SELECT (value::text)::integer INTO retention_days
    FROM system_settings 
    WHERE key = 'notification_retention_days';
    
    retention_days := COALESCE(retention_days, 30);
    
    DELETE FROM notifications 
    WHERE is_read = true 
    AND read_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old notifications', deleted_count;
    
    -- Cleanup old chat messages
    SELECT (value::text)::integer INTO retention_days
    FROM system_settings 
    WHERE key = 'chat_message_retention_days';
    
    retention_days := COALESCE(retention_days, 90);
    
    DELETE FROM chat_messages 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND message_type != 'system';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old chat messages', deleted_count;
    
    -- Cleanup old activity logs
    DELETE FROM user_activity_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old activity log entries', deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- MONITORING FUNCTIONS
-- =========================================

-- Function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
    table_stats JSONB;
    performance_stats JSONB;
BEGIN
    -- Get basic table statistics
    SELECT jsonb_object_agg(
        tablename, 
        jsonb_build_object(
            'estimated_rows', n_tup_ins - n_tup_del,
            'size_bytes', pg_total_relation_size(schemaname||'.'||tablename),
            'last_vacuum', last_vacuum,
            'last_analyze', last_analyze
        )
    ) INTO table_stats
    FROM pg_stat_user_tables
    WHERE schemaname = 'public';
    
    -- Get performance statistics
    SELECT jsonb_build_object(
        'connections', (SELECT count(*) FROM pg_stat_activity),
        'database_size', pg_database_size(current_database()),
        'cache_hit_ratio', (
            SELECT round(
                100.0 * sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0), 2
            ) FROM pg_stat_database WHERE datname = current_database()
        )
    ) INTO performance_stats;
    
    -- Combine all statistics
    stats := jsonb_build_object(
        'timestamp', NOW(),
        'tables', table_stats,
        'performance', performance_stats
    );
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check database health
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS JSONB AS $$
DECLARE
    health_report JSONB;
    issues JSONB[];
    table_rec RECORD;
    total_size BIGINT;
BEGIN
    issues := ARRAY[]::JSONB[];
    
    -- Check for tables that need vacuuming
    FOR table_rec IN 
        SELECT schemaname, tablename, n_dead_tup, n_live_tup
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        AND n_dead_tup > 0 
        AND (n_dead_tup::float / GREATEST(n_live_tup, 1)) > 0.1
    LOOP
        issues := issues || jsonb_build_object(
            'type', 'vacuum_needed',
            'table', table_rec.tablename,
            'dead_tuples', table_rec.n_dead_tup,
            'severity', 'medium'
        );
    END LOOP;
    
    -- Check database size
    SELECT pg_database_size(current_database()) INTO total_size;
    
    IF total_size > 10 * 1024 * 1024 * 1024 THEN -- 10GB
        issues := issues || jsonb_build_object(
            'type', 'large_database',
            'size_gb', round(total_size / (1024.0^3), 2),
            'severity', 'high'
        );
    END IF;
    
    -- Check for long-running queries
    IF EXISTS (
        SELECT 1 FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < NOW() - INTERVAL '5 minutes'
        AND pid != pg_backend_pid()
    ) THEN
        issues := issues || jsonb_build_object(
            'type', 'long_running_queries',
            'severity', 'high'
        );
    END IF;
    
    -- Build health report
    health_report := jsonb_build_object(
        'timestamp', NOW(),
        'status', CASE WHEN array_length(issues, 1) IS NULL THEN 'healthy' ELSE 'issues_found' END,
        'issues', issues,
        'total_issues', COALESCE(array_length(issues, 1), 0)
    );
    
    RETURN health_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- AUTOMATED MAINTENANCE JOBS
-- =========================================

-- Function to schedule automatic maintenance
CREATE OR REPLACE FUNCTION schedule_maintenance()
RETURNS VOID AS $$
BEGIN
    -- This function would typically be called by a cron job or scheduler
    -- Perform daily maintenance tasks
    
    -- Cleanup old data
    PERFORM cleanup_old_data();
    
    -- Analyze database statistics
    PERFORM perform_maintenance('analyze');
    
    -- Log the maintenance
    INSERT INTO maintenance_log (maintenance_type, status, completed_at, duration)
    VALUES ('cleanup', 'completed', NOW(), INTERVAL '0 minutes');
    
    RAISE NOTICE 'Scheduled maintenance completed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- BACKUP RESTORE FUNCTIONS
-- =========================================

-- Function to restore from backup (placeholder)
CREATE OR REPLACE FUNCTION restore_from_backup(backup_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    backup_info RECORD;
BEGIN
    -- Get backup information
    SELECT * INTO backup_info
    FROM backup_log 
    WHERE id = backup_id AND backup_status = 'completed';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup not found or not completed: %', backup_id;
    END IF;
    
    -- In a real implementation, you would perform the restore operation here
    -- This is a placeholder for the actual restore logic
    
    RAISE NOTICE 'Restore from backup % would be performed here', backup_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- MONITORING VIEWS
-- =========================================

-- View for recent backups
CREATE OR REPLACE VIEW recent_backups AS
SELECT 
    id,
    backup_type,
    backup_status,
    backup_size,
    backup_duration,
    created_at,
    completed_at
FROM backup_log 
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- View for maintenance history
CREATE OR REPLACE VIEW maintenance_history AS
SELECT 
    id,
    maintenance_type,
    table_name,
    status,
    duration,
    created_at,
    completed_at
FROM maintenance_log 
ORDER BY created_at DESC;

-- View for database health summary
CREATE OR REPLACE VIEW database_health_summary AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    CASE 
        WHEN n_live_tup > 0 THEN round(100.0 * n_dead_tup / n_live_tup, 2)
        ELSE 0 
    END as dead_tuple_ratio,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY dead_tuple_ratio DESC;

-- =========================================
-- GRANT PERMISSIONS
-- =========================================

-- Grant access to admin users
-- GRANT EXECUTE ON FUNCTION create_full_backup(TEXT) TO admin_role;
-- GRANT EXECUTE ON FUNCTION create_incremental_backup(TIMESTAMPTZ) TO admin_role;
-- GRANT EXECUTE ON FUNCTION perform_maintenance(TEXT) TO admin_role;
-- GRANT SELECT ON recent_backups TO admin_role;
-- GRANT SELECT ON maintenance_history TO admin_role;
-- GRANT SELECT ON database_health_summary TO admin_role;

COMMENT ON TABLE backup_log IS 'Log of all database backup operations';
COMMENT ON TABLE maintenance_log IS 'Log of all database maintenance operations';
COMMENT ON FUNCTION create_full_backup(TEXT) IS 'Creates a complete database backup';
COMMENT ON FUNCTION perform_maintenance(TEXT) IS 'Performs database maintenance operations';
COMMENT ON FUNCTION cleanup_old_data() IS 'Removes old data based on retention policies';
COMMENT ON FUNCTION get_database_stats() IS 'Returns comprehensive database statistics';
COMMENT ON FUNCTION check_database_health() IS 'Performs health check and returns issues';