import json
import logging
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.database import get_db
from app.db.redis import redis_client
from app.models.mikrotik import MikrotikBoard
from app.models.user import MasterUser
from app.schemas.mikrotik import DashboardSummaryResponse

# Setup logger
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/summary/", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Get overall dashboard summary.
    """
    cache_key = "dashboard:summary"
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        # Fail silently for cache, but log at warning level
        logger.warning(f"Redis connection error (get): {e}. Proceeding without cache.")

    total_boards = await db.scalar(select(func.count(MikrotikBoard.board_id)))
    online_boards = await db.scalar(
        select(func.count(MikrotikBoard.board_id)).where(
            MikrotikBoard.is_online.is_(True)
        )
    )
    offline_boards = await db.scalar(
        select(func.count(MikrotikBoard.board_id)).where(
            MikrotikBoard.is_online.is_(False)
        )
    )
    maintenance_boards = await db.scalar(
        select(func.count(MikrotikBoard.board_id)).where(
            MikrotikBoard.is_maintenance.is_(True)
        )
    )

    # UPDATE 2.4.1 Sinkronisasi Naming Convention (camelCase)
    redis_status = "ONLINE" if redis_client._enabled else "OFFLINE"
    
    result_dict = {
        "total_boards": total_boards or 0,
        "online_boards": online_boards or 0,
        "offline_boards": offline_boards or 0,
        "maintenance_boards": maintenance_boards or 0,
        "redis_status": redis_status,
    }

    # Cache for 10 seconds if Redis is available
    try:
        # Ensure cache is in camelCase
        data = jsonable_encoder(
            DashboardSummaryResponse.model_validate(result_dict), by_alias=True
        )
        await redis_client.setex(cache_key, 10, json.dumps(data))
    except Exception as e:
        logger.warning(f"Redis connection error (set): {e}. Skip caching.")
    # UPDATE 2.4.1 Pastikan response menggunakan camelCase
    return jsonable_encoder(
        DashboardSummaryResponse.model_validate(result_dict), by_alias=True
    )