from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import UUID4

from app.schemas.base import BaseSchema


class AuditLogBase(BaseSchema):
    user_id: Optional[UUID4] = None
    action: str
    target_resource: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    status: str = "SUCCESS"


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogOut(AuditLogBase):
    log_id: int
    created_at: datetime
