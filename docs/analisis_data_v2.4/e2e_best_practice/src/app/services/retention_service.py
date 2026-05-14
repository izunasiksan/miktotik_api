import asyncio
import logging
import os
from datetime import datetime, timedelta

from sqlalchemy import delete, select, text

from app.core.database import SessionLocal, engine
from app.models.mikrotik import (
    BoardBackup,
    BoardClientStat,
    BoardEvent,
    BoardInterfaceUsage,
    BoardPppoeUsage,
    BoardResourceStat,
    BoardSpeedStat,
    HotspotUsageRaw,
)

logger = logging.getLogger("retention_service")


async def prune_resource_stats(days_retention: int = 30):
    """
    Menghapus data board_resource_stats yang lebih tua dari days_retention.
    """
    logger.info(
        f"🧹 Starting resource stats pruning (retention: {days_retention} days)..."
    )
    async with SessionLocal() as db:
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_retention)
            stmt = (
                delete(BoardResourceStat)
                .where(BoardResourceStat.log_time < cutoff_date)
                .execution_options(synchronize_session=False)
            )
            result = await db.execute(stmt)
            await db.commit()
            deleted_count = int(getattr(result, "rowcount", 0))
            logger.info(f"✅ Deleted {deleted_count} old resource stats records.")
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to prune resource stats: {e}")


async def prune_raw_data(days_retention: int = 30):
    """
    Rule 2.2: Data mentah > 30 hari HARUS dihapus atau diarsipkan.
    Pruning untuk data statistik mentah harian.
    """
    logger.info(f"🧹 Starting raw data pruning (retention: {days_retention} days)...")
    async with SessionLocal() as db:
        cutoff_date = datetime.utcnow() - timedelta(days=days_retention)
        cutoff_date_only = cutoff_date.date()

        tables_to_prune = [
            (BoardClientStat, BoardClientStat.log_time, "client_stats"),
            (BoardSpeedStat, BoardSpeedStat.log_time, "speed_stats"),
            (HotspotUsageRaw, HotspotUsageRaw.log_date, "hotspot_usage_raw"),
            (BoardPppoeUsage, BoardPppoeUsage.log_date, "pppoe_usage"),
            (BoardInterfaceUsage, BoardInterfaceUsage.log_date, "interface_usage"),
        ]

        for model, col, name in tables_to_prune:
            try:
                stmt = delete(model).where(
                    col < (cutoff_date if "log_time" in col.key else cutoff_date_only)
                )
                result = await db.execute(stmt)
                await db.commit()
                deleted_count = int(getattr(result, "rowcount", 0))
                logger.info(f"✅ Deleted {deleted_count} old {name} records.")
            except Exception as e:
                await db.rollback()
                logger.error(f"❌ Failed to prune {name}: {e}")


async def prune_events(days_retention: int = 90):
    """
    Menghapus data board_events yang lebih tua dari days_retention,
    kecuali event dengan level 'critical' atau 'error'.
    """
    logger.info(f"🧹 Starting events pruning (retention: {days_retention} days)...")
    async with SessionLocal() as db:
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_retention)
            # Delete events older than cutoff AND (level != critical AND level != error)
            stmt = (
                delete(BoardEvent)
                .where(
                    BoardEvent.log_time < cutoff_date,
                    BoardEvent.event_level.not_in(["critical", "error"]),
                )
                .execution_options(synchronize_session=False)
            )
            result = await db.execute(stmt)
            await db.commit()
            deleted_count = int(getattr(result, "rowcount", 0))
            logger.info(f"✅ Deleted {deleted_count} old event records.")
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to prune events: {e}")


async def vacuum_database():
    """
    Menjalankan VACUUM ANALYZE untuk mengoptimalkan database.
    Harus dijalankan di luar transaction block (autocommit).
    """
    logger.info("🧹 Starting database vacuum...")

    try:
        # Create a connection with isolation_level="AUTOCOMMIT"
        async with engine.connect() as conn:
            # We need to set the isolation level to AUTOCOMMIT for VACUUM
            await conn.execution_options(isolation_level="AUTOCOMMIT")
            # Execute VACUUM ANALYZE
            await conn.execute(text("VACUUM ANALYZE"))
            logger.info("✅ Database vacuum completed.")
    except Exception as e:
        logger.error(f"❌ Failed to vacuum database: {e}")


async def verify_backups():
    """
    Memverifikasi integritas file backup fisik berdasarkan data di database.
    """
    logger.info("🔍 Starting backup integrity check...")
    async with SessionLocal() as db:
        try:
            # Get latest 100 backups to verify (avoid checking thousands of old files)
            stmt = select(BoardBackup).order_by(BoardBackup.log_date.desc()).limit(100)
            result = await db.execute(stmt)
            backups = result.scalars().all()

            missing_count = 0
            invalid_size_count = 0

            loop = asyncio.get_running_loop()

            for backup in backups:
                file_path_val = getattr(backup, "file_location", None)
                file_path = str(file_path_val) if file_path_val is not None else ""

                # Use run_in_executor for blocking OS calls
                exists = await loop.run_in_executor(None, os.path.exists, file_path)

                if not exists:
                    logger.warning(
                        f"⚠️ Missing backup file: {file_path} (ID: {backup.backup_id})"
                    )
                    missing_count += 1
                else:
                    size = await loop.run_in_executor(None, os.path.getsize, file_path)
                    if size == 0:
                        logger.warning(
                            f"⚠️ Empty backup file: {file_path} (ID: {backup.backup_id})"
                        )
                        invalid_size_count += 1

            logger.info(
                f"✅ Backup verification done. Missing: {missing_count}, Empty: {invalid_size_count}"
            )

        except Exception as e:
            logger.error(f"❌ Failed to verify backups: {e}")


async def run_daily_maintenance():
    """
    Wrapper function untuk dijalankan oleh scheduler (Harian).
    """
    logger.info("🚀 Starting Daily Maintenance Job")
    await verify_backups()
    logger.info("🏁 Daily Maintenance Job Completed")


async def run_weekly_maintenance():
    """
    Wrapper function untuk dijalankan oleh scheduler (Mingguan).
    """
    logger.info("🚀 Starting Weekly Maintenance Job")
    await prune_resource_stats()
    await prune_raw_data()
    await prune_events()
    await vacuum_database()
    logger.info("🏁 Weekly Maintenance Job Completed")
