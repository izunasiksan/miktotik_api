from app.core.celery_app import celery_app
from app.services import normalization_v2
from app.core.database import SessionLocal
import asyncio
import logging
from uuid import UUID
from datetime import datetime

logger = logging.getLogger(__name__)

@celery_app.task(name="app.tasks.normalization_tasks.run_normalization_task")
def run_normalization_task(board_id: str, start_time: str, end_time: str, granularity: str = "auto"):
    """
    Task Celery untuk menjalankan Stage 0 Normalization secara asinkron.
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_run_normalization(board_id, start_time, end_time, granularity))

async def _run_normalization(board_id: str, start_time: str, end_time: str, granularity: str):
    async with SessionLocal() as db:
        try:
            b_id = UUID(board_id)
            s_dt = datetime.fromisoformat(start_time)
            e_dt = datetime.fromisoformat(end_time)
            
            result = await normalization_v2.run_normalization_preview(
                db=db,
                board_id=b_id,
                start_time=s_dt,
                end_time=e_dt,
                granularity=granularity
            )
            
            logger.info(f"Normalization completed for board {board_id}")
            return {
                "status": "success",
                "board_id": board_id,
                "meta": result["meta"]
            }
        except Exception as e:
            logger.error(f"Normalization failed for board {board_id}: {str(e)}")
            return {"status": "error", "message": str(e)}
