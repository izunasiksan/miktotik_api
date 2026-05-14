-- V2 Normalization Buckets & Stored Procedures (Draft)
-- Non-breaking: apply only on new schemas or via separate migration path

-- Helper: generic time bucket aggregation with generate_series for gap fill
-- Usage: SELECT * FROM sp_time_bucket_agg(:board_id, 'download_mbps', 'avg', '2026-01-01', '2026-01-31', 'day');
CREATE OR REPLACE FUNCTION sp_time_bucket_agg(
    p_board_id UUID,
    p_metric TEXT,
    p_agg TEXT,
    p_start TIMESTAMP WITH TIME ZONE,
    p_end   TIMESTAMP WITH TIME ZONE,
    p_granularity TEXT
) RETURNS TABLE(period TIMESTAMP WITH TIME ZONE, value DOUBLE PRECISION, samples BIGINT) AS $$
DECLARE
    v_table TEXT;
    v_column TEXT;
    v_time_col TEXT := 'log_time';
    v_sql TEXT;
BEGIN
    IF p_metric = 'download_mbps' THEN v_table := 'board_speed_stats'; v_column := 'download_mbps';
    ELSIF p_metric = 'upload_mbps' THEN v_table := 'board_speed_stats'; v_column := 'upload_mbps';
    ELSIF p_metric = 'cpu_load' THEN v_table := 'board_resource_stats'; v_column := 'cpu_load';
    ELSIF p_metric = 'free_memory' THEN v_table := 'board_resource_stats'; v_column := 'free_memory';
    ELSIF p_metric = 'total_active' THEN v_table := 'board_client_stats'; v_column := 'total_active';
    ELSE
        RAISE EXCEPTION 'Unknown metric: %', p_metric;
    END IF;

    IF p_agg NOT IN ('avg','sum','min','max','count') THEN
        RAISE EXCEPTION 'Invalid agg: %', p_agg;
    END IF;

    v_sql := format($f$
        WITH raw AS (
            SELECT date_trunc(%L, %I) AS period, %s(%I::float8) AS value, count(*) AS samples
            FROM %I
            WHERE board_id = $1 AND %I >= $2 AND %I < $3
            GROUP BY 1
        ),
        timeline AS (
            SELECT generate_series(date_trunc(%L, $2), date_trunc(%L, $3 - INTERVAL '1 second'), 
                CASE 
                    WHEN %L = 'hour' THEN INTERVAL '1 hour'
                    WHEN %L = 'day' THEN INTERVAL '1 day'
                    WHEN %L = 'month' THEN INTERVAL '1 month'
                    WHEN %L = 'year' THEN INTERVAL '1 year'
                    ELSE INTERVAL '1 day'
                END
            ) AS period
        )
        SELECT t.period, COALESCE(r.value, 0)::float8 AS value, COALESCE(r.samples, 0) AS samples
        FROM timeline t
        LEFT JOIN raw r ON r.period = t.period
        ORDER BY t.period
    $f$, p_granularity, v_time_col, p_agg, v_column, v_table, v_time_col, v_time_col, p_granularity, p_granularity, p_granularity, p_granularity);

    RETURN QUERY EXECUTE v_sql USING p_board_id, p_start, p_end;
END;
$$ LANGUAGE plpgsql STABLE;

-- Index recommendation (if not already present)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_speed_brd_time ON board_speed_stats(board_id, log_time);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_stats_brd_time ON board_resource_stats(board_id, log_time);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_stats_brd_time ON board_client_stats(board_id, log_time);

