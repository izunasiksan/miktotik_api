from app.core.celery_app import celery_app
from app.services import analysis_service, normalization_v2
from app.core.database import SessionLocal
import asyncio
import logging
from uuid import UUID
from datetime import datetime

logger = logging.getLogger(__name__)

@celery_app.task(name="app.tasks.pipeline_tasks.execute_full_pipeline_v21_task")
def execute_full_pipeline_v21_task(board_id: str, start_time: str, end_time: str, granularity: str = "hour"):
    """
    Task Celery untuk menjalankan Full Pipeline V2.1 (Stage 1-7) secara asinkron.
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_run_pipeline(board_id, start_time, end_time, granularity))

async def _run_pipeline(board_id: str, start_time: str, end_time: str, granularity: str):
    async with SessionLocal() as db:
        try:
            b_id = UUID(board_id)
            s_dt = datetime.fromisoformat(start_time)
            e_dt = datetime.fromisoformat(end_time)
            
            # P1: STAGE 0 Integration (Internal Normalization)
            await normalization_v2.run_normalization_preview(
                db=db,
                board_id=b_id,
                start_time=s_dt,
                end_time=e_dt,
                granularity=granularity,
                fill_gaps=True
            )
            
            # STAGE 1: Context Lock
            temp_table = await analysis_service.create_scoped_dataset(
                db=db,
                board_id=b_id,
                start_time=s_dt,
                end_time=e_dt,
                granularity=granularity
            )
            
            try:
                # STAGE 2: Trend & Aggregation
                trend_data = await analysis_service.get_trend_analysis(
                    db=db,
                    temp_table=temp_table
                )
                
                # STAGE 3-5: Analytics (Correlation, Habit, Anomaly)
                analytics_data = await analysis_service.get_advanced_analytics(
                    db=db,
                    temp_table=temp_table
                )
                
                # STAGE 6: Health Score
                health_score = await analysis_service.calculate_health_score(
                    trend_data=trend_data,
                    analytics_data=analytics_data
                )
                
                # STAGE 7: Insights
                insights = await analysis_service.generate_insights(
                    trend_data=trend_data,
                    analytics_data=analytics_data,
                    health_score=health_score
                )
                
                logger.info(f"Pipeline V2.1 completed for board {board_id}")
                return {
                    "status": "success",
                    "board_id": board_id,
                    "metadata": {
                        "range": {"start": s_dt.isoformat(), "end": e_dt.isoformat()},
                        "granularity": granularity,
                        "temp_table": temp_table
                    },
                    "results": {
                        "trend": trend_data,
                        "analytics": analytics_data,
                        "health_score": health_score,
                        "insights": insights
                    }
                }
            finally:
                # P0: Cleanup Temporary Table in Task
                from sqlalchemy import text
                logger.info(f"Cleaning up temporary table {temp_table} in background task")
                await db.execute(text(f"DROP TABLE IF EXISTS {temp_table}"))
                await db.commit()
        except Exception as e:
            logger.error(f"Pipeline V2.1 failed for board {board_id}: {str(e)}")
            return {"status": "error", "message": str(e)}
