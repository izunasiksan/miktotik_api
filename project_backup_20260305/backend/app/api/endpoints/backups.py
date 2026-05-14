from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api import deps
from app.models.user import MasterUser
from app.schemas.backup import BackupCreate, BackupResponse
from app.services.backup_service import backup_service
from app.core.limiter import limiter

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
    backup = await backup_service.create_backup(db, backup_in.board_id, backup_in.file_name)
    return backup

@router.get("/{board_id}/", response_model=List[BackupResponse])
async def read_backups(
    board_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve backups for a specific board.
    """
    backups = await backup_service.get_backups(db, board_id, skip=skip, limit=limit)
    return backups

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
    return result
