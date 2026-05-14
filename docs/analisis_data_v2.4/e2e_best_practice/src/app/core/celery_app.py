# UPDATED v2.4 - INDIKATOR SINKRONISASI
from celery import Celery

from app.core.config import settings

redis_url = settings.FINAL_REDIS_URL

celery_app = Celery(
    "mikrotik_api",
    broker=redis_url,
    backend=redis_url,
    include=[
        "app.tasks.pipeline_tasks",
        "app.tasks.normalization_tasks",
        "app.tasks.polling_tasks",
    ],
)

celery_app.conf.beat_schedule = {
    "polling-cycle-every-5-min": {
        "task": "app.tasks.polling_tasks.run_polling_cycle_task",
        "schedule": 60.0 * settings.POLLING_INTERVAL_MINUTES,
    },
    "daily-aggregation-at-00-30": {
        "task": "app.tasks.polling_tasks.run_daily_aggregation_task",
        "schedule": {
            "hour": 0,
            "minute": 30,
        },
    },
    "daily-backup-at-02-00": {
        "task": "app.tasks.polling_tasks.run_daily_backup_task",
        "schedule": {
            "hour": 2,
            "minute": 0,
        },
    },
    "monthly-aggregation-1st-day": {
        "task": "app.tasks.polling_tasks.run_monthly_aggregation_task",
        "schedule": {
            "day_of_month": 1,
            "hour": 1,
            "minute": 0,
        },
    },
    "weekly-maintenance-sun-03-00": {
        "task": "app.tasks.polling_tasks.run_weekly_maintenance_task",
        "schedule": {
            "day_of_week": "sun",
            "hour": 3,
            "minute": 0,
        },
    },
    "daily-maintenance-02-30": {
        "task": "app.tasks.polling_tasks.run_daily_maintenance_task",
        "schedule": {
            "hour": 2,
            "minute": 30,
        },
    },
}

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    broker_connection_retry_on_startup=True,
    broker_transport_options={"visibility_timeout": 3600},
    result_expires=3600,
)
