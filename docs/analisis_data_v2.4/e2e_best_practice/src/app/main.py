# UPDATE 2.4 - E2E Best Practice Python Migration: Migrated Scheduler to Celery Beat
# UPDATED v2.4 - INDIKATOR SINKRONISASI
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import cast

from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

import app.models  # noqa: F401, E402
from app.api.api import api_router  # noqa: E402
from app.api_v2.api import api_v2_router  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.limiter import limiter, register_violation  # noqa: E402
from app.core.middleware_profiler import ProfilerMiddleware  # noqa: E402
from app.core.middleware_security import (  # noqa: E402
    BlacklistMiddleware,
    IPWhitelistMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.celery_app import celery_app  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Scheduler is now handled by Celery Beat
    if settings.ENABLE_SCHEDULER:
        print("🚀 Background tasks are enabled (managed by Celery Beat).")
    else:
        print("⚠️ Background tasks disabled via configuration.")

    yield
    # Shutdown: No local scheduler to stop


app_main = FastAPI(
    title="Mikrotik Management API",
    description="API untuk manajemen router Mikrotik secara asinkron",
    version="1.0.0",
    lifespan=lifespan,
)
app = app_main  # For external access if needed


async def custom_rate_limit_exceeded_handler(
    request: Request, exc: Exception
) -> Response:
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
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
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
app.add_middleware(
    IPWhitelistMiddleware,
    allowed_ips=settings.ALLOWED_ADMIN_IPS,
    protected_paths=["/docs", "/redoc", "/metrics"],
)
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

# Setup Prometheus Instrumentator
if settings.ENABLE_METRICS:
    Instrumentator().instrument(app).expose(
        app, include_in_schema=False, tags=["monitoring"]
    )

app.include_router(api_router, prefix="/api/v1")
app.include_router(api_v2_router, prefix="/api/v2")


@app.get("/")
async def root():
    return {"message": "CORS sudah aktif!"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
