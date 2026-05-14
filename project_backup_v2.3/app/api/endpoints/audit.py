from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.api import deps
from app.core.database import get_db
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogOut
from app.models.user import MasterUser

router = APIRouter()

@router.get("/", response_model=List[AuditLogOut])
async def read_audit_logs(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[str] = Query(None, alias="userId"),
    action: Optional[str] = None,
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve audit logs.
    V2.3: Menggunakan datetime parameters untuk presisi filter.
    """
    query = select(AuditLog)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if start_time:
        query = query.filter(AuditLog.created_at >= start_time)
    if end_time:
        query = query.filter(AuditLog.created_at <= end_time)
        
    query = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()
