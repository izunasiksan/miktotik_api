from pydantic import IPvAnyAddress
from typing import List, Optional, Literal, Any
from uuid import UUID
from datetime import datetime
from app.schemas.base import BaseSchema

class MassConfigCreate(BaseSchema):
    board_ids: List[UUID]
    command: str
    description: Optional[str] = "Batch Configuration"

class MassConfigResult(BaseSchema):
    board_id: UUID
    status: Literal["success", "failed"]
    output: Optional[str] = None
    error: Optional[str] = None

class ZTPRegister(BaseSchema):
    identity: str
    model: str
    mac_address: str
    ip_address: IPvAnyAddress
    port_api: int = 8728
    temp_username: str
    temp_password: str

class AutoHealRequest(BaseSchema):
    board_id: UUID
    reason: str

class QoSPolicyRequest(BaseSchema):
    board_id: UUID
    policy_name: str # e.g., "fair_usage", "night_mode"
    max_bandwidth_mbps: int

class RecoveryRequest(BaseSchema):
    board_id: UUID
    target_config: str # e.g., "dns", "ntp", "firewall"
    baseline_value: str

class AutomationJobResponse(BaseSchema):
    job_id: UUID
    job_type: str
    payload: Optional[Any] = None
    description: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

