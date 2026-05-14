from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import sys
import os

# Ensure the parent directory is in sys.path so 'app' module can be found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.middleware_security import SecurityHeadersMiddleware, IPWhitelistMiddleware, BlacklistMiddleware
from app.core.middleware_profiler import ProfilerMiddleware
from typing import cast

from app.core.config import settings
from app.core.limiter import limiter, register_violation
from app.api.api import api_router
from app.api_v2.api import api_v2_router
import app.models  # Ensure all models are registered
from app.services.polling_worker import run_polling_cycle
from app.services.aggregation_service import run_daily_aggregation_job, run_monthly_aggregation_job
from app.services.retention_service import run_weekly_maintenance, run_daily_maintenance
from app.scheduler.cron_tasks import run_daily_backups

# Initialize Scheduler
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start Scheduler (Only if ENABLE_SCHEDULER is True)
    if settings.ENABLE_SCHEDULER:
        scheduler.add_job(
            run_polling_cycle, 
            'interval', 
            minutes=settings.POLLING_INTERVAL_MINUTES,
            id="polling_job",
            replace_existing=True,
            coalesce=True,           # Prevent execution pile-up if one run is slow
            max_instances=1,         # Only one instance of this job running at a time
            misfire_grace_time=60    # Allow 60s delay, otherwise skip
        )
        # Daily Aggregation (00:30 AM)
        scheduler.add_job(
            run_daily_aggregation_job,
            'cron',
            hour=0,
            minute=30,
            id="daily_aggregation",
            replace_existing=True,
            coalesce=True,
            max_instances=1
        )
        # Daily Backup (02:00 AM)
        scheduler.add_job(
            run_daily_backups,
            'cron',
            hour=2,
            minute=0,
            id="daily_backup",
            replace_existing=True,
            coalesce=True,
            max_instances=1
        )
        # Monthly Aggregation (1st day of month at 01:00 AM)
        scheduler.add_job(
            run_monthly_aggregation_job,
            'cron',
            day=1,
            hour=1,
            minute=0,
            id="monthly_aggregation",
            replace_existing=True,
            coalesce=True,
            max_instances=1
        )
        
        # Weekly Maintenance: Pruning & Vacuum (Sunday at 03:00 AM)
        scheduler.add_job(
            run_weekly_maintenance,
            'cron',
            day_of_week='sun',
            hour=3,
            minute=0,
            id="weekly_maintenance",
            replace_existing=True,
            coalesce=True,
            max_instances=1
        )
        
        # Daily Maintenance: Backup Verification (Daily at 02:30 AM, after backup)
        scheduler.add_job(
            run_daily_maintenance,
            'cron',
            hour=2,
            minute=30,
            id="daily_maintenance",
            replace_existing=True,
            coalesce=True,
            max_instances=1
        )
        
        scheduler.start()
        print("🚀 Scheduler started. Polling every", settings.POLLING_INTERVAL_MINUTES, "minutes.")
    else:
        print("⚠️ Scheduler disabled via configuration (running in API mode only).")
        
    yield
    
    # Shutdown: Stop Scheduler
    if settings.ENABLE_SCHEDULER and scheduler.running:
        scheduler.shutdown()
        print("🛑 Scheduler shutdown.")

from starlette.middleware.base import BaseHTTPMiddleware
import traceback

app = FastAPI(
    title="Mikrotik Management API",
    description="API untuk manajemen router Mikrotik secara asinkron",
    version="1.0.0",
    lifespan=lifespan
)

async def custom_rate_limit_exceeded_handler(request: Request, exc: Exception) -> Response:
    client_ip = "0.0.0.0"
    if request.client:
        client_ip = request.client.host
        
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0]
    
    # Register violation in Redis (Jail2Ban)
    await register_violation(client_ip)
    
    # Return default 429 response
    return _rate_limit_exceeded_handler(request, cast(RateLimitExceeded, exc))

# Setup SlowAPI Limiter
app.state.limiter = limiter

# Konfigurasi CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://127.0.0.1",
]

# Tambahkan origin dari settings jika ada
if hasattr(settings, "BACKEND_CORS_ORIGINS") and settings.BACKEND_CORS_ORIGINS:
    for origin in settings.BACKEND_CORS_ORIGINS:
        if origin not in origins:
            origins.append(origin.strip("/"))

# Urutan Middleware: CORS harus paling luar (terakhir di-add) agar menangkap semua response
# Dalam FastAPI, middleware yang di-add TERAKHIR akan dieksekusi PERTAMA (LIFO)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(ProfilerMiddleware)
app.add_middleware(IPWhitelistMiddleware, allowed_ips=settings.ALLOWED_ADMIN_IPS, protected_paths=["/docs", "/redoc", "/metrics"])
app.add_middleware(BlacklistMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# Setup Prometheus Instrumentator (Only expose metrics if configured securely in production)
# In production, use reverse proxy or sidecar for authentication
# Instrumentator().instrument(app).expose(app)

app.include_router(api_router, prefix="/api/v1")
app.include_router(api_v2_router, prefix="/api/v2")

@app.get("/")
async def root():
    return {"message": "CORS sudah aktif!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
