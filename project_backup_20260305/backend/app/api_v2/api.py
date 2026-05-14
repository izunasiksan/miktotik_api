from fastapi import APIRouter
from app.api_v2.endpoints import analysis_v2, normalization_v2

api_v2_router = APIRouter()

# V2 routes are fully isolated from V1
api_v2_router.include_router(analysis_v2.router, prefix="/analysis", tags=["analysis_v2"])
api_v2_router.include_router(normalization_v2.router, prefix="/normalization", tags=["normalization_v2"])
