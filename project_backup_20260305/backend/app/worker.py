import asyncio
import signal
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import sys
import os

# Ensure the parent directory is in sys.path so 'app' module can be found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.services.polling_worker import run_polling_cycle
from app.services.aggregation_service import run_daily_aggregation_job, run_monthly_aggregation_job
from app.services.retention_service import run_weekly_maintenance
from app.scheduler.cron_tasks import run_daily_backups
# Ensure all models are loaded for SQLAlchemy relationships
import app.models.user  # noqa: F401
import app.models.mikrotik  # noqa: F401

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

async def main():
    """
    Worker Entrypoint.
    Runs the APScheduler for background tasks (Polling, Backup, Aggregation).
    """
    scheduler = AsyncIOScheduler()
    
    # 1. Polling Job
    scheduler.add_job(
        run_polling_cycle, 
        'interval', 
        minutes=settings.POLLING_INTERVAL_MINUTES,
        id="polling_job",
        replace_existing=True
    )
    logger.info(f"✅ Job Added: Polling (every {settings.POLLING_INTERVAL_MINUTES} mins)")

    # 2. Daily Aggregation (00:30 AM)
    scheduler.add_job(
        run_daily_aggregation_job,
        'cron',
        hour=0,
        minute=30,
        id="daily_aggregation",
        replace_existing=True
    )
    logger.info("✅ Job Added: Daily Aggregation (00:30 AM)")

    # 3. Daily Backup (02:00 AM)
    scheduler.add_job(
        run_daily_backups,
        'cron',
        hour=2,
        minute=0,
        id="daily_backup",
        replace_existing=True
    )
    logger.info("✅ Job Added: Daily Backup (02:00 AM)")

    # 4. Monthly Aggregation (1st day of month at 01:00 AM)
    scheduler.add_job(
        run_monthly_aggregation_job,
        'cron',
        day=1,
        hour=1,
        minute=0,
        id="monthly_aggregation",
        replace_existing=True
    )
    logger.info("✅ Job Added: Monthly Aggregation (1st day 01:00 AM)")
    
    # 5. Weekly Maintenance (Sundays at 03:00 AM)
    scheduler.add_job(
        run_weekly_maintenance,
        'cron',
        day_of_week='sun',
        hour=3,
        minute=0,
        id="weekly_maintenance",
        replace_existing=True
    )
    logger.info("✅ Job Added: Weekly Maintenance (Sun 03:00 AM)")
    
    # Start Scheduler
    scheduler.start()
    logger.info("🚀 Worker Scheduler Started. Press Ctrl+C to exit.")
    
    # Keep the loop alive
    try:
        # Use a Future to keep the loop running indefinitely
        await asyncio.Event().wait()
    except (KeyboardInterrupt, SystemExit):
        logger.info("🛑 Shutting down worker...")
        scheduler.shutdown()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
