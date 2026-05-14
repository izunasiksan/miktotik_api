from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict

from app.core.database import get_db
from app.api import deps
from app.models.user import MasterUser
from app.models.mikrotik import MikrotikBoard
from app.db.redis import redis_client
import json
import logging

# Setup logger
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/summary/", response_model=Dict[str, int])
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
    online_boards = await db.scalar(select(func.count(MikrotikBoard.board_id)).where(MikrotikBoard.is_online == True))
    offline_boards = await db.scalar(select(func.count(MikrotikBoard.board_id)).where(MikrotikBoard.is_online == False))
    maintenance_boards = await db.scalar(select(func.count(MikrotikBoard.board_id)).where(MikrotikBoard.is_maintenance == True))
    
    result = {
        "total_boards": total_boards or 0,
        "online_boards": online_boards or 0,
        "offline_boards": offline_boards or 0,
        "maintenance_boards": maintenance_boards or 0
    }
    
    # Cache for 10 seconds if Redis is available
    try:
        await redis_client.setex(cache_key, 10, json.dumps(result))
    except Exception as e:
        logger.warning(f"Redis connection error (set): {e}. Skip caching.")
    
    return result
