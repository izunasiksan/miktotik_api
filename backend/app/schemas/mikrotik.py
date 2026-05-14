# UPDATED v2.4 - INDIKATOR SINKRONISASI
from pydantic import IPvAnyAddress, Field
from typing import Optional, List, Any, Dict
from datetime import datetime, date, timedelta
from uuid import UUID
from decimal import Decimal
from app.schemas.base import BaseSchema

# --- BOARD SCHEMAS ---
class BoardBase(BaseSchema):
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

class BoardUpdate(BaseSchema):
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

class ResourceStatResponse(BaseSchema):
    resource_id: int
    board_id: UUID
    cpu_load: Optional[int] = None
    free_memory: Optional[int] = None
    free_hdd: Optional[int] = None
    uptime: Optional[timedelta] = None
    accuracy_pct: Decimal
    log_time: datetime

class ClientStatResponse(BaseSchema):
    stat_id: int
    board_id: UUID
    total_hotspot: int
    total_pppoe: int
    total_active: int
    accuracy_pct: Decimal
    log_time: datetime

class SpeedStatResponse(BaseSchema):
    speed_id: int
    board_id: UUID
    interface_name: str
    download_mbps: Decimal
    upload_mbps: Decimal
    accuracy_pct: Decimal
    log_time: datetime

class DailySummaryResponse(BaseSchema):
    summary_id: int
    board_id: UUID
    avg_cpu_load: int
    max_cpu_load: int
    min_free_memory: int
    avg_download: Decimal
    max_download: Decimal
    total_download_bytes: int
    avg_upload: Decimal
    max_upload: Decimal
    total_upload_bytes: int
    avg_hotspot_users: int
    max_hotspot_users: int
    avg_pppoe_users: int
    max_pppoe_users: int
    log_date: date

class InterfaceDailySummaryResponse(BaseSchema):
    summary_id: int
    board_id: UUID
    interface_name: str
    avg_download_mbps: Decimal
    max_download_mbps: Decimal
    p95_download_mbps: Decimal
    avg_upload_mbps: Decimal
    max_upload_mbps: Decimal
    log_date: date

class MonthlySummaryResponse(BaseSchema):
    summary_id: int
    board_id: UUID
    avg_cpu_load: int
    max_cpu_load: int
    avg_download: int
    max_download: int
    total_download_bytes: int
    avg_upload: int
    max_upload: int
    total_upload_bytes: int
    avg_hotspot_users: int
    max_hotspot_users: int
    log_month: date

class DashboardSummaryResponse(BaseSchema):
    total_boards: int
    online_boards: int
    offline_boards: int
    maintenance_boards: int

# --- VPN SCHEMAS ---
class VPNProfileBase(BaseSchema):
    vpn_type: str = "L2TP/IPSEC"
    vpn_api: Optional[str] = None
    vpn_username: Optional[str] = None
    vpn_ssh: Optional[str] = None
    vpn_ftp: Optional[str] = None
    vpn_winbox: Optional[str] = None

class VPNProfileCreate(VPNProfileBase):
    vpn_password: Optional[str] = None

class VPNProfileUpdate(BaseSchema):
    vpn_type: Optional[str] = None
    vpn_api: Optional[str] = None
    vpn_username: Optional[str] = None
    vpn_password: Optional[str] = None
    vpn_ssh: Optional[str] = None
    vpn_ftp: Optional[str] = None
    vpn_winbox: Optional[str] = None

class VPNProfileResponse(VPNProfileBase):
    vpn_id: int
    board_id: UUID
    is_connected: bool
    last_connected_at: Optional[datetime] = None

class EventResponse(BaseSchema):
    event_id: int
    board_id: UUID
    event_category: Optional[str] = None
    event_level: Optional[str] = None
    event_name: str
    event_detail: Optional[str] = None
    performed_by: Optional[UUID] = None
    is_reset_event: bool = False
    log_time: datetime

# --- BACKUP SCHEMAS ---
class BackupResponse(BaseSchema):
    backup_id: UUID
    board_id: UUID
    file_name: str
    router_name: Optional[str] = None
    router_model: Optional[str] = None
    file_location: str
    status: str
    log_date: datetime
    created_at: datetime

# --- TELEGRAM SCHEMAS ---
class TelegramBotBase(BaseSchema):
    bot_name: str
    bot_token: str
    is_active: bool = True

class TelegramBotCreate(TelegramBotBase):
    pass

class TelegramBotUpdate(BaseSchema):
    bot_name: Optional[str] = None
    bot_token: Optional[str] = None
    is_active: Optional[bool] = None

class TelegramBotResponse(TelegramBotBase):
    bot_id: int
    created_at: datetime

class TelegramRecipientBase(BaseSchema):
    chat_id: int
    alert_levels: List[str] = ["critical"]
    is_active: bool = True

class TelegramRecipientCreate(TelegramRecipientBase):
    bot_id: int
    board_id: Optional[UUID] = None

class TelegramRecipientUpdate(BaseSchema):
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

# --- INTERFACE CONFIG SCHEMAS ---
class InterfaceConfigBase(BaseSchema):
    interface_name: str
    interface_label: Optional[str] = None
    is_active: bool = True
    is_primary_uplink: bool = False

class InterfaceConfigResponse(InterfaceConfigBase):
    config_id: int
    board_id: UUID
    created_at: datetime

# --- USAGE SCHEMAS ---
class InterfaceUsageResponse(BaseSchema):
    usage_id: int
    board_id: UUID
    interface_name: str
    total_tx_bytes: int
    total_rx_bytes: int
    log_date: date
    last_update: datetime

class PppoeUsageResponse(BaseSchema):
    usage_id: int
    board_id: UUID
    pppoe_username: str
    upload_bytes: int
    download_bytes: int
    log_date: date
    last_update: datetime

class HotspotUsageRawResponse(BaseSchema):
    raw_id: int
    board_id: UUID
    username: str
    daily_download: int
    daily_upload: int
    daily_uptime: int
    log_date: date

class HotspotUsageMonthlyResponse(BaseSchema):
    summary_id: int
    username: str
    total_download: int
    total_upload: int
    total_uptime: int
    frequency_days: Optional[int] = None

# --- ANALYSIS PIPELINE SCHEMAS ---
class AnalysisMetadata(BaseSchema):
    board_id: UUID
    range: Dict[str, datetime]
    granularity: str
    temp_table: Optional[str] = None
    cached: bool = False
    processed_at: datetime

class AnalysisStages(BaseSchema):
    stage1_lock: str
    stage2_trend: str
    stage3_5_analytics: str
    stage6_scoring: str
    stage7_insight: str

class AnalysisResults(BaseSchema):
    trend: Any
    analytics: Any
    health_score: Any
    insights: Any

class AnalysisResponse(BaseSchema):
    status: str
    metadata: AnalysisMetadata
    stages: AnalysisStages
    results: AnalysisResults

class AsyncAnalysisResponse(BaseSchema):
    status: str
    task_id: str
    board_id: UUID
    range: Dict[str, datetime]

class TaskStatusResponse(BaseSchema):
    status: str
    task_id: str
    state: str
    progress: Optional[float] = 0.0
    current_stage: Optional[str] = ""
    result: Optional[Any] = None
    error: Optional[str] = None

# --- HEAVY ANALYSIS SCHEMAS ---
class PercentileData(BaseSchema):
    p95_dl: float
    p99_dl: float
    p95_ul: float
    p99_ul: float
    max_dl: float
    max_ul: float

class ForecastTraffic(BaseSchema):
    slope: float
    intercept: float

class ForecastData(BaseSchema):
    traffic: ForecastTraffic
    cpu: ForecastTraffic
    memory: ForecastTraffic

class AnomalyItem(BaseSchema):
    date: str
    traffic_value: float
    traffic_z_score: float
    cpu_value: float
    cpu_usage: float
    cpu_z_score: float
    mem_value: float
    mem_usage: float
    mem_z_score: float

class CorrelationData(BaseSchema):
    pearson_r: float
    sample_size: int

class HealthStats(BaseSchema):
    avg_cpu: float
    peak_cpu: float
    avg_mem: float
    resource_alerts: int
    cpu_usage: float
    mem_usage: float
    cpu_p: float

class TopGrowthUser(BaseSchema):
    name: str
    growth: float
    current_usage: float

class HeavyAnalysisResponse(BaseSchema):
    actual_granularity: str
    percentiles: PercentileData
    forecast: ForecastData
    anomalies: List[AnomalyItem]
    correlation: CorrelationData
    health_stats: HealthStats
    top_growth_users: List[TopGrowthUser]

# --- TREND ANALYSIS SCHEMAS ---
class TrendSeriesItem(BaseSchema):
    period: Optional[str] = None
    rx: float
    tx: float
    rx_ma: float
    tx_ma: float
    cpu: float
    mem: float

class TrendTrafficDetail(BaseSchema):
    avg: float
    max: float

class TrendTrafficSummary(BaseSchema):
    rx: TrendTrafficDetail
    tx: TrendTrafficDetail

class TrendResourceDetail(BaseSchema):
    avg: float
    max: float
    min: Optional[float] = None

class TrendResourceSummary(BaseSchema):
    cpu: TrendResourceDetail
    mem: TrendResourceDetail

class TrendSummary(BaseSchema):
    traffic: TrendTrafficSummary
    resource: TrendResourceSummary

class TrendMetadata(BaseSchema):
    accuracy_pct: float
    is_low_accuracy: bool

class TrendAnalysisResponse(BaseSchema):
    summary: TrendSummary
    series: List[TrendSeriesItem]
    metadata: TrendMetadata

# --- ADVANCED ANALYTICS SCHEMAS ---
class AdvancedCorrelation(BaseSchema):
    rx_vs_cpu: float

class AdvancedHabitItem(BaseSchema):
    hour: int
    avg_rx: float

class AdvancedHabit(BaseSchema):
    peak_hours: List[AdvancedHabitItem]

class AdvancedAnomalyItem(BaseSchema):
    period: str
    rx: float
    z_score: float

class AdvancedAnomaly(BaseSchema):
    detected_count: int
    items: List[AdvancedAnomalyItem]

class AdvancedAnalyticsMetadata(BaseSchema):
    source_id: str
    processed_at: str

class AdvancedAnalyticsResponse(BaseSchema):
    correlation: AdvancedCorrelation
    habit: AdvancedHabit
    anomaly: AdvancedAnomaly
    metadata: AdvancedAnalyticsMetadata

# --- HEALTH SCORE SCHEMAS ---
class HealthScoreComponents(BaseSchema):
    stability: float
    utilization: float
    anomaly_penalty: float
    anomaly_score: float

class HealthScoreMetadata(BaseSchema):
    is_low_confidence: bool
    accuracy_pct: float

class HealthScoreResponse(BaseSchema):
    total_score: float
    components: HealthScoreComponents
    metadata: HealthScoreMetadata

# --- INSIGHT SCHEMAS ---
class InsightItem(BaseSchema):
    type: str
    level: str
    title: str
    message: str
    link: str
    source_id: str
    accuracy_pct: float
    is_low_confidence: bool
    raw_timestamp: str

# --- KPI SUMMARY SCHEMAS ---
class AnalysisKpiSummaryResponse(BaseSchema):
    avg_cpu: float
    peak_cpu: float
    avg_download: float
    max_download: float
    total_download: float
    active_users: int
    growth_pct: float

# --- INTERFACE ANALYSIS SCHEMAS ---
class InterfaceAnalysisItem(BaseSchema):
    interface_name: str
    dl_val: float
    ul_val: float

# --- HOTSPOT ANALYSIS SCHEMAS ---
class HotspotAnalysisItem(BaseSchema):
    username: str
    download_value: int
    upload_value: int
    active_days: int
    avg_daily_usage: float

# --- CLIENTS ANALYSIS SCHEMAS ---
class ClientsAnalysisItem(BaseSchema):
    period: Any # Can be date or datetime string
    pppoe: int
    hotspot: int

# --- AGGREGATE ALL SCHEMAS ---
class AggregateAllItem(BaseSchema):
    period: str
    download_mbps: float
    upload_mbps: float
    cpu_percent_standard: Optional[float] = None
    free_memory: Optional[float] = None
    active_users: Optional[int] = None

class SeriesByEntityItem(BaseSchema):
    key: str
    label: str
    series: List[AggregateAllItem]

class AggregateAllResponse(BaseSchema):
    meta: Optional[Dict[str, Any]] = None
    series_by_entity: Optional[List[SeriesByEntityItem]] = None
    total: Optional[List[AggregateAllItem]] = None
    # Support for simple list return

# --- TIME DENSITY SCHEMAS ---
class TimeDensityItem(BaseSchema):
    period: str
    count: int

# --- SCOPED ANALYSIS SCHEMAS ---
class ScopedAnalysisContext(BaseSchema):
    board_id: UUID
    temp_table: str
    range: Dict[str, datetime]
    granularity: str

class ScopedAnalysisPreviewItem(BaseSchema):
    period: Optional[str] = None
    rx: float
    tx: float
    acc_traffic: float
    cpu: float
    mem: float
    acc_resource: float

class ScopedAnalysisResponse(BaseSchema):
    status: str
    context: ScopedAnalysisContext
    preview: List[ScopedAnalysisPreviewItem]

# --- SITE GROUP SCHEMAS ---
class SiteGroupSummaryResponse(BaseSchema):
    site_group: str
    count: int

# --- INTERFACE LIST SCHEMAS ---
class InterfaceListItem(BaseSchema):
    interface_name: str
    interface_label: Optional[str] = None
    is_active: bool
    is_primary_uplink: bool

# --- USER LIST SCHEMAS ---
class UserListItem(BaseSchema):
    username: str

# --- TOP ANALYSIS SCHEMAS ---
class TopAnalysisItem(BaseSchema):
    name: str
    download_value: float
    upload_value: float
    total_value: float
    unit: str

