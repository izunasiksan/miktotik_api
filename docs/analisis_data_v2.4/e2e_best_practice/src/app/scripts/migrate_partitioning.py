import asyncio
import logging

from sqlalchemy import text

from app.core.database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_partitioning")


async def migrate_to_partitioning():
    tables = {
        "board_client_stats": {
            "create": """
                CREATE TABLE board_client_stats (
                    stat_id       BIGINT NOT NULL,
                    board_id      UUID REFERENCES mikrotik_boards(board_id) ON DELETE CASCADE,
                    total_hotspot INT DEFAULT 0,
                    total_pppoe   INT DEFAULT 0,
                    total_active  INT GENERATED ALWAYS AS (total_hotspot + total_pppoe) STORED,
                    accuracy_pct  NUMERIC(5,2) DEFAULT 100.00,
                    log_time      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (stat_id, log_time)
                ) PARTITION BY RANGE (log_time);
            """,
            "columns": "stat_id, board_id, total_hotspot, total_pppoe, accuracy_pct, log_time",
            "pk_col": "stat_id",
        },
        "board_resource_stats": {
            "create": """
                CREATE TABLE board_resource_stats (
                    resource_id   BIGINT NOT NULL,
                    board_id      UUID REFERENCES mikrotik_boards(board_id) ON DELETE CASCADE,
                    cpu_load      INT,
                    free_memory   BIGINT,
                    free_hdd      BIGINT,
                    uptime        INTERVAL,
                    accuracy_pct  NUMERIC(5,2) DEFAULT 100.00,
                    log_time      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (resource_id, log_time)
                ) PARTITION BY RANGE (log_time);
            """,
            "columns": "resource_id, board_id, cpu_load, free_memory, free_hdd, uptime, accuracy_pct, log_time",
            "pk_col": "resource_id",
        },
        "board_speed_stats": {
            "create": """
                CREATE TABLE board_speed_stats (
                    speed_id       BIGINT NOT NULL,
                    board_id       UUID REFERENCES mikrotik_boards(board_id) ON DELETE CASCADE,
                    interface_name VARCHAR(100) NOT NULL,
                    download_mbps  NUMERIC(15,2) DEFAULT 0,
                    upload_mbps    NUMERIC(15,2) DEFAULT 0,
                    accuracy_pct   NUMERIC(5,2) DEFAULT 100.00,
                    log_time       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (speed_id, log_time)
                ) PARTITION BY RANGE (log_time);
            """,
            "columns": "speed_id, board_id, interface_name, download_mbps, upload_mbps, accuracy_pct, log_time",
            "pk_col": "speed_id",
        },
        "board_events": {
            "create": """
                CREATE TABLE board_events (
                    event_id       BIGINT NOT NULL,
                    board_id       UUID REFERENCES mikrotik_boards(board_id) ON DELETE CASCADE,
                    event_category VARCHAR(20),
                    event_level    VARCHAR(10),
                    event_name     TEXT NOT NULL,
                    event_detail   TEXT,
                    performed_by   UUID REFERENCES master_users(user_id) ON DELETE SET NULL,
                    is_reset_event BOOLEAN DEFAULT FALSE,
                    accuracy_pct   NUMERIC(5,2) DEFAULT 100.00,
                    log_time       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (event_id, log_time)
                ) PARTITION BY RANGE (log_time);
            """,
            "columns": "event_id, board_id, event_category, event_level, event_name, event_detail, performed_by, is_reset_event, accuracy_pct, log_time",
            "pk_col": "event_id",
        },
        "board_interface_usage": {
            "create": """
                CREATE TABLE board_interface_usage (
                    usage_id       BIGINT NOT NULL,
                    board_id       UUID REFERENCES mikrotik_boards(board_id) ON DELETE CASCADE,
                    interface_name VARCHAR(100) NOT NULL,
                    total_tx_bytes BIGINT DEFAULT 0,
                    total_rx_bytes BIGINT DEFAULT 0,
                    accuracy_pct   NUMERIC(5,2) DEFAULT 100.00,
                    log_date       DATE DEFAULT CURRENT_DATE,
                    last_update    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (usage_id, log_date)
                ) PARTITION BY RANGE (log_date);
            """,
            "columns": "usage_id, board_id, interface_name, total_tx_bytes, total_rx_bytes, accuracy_pct, log_date, last_update",
            "pk_col": "usage_id",
        },
        "board_pppoe_usage": {
            "create": """
                CREATE TABLE board_pppoe_usage (
                    usage_id       BIGINT NOT NULL,
                    board_id       UUID REFERENCES mikrotik_boards(board_id) ON DELETE CASCADE,
                    pppoe_username VARCHAR(100) NOT NULL,
                    upload_bytes   BIGINT DEFAULT 0,
                    download_bytes BIGINT DEFAULT 0,
                    accuracy_pct   NUMERIC(5,2) DEFAULT 100.00,
                    log_date       DATE DEFAULT CURRENT_DATE,
                    last_update    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (usage_id, log_date)
                ) PARTITION BY RANGE (log_date);
            """,
            "columns": "usage_id, board_id, pppoe_username, upload_bytes, download_bytes, accuracy_pct, log_date, last_update",
            "pk_col": "usage_id",
        },
        "hotspot_usage_raw": {
            "create": """
                CREATE TABLE hotspot_usage_raw (
                    raw_id         BIGINT NOT NULL,
                    board_id       UUID REFERENCES mikrotik_boards(board_id) ON DELETE CASCADE,
                    username       VARCHAR(100) NOT NULL,
                    daily_download BIGINT DEFAULT 0,
                    daily_upload   BIGINT DEFAULT 0,
                    daily_uptime   BIGINT DEFAULT 0,
                    accuracy_pct   NUMERIC(5,2) DEFAULT 100.00,
                    log_date       DATE DEFAULT CURRENT_DATE,
                    PRIMARY KEY (raw_id, log_date)
                ) PARTITION BY RANGE (log_date);
            """,
            "columns": "raw_id, board_id, username, daily_download, daily_upload, daily_uptime, accuracy_pct, log_date",
            "pk_col": "raw_id",
        },
    }

    async with SessionLocal() as db:
        for table_name, config in tables.items():
            try:
                logger.info(f"Checking {table_name}...")

                # Check if already partitioned
                res = await db.execute(
                    text(f"SELECT relkind FROM pg_class WHERE relname = '{table_name}'")
                )
                row = res.fetchone()
                if row and row[0] == "p":
                    logger.info(f"Table {table_name} is already partitioned.")
                    continue

                # 1. Rename old table
                await db.execute(
                    text(f"ALTER TABLE {table_name} RENAME TO {table_name}_old")
                )

                # 2. Create new partitioned table (without BIGSERIAL to keep IDs)
                await db.execute(text(config["create"]))

                # 3. Create default partition
                await db.execute(
                    text(
                        f"CREATE TABLE {table_name}_default PARTITION OF {table_name} DEFAULT"
                    )
                )

                # 4. Migrate data
                await db.execute(
                    text(
                        f"INSERT INTO {table_name} ({config['columns']}) SELECT {config['columns']} FROM {table_name}_old"
                    )
                )

                # 5. Restore sequence
                # Create a new sequence for the new table
                seq_name = f"{table_name}_{config['pk_col']}_seq"
                await db.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {seq_name}"))
                await db.execute(
                    text(
                        f"SELECT setval('{seq_name}', (SELECT max({config['pk_col']}) FROM {table_name}))"
                    )
                )
                await db.execute(
                    text(
                        f"ALTER TABLE {table_name} ALTER COLUMN {config['pk_col']} SET DEFAULT nextval('{seq_name}')"
                    )
                )

                # 6. Drop old table
                await db.execute(text(f"DROP TABLE {table_name}_old CASCADE"))

                logger.info(f"Successfully migrated {table_name} to partitioning.")
            except Exception as e:
                logger.error(f"Failed to migrate {table_name}: {e}")
                await db.rollback()
                continue

        await db.commit()
    logger.info("Partitioning migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate_to_partitioning())
