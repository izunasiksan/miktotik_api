from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.user import MasterUser
from app.schemas.backup import BackupCreate, BackupResponse
from app.services.backup_service import backup_service

router = APIRouter()


@router.post("/", response_model=BackupResponse)
@limiter.limit("2/minute")
async def create_backup(
    request: Request,
    backup_in: BackupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create a new backup for a board.
    """
    backup = await backup_service.create_backup(
        db, backup_in.board_id, backup_in.file_name
    )
    # UPDATE 2.4.1 Pastikan response menggunakan camelCase
    return jsonable_encoder(backup, by_alias=True)


@router.get("/{board_id}/", response_model=List[BackupResponse])
async def read_backups(
    board_id: UUID,
    skip: int = 0,
    limit: int = 100,
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve backups for a specific board.
    """
    # Use direct query to support datetime filtering
    from app.models.mikrotik import BoardBackup

    query = select(BoardBackup).where(BoardBackup.board_id == board_id)

    if start_time:
        query = query.where(BoardBackup.created_at >= start_time)
    if end_time:
        query = query.where(BoardBackup.created_at <= end_time)

    query = query.order_by(desc(BoardBackup.created_at)).offset(skip).limit(limit)

    result = await db.execute(query)
    backups = result.scalars().all()
    # UPDATE 2.4.1 Pastikan response menggunakan camelCase
    return jsonable_encoder(backups, by_alias=True)


@router.post("/{backup_id}/restore/")
@limiter.limit("1/minute")
async def restore_backup(
    request: Request,
    backup_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Restore a backup to a board.
    """
    result = await backup_service.restore_backup(db, backup_id)
    # UPDATE 2.4.1 Pastikan response menggunakan camelCase
    return jsonable_encoder(result, by_alias=True)
