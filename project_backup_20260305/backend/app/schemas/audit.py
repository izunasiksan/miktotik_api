from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, UUID4

class AuditLogBase(BaseModel):
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

    class Config:
        from_attributes = True
