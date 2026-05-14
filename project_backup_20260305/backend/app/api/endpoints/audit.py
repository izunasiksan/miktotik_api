from typing import Any, List, Optional
from fastapi import APIRouter, Depends
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
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve audit logs.
    """
    query = select(AuditLog)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
        
    query = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()
