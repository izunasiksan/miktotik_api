from pydantic import BaseModel, ConfigDict, IPvAnyAddress, Field
from typing import Optional, List, Any
from datetime import datetime, date, timedelta
from uuid import UUID
from decimal import Decimal

# --- BOARD SCHEMAS ---
class BoardBase(BaseModel):
    board_name: str
    mikrotik_identity: Optional[str] = None
    site_group: Optional[str] = "Umum"
    mac_address: str
    ip_address: IPvAnyAddress
    port_api: int = 8728
    port_ssh: int = 22
    is_monitor: bool = True
    is_public_review: bool = True
    is_maintenance: bool = False

class BoardCreate(BoardBase):
    username: str
    password: str

class BoardUpdate(BaseModel):
    board_name: Optional[str] = None
    site_group: Optional[str] = None
    ip_address: Optional[IPvAnyAddress] = None
    is_monitor: Optional[bool] = None
    is_public_review: Optional[bool] = None
    is_maintenance: Optional[bool] = None
    port_api: Optional[int] = None

class BoardResponse(BoardBase):
    board_id: UUID
    is_online: bool
    last_ping_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- STATS SCHEMAS ---
class ResourceStatResponse(BaseModel):
    cpu_load: Optional[int] = None
    free_memory: Optional[int] = None
    free_hdd: Optional[int] = None
    uptime: Optional[timedelta] = None
    log_time: datetime
    model_config = ConfigDict(from_attributes=True)

class ClientStatResponse(BaseModel):
    total_hotspot: int
    total_pppoe: int
    total_active: int
    log_time: datetime
    model_config = ConfigDict(from_attributes=True)

class SpeedStatResponse(BaseModel):
    interface_name: str
    download_mbps: Decimal
    upload_mbps: Decimal
    log_time: datetime
    model_config = ConfigDict(from_attributes=True)

class DailySummaryResponse(BaseModel):
    avg_download: Optional[Decimal] = None
    max_download: Optional[Decimal] = None
    avg_upload: Optional[Decimal] = None
    max_clients: Optional[int] = None
    log_date: date
    model_config = ConfigDict(from_attributes=True)

# --- VPN SCHEMAS ---
class VPNProfileBase(BaseModel):
    vpn_type: str = "L2TP/IPSEC"
    vpn_api: Optional[str] = None
    vpn_username: Optional[str] = None
    vpn_ssh: Optional[str] = None
    vpn_ftp: Optional[str] = None
    vpn_winbox: Optional[str] = None

class VPNProfileCreate(VPNProfileBase):
    vpn_password: Optional[str] = None

class VPNProfileUpdate(VPNProfileBase):
    vpn_password: Optional[str] = None

class VPNProfileResponse(VPNProfileBase):
    vpn_id: int
    board_id: UUID
    is_connected: bool
    last_connected_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- EVENT SCHEMAS ---
class EventResponse(BaseModel):
    event_id: int
    board_id: UUID
    event_category: Optional[str]
    event_level: Optional[str]
    event_name: str
    event_detail: Optional[str]
    performed_by: Optional[UUID]
    is_reset_event: bool
    log_time: datetime
    model_config = ConfigDict(from_attributes=True)

# --- BACKUP SCHEMAS ---
class BackupResponse(BaseModel):
    backup_id: UUID
    board_id: UUID
    file_name: str
    router_name: Optional[str] = None
    router_model: Optional[str] = None
    file_location: str
    status: str
    log_date: datetime
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- TELEGRAM SCHEMAS ---
class TelegramBotBase(BaseModel):
    bot_name: str
    bot_token: str
    is_active: bool = True

class TelegramBotCreate(TelegramBotBase):
    pass

class TelegramBotUpdate(BaseModel):
    bot_name: Optional[str] = None
    bot_token: Optional[str] = None
    is_active: Optional[bool] = None

class TelegramBotResponse(TelegramBotBase):
    bot_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TelegramRecipientBase(BaseModel):
    chat_id: int
    alert_levels: List[str] = ["critical"]
    is_active: bool = True

class TelegramRecipientCreate(TelegramRecipientBase):
    bot_id: int
    board_id: Optional[UUID] = None

class TelegramRecipientUpdate(BaseModel):
    chat_id: Optional[int] = None
    alert_levels: Optional[List[str]] = None
    is_active: Optional[bool] = None
    bot_id: Optional[int] = None
    board_id: Optional[UUID] = None

class TelegramRecipientResponse(TelegramRecipientBase):
    recipient_id: int
    user_id: Optional[UUID] = None
    bot_id: Optional[int] = None
    board_id: Optional[UUID] = None
    model_config = ConfigDict(from_attributes=True)

# --- INTERFACE CONFIG SCHEMAS ---
class InterfaceConfigBase(BaseModel):
    interface_name: str
    interface_label: Optional[str] = None
    is_active: bool = True
    is_primary_uplink: bool = False

class InterfaceConfigResponse(InterfaceConfigBase):
    config_id: int
    board_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- USAGE SCHEMAS ---
class InterfaceUsageResponse(BaseModel):
    usage_id: int
    board_id: UUID
    interface_name: str
    total_tx_bytes: int
    total_rx_bytes: int
    log_date: date
    last_update: datetime
    model_config = ConfigDict(from_attributes=True)

class PppoeUsageResponse(BaseModel):
    usage_id: int
    board_id: UUID
    pppoe_username: str
    upload_bytes: int
    download_bytes: int
    log_date: date
    last_update: datetime
    model_config = ConfigDict(from_attributes=True)

class HotspotUsageRawResponse(BaseModel):
    raw_id: int
    board_id: UUID
    username: str
    daily_download: int
    daily_upload: int
    daily_uptime: int
    log_date: date
    model_config = ConfigDict(from_attributes=True)

class HotspotUsageMonthlyResponse(BaseModel):
    summary_id: int
    username: str
    total_download: int
    total_upload: int
    total_uptime: int
    frequency_days: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)
