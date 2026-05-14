from datetime import datetime
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api import deps
from app.core.limiter import limiter
from app.models.user import MasterUser
from app.models.automation import AutomationJob
from app.schemas.automation import MassConfigCreate, MassConfigResult, AutoHealRequest, ZTPRegister, QoSPolicyRequest, RecoveryRequest, AutomationJobResponse
from app.services.automation_service import automation_service
from app.core.database import get_db

router = APIRouter()

@router.get("/jobs/", response_model=List[AutomationJobResponse])
async def list_jobs(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    List all automation jobs.
    """
    query = select(AutomationJob)
    
    if start_time:
        query = query.where(AutomationJob.created_at >= start_time)
    if end_time:
        query = query.where(AutomationJob.created_at <= end_time)
        
    query = query.order_by(AutomationJob.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    jobs = result.scalars().all()
    return jobs

@router.post("/mass-config/", response_model=list[MassConfigResult])
@limiter.limit("5/minute")
async def trigger_mass_config(
    request: Request,
    config_in: MassConfigCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Menjalankan konfigurasi massal pada daftar router yang dipilih.
    Requires Superuser access.
    """
    results = await automation_service.run_mass_config(
        db,
        config_in.board_ids,
        config_in.command,
        config_in.description or "Batch Configuration",
        current_user.user_id
    )
    return results

@router.post("/auto-heal/", response_model=dict)
@limiter.limit("10/minute")
async def trigger_auto_heal(
    request: Request,
    heal_in: AutoHealRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Memicu mekanisme Self-Healing (Reboot) secara manual jika terdeteksi anomali.
    """
    try:
        result = await automation_service.trigger_auto_heal(
            db,
            heal_in.board_id,
            heal_in.reason,
            current_user.user_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/qos/apply/", response_model=dict)
@limiter.limit("20/minute")
async def apply_qos(
    request: Request,
    qos_in: QoSPolicyRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Apply Dynamic QoS Policy.
    """
    try:
        result = await automation_service.apply_qos_policy(
            db,
            qos_in.board_id,
            qos_in.policy_name,
            qos_in.max_bandwidth_mbps,
            current_user.user_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/recovery/run/", response_model=dict)
@limiter.limit("10/minute")
async def run_recovery(
    request: Request,
    recovery_in: RecoveryRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Run Config Recovery to restore baseline.
    """
    try:
        result = await automation_service.run_config_recovery(
            db,
            recovery_in.board_id,
            recovery_in.target_config,
            recovery_in.baseline_value,
            current_user.user_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ztp/register/", response_model=dict)
@limiter.limit("60/minute")
async def ztp_register(
    request: Request,
    ztp_in: ZTPRegister,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Endpoint khusus untuk Router Baru melakukan registrasi otomatis (Zero Touch Provisioning).
    Endpoint ini bisa diakses publik (dengan rate limit ketat) oleh script bootstrap router.
    """
    # Note: In production, verify shared secret header or similar mechanism
    try:
        result = await automation_service.register_ztp_device(
            db,
            ztp_in.identity,
            ztp_in.model,
            ztp_in.mac_address,
            str(ztp_in.ip_address),
            ztp_in.port_api,
            ztp_in.temp_username,
            ztp_in.temp_password
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
