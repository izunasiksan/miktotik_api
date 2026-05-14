# UPDATE 2.4 - E2E Best Practice Python Implementation
# This file is the V1 API router for the Data Analysis service.

from fastapi import APIRouter

from app.api.v1.endpoints import analysis, boards
from app.api.endpoints import reports

api_router = APIRouter()

# Register endpoint modules with distinct tags
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(boards.router, prefix="/boards", tags=["boards"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
