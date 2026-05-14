# UPDATED v2.4 - INDIKATOR SINKRONISASI
from fastapi import APIRouter
from app.api.endpoints import (
    boards, dashboard, reports, auth, users, 
    backups, telegram, automation, audit, developer, analysis
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(boards.router, prefix="/boards", tags=["boards"])
api_router.include_router(backups.router, prefix="/backups", tags=["backups"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(telegram.router, prefix="/telegram", tags=["telegram"])
api_router.include_router(automation.router, prefix="/automation", tags=["automation"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(developer.router, prefix="/developer", tags=["developer"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
