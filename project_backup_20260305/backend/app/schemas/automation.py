from pydantic import BaseModel, IPvAnyAddress
from typing import List, Optional, Literal, Any
from uuid import UUID
from datetime import datetime

class MassConfigCreate(BaseModel):
    board_ids: List[UUID]
    command: str
    description: Optional[str] = "Batch Configuration"

class MassConfigResult(BaseModel):
    board_id: UUID
    status: Literal["success", "failed"]
    output: Optional[str] = None
    error: Optional[str] = None

class ZTPRegister(BaseModel):
    identity: str
    model: str
    mac_address: str
    ip_address: IPvAnyAddress
    port_api: int = 8728
    temp_username: str
    temp_password: str

class AutoHealRequest(BaseModel):
    board_id: UUID
    reason: str

class QoSPolicyRequest(BaseModel):
    board_id: UUID
    policy_name: str # e.g., "fair_usage", "night_mode"
    max_bandwidth_mbps: int

class RecoveryRequest(BaseModel):
    board_id: UUID
    target_config: str # e.g., "dns", "ntp", "firewall"
    baseline_value: str

class AutomationJobResponse(BaseModel):
    job_id: UUID
    job_type: str
    payload: Optional[Any] = None
    description: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
