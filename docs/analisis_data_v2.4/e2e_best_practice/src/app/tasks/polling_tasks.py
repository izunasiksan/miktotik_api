# UPDATE 2.4 Dengan Nama Topik yang jelas: Migrasi Polling & Cron ke Celery
# UPDATED v2.4 - INDIKATOR SINKRONISASI
import asyncio
import logging

from app.core.celery_app import celery_app
from app.scheduler.cron_tasks import run_daily_backups
from app.services.aggregation_service import (
    run_daily_aggregation_job,
    run_monthly_aggregation_job,
)
from app.services.polling_worker import run_polling_cycle
from app.services.retention_service import run_daily_maintenance, run_weekly_maintenance

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.polling_tasks.run_polling_cycle_task")
def run_polling_cycle_task():
    """
    Task Celery untuk menjalankan polling cycle secara periodik.
    Menggantikan AsyncIOScheduler di main.py.
    """
    logger.info("UPDATE 2.4 - Executing Polling Cycle Task via Celery")
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(run_polling_cycle())


@celery_app.task(name="app.tasks.polling_tasks.run_daily_aggregation_task")
def run_daily_aggregation_task():
    """
    Task Celery untuk agregasi data harian.
    """
    logger.info("UPDATE 2.4 - Executing Daily Aggregation Task via Celery")
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(run_daily_aggregation_job())


@celery_app.task(name="app.tasks.polling_tasks.run_monthly_aggregation_task")
def run_monthly_aggregation_task():
    """
    Task Celery untuk agregasi data bulanan.
    """
    logger.info("UPDATE 2.4 - Executing Monthly Aggregation Task via Celery")
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(run_monthly_aggregation_job())


@celery_app.task(name="app.tasks.polling_tasks.run_daily_backup_task")
def run_daily_backup_task():
    """
    Task Celery untuk backup router harian.
    """
    logger.info("UPDATE 2.4 - Executing Daily Backup Task via Celery")
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(run_daily_backups())


@celery_app.task(name="app.tasks.polling_tasks.run_weekly_maintenance_task")
def run_weekly_maintenance_task():
    """
    Task Celery untuk maintenance mingguan (Pruning & Vacuum).
    """
    logger.info("UPDATE 2.4 - Executing Weekly Maintenance Task via Celery")
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(run_weekly_maintenance())


@celery_app.task(name="app.tasks.polling_tasks.run_daily_maintenance_task")
def run_daily_maintenance_task():
    """
    Task Celery untuk maintenance harian (Backup Verification).
    """
    logger.info("UPDATE 2.4 - Executing Daily Maintenance Task via Celery")
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(run_daily_maintenance())
