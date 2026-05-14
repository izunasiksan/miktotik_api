# UPDATED v2.4 - INDIKATOR SINKRONISASI
import asyncio
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.services import analysis_service, normalization_v2

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True, name="app.tasks.pipeline_tasks.execute_full_pipeline_v21_task"
)
def execute_full_pipeline_v21_task(
    self, board_id: str, start_time: str, end_time: str, granularity: str = "hour", interface_name: Optional[str] = None
):
    """
    Task Celery untuk menjalankan Full Pipeline V2.1 (Stage 1-7) secara asinkron.
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(
        _run_pipeline(board_id, start_time, end_time, granularity, interface_name=interface_name, task_obj=self)
    )


async def _run_pipeline(
    board_id: str, start_time: str, end_time: str, granularity: str, interface_name: Optional[str] = None, task_obj=None
):
    async with SessionLocal() as db:
        try:
            # Helper to update progress
            def update_progress(progress, stage):
                if task_obj:
                    task_obj.update_state(
                        state="PROGRESS", meta={"progress": progress, "stage": stage}
                    )

            # P0: Aggressive Cleanup
            update_progress(5, "Cleaning up environment")
            await analysis_service.cleanup_old_temp_tables(db, max_age_minutes=60)

            b_id = UUID(board_id)
            s_dt = datetime.fromisoformat(start_time)
            e_dt = datetime.fromisoformat(end_time)

            # P1: STAGE 0 Integration
            update_progress(10, f"Stage 0: Normalizing Data (Interface: {interface_name})")
            normalized_data = await normalization_v2.run_normalization_preview(
                db=db,
                board_id=b_id,
                start_time=s_dt,
                end_time=e_dt,
                granularity=granularity,
                fill_gaps=True,
                interface_name=interface_name, # V2.4.1: Pass interface_name
            )

            # STAGE 1: Context Lock
            update_progress(25, "Stage 1: Creating Scoped Dataset")
            temp_table = await analysis_service.create_scoped_dataset(
                db=db,
                board_id=b_id,
                start_time=s_dt,
                end_time=e_dt,
                granularity=granularity,
                normalized_source=normalized_data,
                interface_name=interface_name, # V2.4.1: Pass interface_name
            )

            try:
                # STAGE 2: Trend & Aggregation
                update_progress(40, "Stage 2: Trend Analysis")
                trend_data = await analysis_service.get_trend_analysis(
                    db=db, temp_table=temp_table
                )

                # STAGE 3-5: Analytics
                update_progress(60, "Stage 3-5: Advanced Analytics")
                analytics_data = await analysis_service.get_advanced_analytics(
                    db=db, temp_table=temp_table
                )

                # STAGE 6: Health Score
                update_progress(80, "Stage 6: Health Scoring")
                health_score = await analysis_service.calculate_health_score(
                    trend_data=trend_data, analytics_data=analytics_data
                )

                # STAGE 7: Insights
                update_progress(90, "Stage 7: Generating Insights")
                insights = await analysis_service.generate_insights(
                    trend_data=trend_data,
                    analytics_data=analytics_data,
                    health_score=health_score,
                )

                logger.info(f"Pipeline V2.1 completed for board {board_id}")
                return {
                    "status": "success",
                    "board_id": board_id,
                    "metadata": {
                        "range": {"start": s_dt.isoformat(), "end": e_dt.isoformat()},
                        "granularity": granularity,
                        "temp_table": temp_table,
                    },
                    "results": {
                        "trend": trend_data,
                        "analytics": analytics_data,
                        "health_score": health_score,
                        "insights": insights,
                    },
                }
            finally:
                # P0: Cleanup Temporary Table in Task
                from sqlalchemy import text

                logger.info(
                    f"Cleaning up temporary table {temp_table} in background task"
                )
                await db.execute(text(f"DROP TABLE IF EXISTS {temp_table}"))
                await db.commit()
        except Exception as e:
            logger.error(f"Pipeline V2.1 failed for board {board_id}: {str(e)}")
            return {"status": "error", "message": str(e)}
