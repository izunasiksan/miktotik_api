from typing import Optional, Dict, Any
from datetime import datetime, date, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api import deps
from app.models.user import MasterUser
from app.services.normalization_v2 import run_normalization_preview
from app.services.audit_service import AuditService

router = APIRouter()

class NormalizationRequest(BaseModel):
    board_id: UUID
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    days: int = Field(default=30, ge=1, le=3650)
    granularity: str = Field(default="auto", pattern="^(auto|year|month|day|hour)$")
    agg: str = Field(default="avg", pattern="^(avg|max|min|sum|count)$")
    bucketSource: str = Field(default="server", pattern="^(server|frontend)$")
    usageUnit: str = "Mbps"
    fillGaps: bool = True

@router.post("/preview", response_model=Dict[str, Any])
async def normalization_preview(
    payload: NormalizationRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    try:
        if payload.start_date and payload.end_date:
            if payload.end_date < payload.start_date:
                raise HTTPException(status_code=400, detail="end_date harus ≥ start_date")
            start_dt = datetime.combine(payload.start_date, datetime.min.time())
            end_dt = datetime.combine(payload.end_date + timedelta(days=1), datetime.min.time())
        else:
            end_dt = datetime.utcnow()
            start_dt = end_dt - timedelta(days=payload.days)
        data = await run_normalization_preview(
            db=db,
            board_id=payload.board_id,
            start_time=start_dt,
            end_time=end_dt,
            granularity=payload.granularity,
            agg=payload.agg,
            bucket_source=payload.bucketSource,
            usage_unit=payload.usageUnit,
            fill_gaps=payload.fillGaps
        )
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            await AuditService.log_activity(
                user_id=current_user.user_id if current_user else None,
                action="NORMALIZATION_PREVIEW",
                target_resource=str(payload.board_id),
                details={
                    "granularity": payload.granularity,
                    "agg": payload.agg,
                    "bucketSource": payload.bucketSource,
                    "usageUnit": payload.usageUnit,
                    "fillGaps": payload.fillGaps
                },
                ip_address=None,
                status="SUCCESS"
            )
        except Exception:
            pass
