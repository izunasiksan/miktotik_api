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
    ],
)

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
