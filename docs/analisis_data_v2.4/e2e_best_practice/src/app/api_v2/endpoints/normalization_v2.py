from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import AliasGenerator, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.database import get_db
from app.models.user import MasterUser
from app.services.audit_service import AuditService
from app.services.normalization_v2 import (
    run_normalization_preview,
    get_source_table_detail,
    get_latest_data_time,
)

router = APIRouter()


def _parse_iso_dt(value: Optional[str]) -> datetime:
    """
    Validasi & parse ISO 8601; mengonversi ke naive UTC untuk konsistensi internal.
    """
    if value is None:
        raise HTTPException(
            status_code=400, detail="start_time dan end_time wajib diisi"
        )
    v = value.strip()
    # Handle 'Z' suffix (UTC)
    if v.endswith("Z"):
        v = v.replace("Z", "+00:00")
    
    try:
        dt = datetime.fromisoformat(v)
        # Jika aware (punya tzinfo), konversi ke naive (strip tzinfo)
        # V2.4.2 Fix: Gunakan .astimezone(timezone.utc) sebelum replace tzinfo
        # agar waktu terkonversi ke UTC dengan benar (bukan hanya potong offset).
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=f"Format waktu tidak valid (harus ISO 8601): {value}",
        )


class NormalizationRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=AliasGenerator(
            validation_alias=to_camel,
            serialization_alias=to_camel,
        ),
        populate_by_name=True,
    )
    board_id: UUID
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days: int = Field(default=30, ge=1, le=3650)
    granularity: str = Field(default="auto", pattern="^(auto|year|month|day|hour)$")
    agg: str = Field(default="avg", pattern="^(avg|max|min|sum|count)$")
    bucket_source: str = Field(default="server", pattern="^(server|frontend)$")
    usage_unit: str = "Mbps"
    fill_gaps: bool = True
    interface_name: Optional[str] = None


@router.post("/source-detail", response_model=Dict[str, Any])
async def source_detail(
    board_id: UUID = Body(..., alias="boardId"),
    table_name: str = Body(..., alias="tableName"),
    start_time: Optional[str] = Body(None, alias="startTime"),
    end_time: Optional[str] = Body(None, alias="endTime"),
    days: int = Body(30, ge=1, le=3650),
    limit: int = Body(1000, ge=1, le=10000),
    offset: int = Body(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Endpoint untuk mengambil data detail dari tabel sumber Mikrotik.
    """
    try:
        if start_time and end_time:
            start_dt = _parse_iso_dt(start_time)
            end_dt = _parse_iso_dt(end_time)
            if end_dt < start_dt:
                raise HTTPException(
                    status_code=400, detail="end_time harus ≥ start_time"
                )
        else:
            end_dt = datetime.utcnow()
            start_dt = end_dt - timedelta(days=days)

        data = await get_source_table_detail(
            db=db,
            board_id=board_id,
            table_name=table_name,
            start_time=start_dt,
            end_time=end_dt,
            limit=limit,
            offset=offset,
        )
        return jsonable_encoder(data, by_alias=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            await AuditService.log_activity(
                user_id=current_user.user_id if current_user else None,
                action="VIEW_SOURCE_DETAIL",
                target_resource=f"BOARD:{board_id}:TABLE:{table_name}",
                details={"start_time": str(start_dt), "end_time": str(end_dt)},
            )
        except Exception:
            pass


@router.post("/preview", response_model=Dict[str, Any])
async def normalization_preview(
    payload: NormalizationRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    try:
        if payload.start_time and payload.end_time:
            start_dt = _parse_iso_dt(payload.start_time)
            end_dt = _parse_iso_dt(payload.end_time)
            if end_dt < start_dt:
                raise HTTPException(
                    status_code=400, detail="end_time harus ≥ start_time"
                )
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
            bucket_source=payload.bucket_source,
            usage_unit=payload.usage_unit,
            fill_gaps=payload.fill_gaps,
            interface_name=payload.interface_name,
        )
        return jsonable_encoder(data, by_alias=True)
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
                    "bucket_source": payload.bucket_source,
                    "usage_unit": payload.usage_unit,
                    "fill_gaps": payload.fill_gaps,
                },
                ip_address=None,
                status="SUCCESS",
            )
        except Exception:
            pass


@router.get("/latest-data-time/{board_id}", response_model=Dict[str, Any])
async def get_latest_time(
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Endpoint untuk mendapatkan waktu data terakhir dari router.
    """
    try:
        data = await get_latest_data_time(db, board_id)
        return jsonable_encoder(data, by_alias=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
