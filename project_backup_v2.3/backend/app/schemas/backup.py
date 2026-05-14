from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

# Shared properties
class BackupBase(BaseModel):
    file_name: str
    router_name: Optional[str] = None
    router_model: Optional[str] = None
    file_location: str
    status: Optional[str] = "pending"

# Properties to receive via API on creation
class BackupCreate(BaseModel):
    board_id: UUID
    file_name: str

# Properties to return to client
class BackupResponse(BackupBase):
    backup_id: UUID
    board_id: Optional[UUID] = None
    log_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
