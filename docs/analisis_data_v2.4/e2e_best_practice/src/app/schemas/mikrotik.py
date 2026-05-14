# UPDATED v2.4 - INDIKATOR SINKRONISASI
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import IPvAnyAddress

from app.schemas.base import BaseSchema


# --- MASTER SCHEMAS ---
class MasterSiteResponse(BaseSchema):
    site_id: int
    site_name: str
    location: Optional[str] = None
    pic_name: Optional[str] = None
    pic_phone: Optional[str] = None
    created_at: datetime


class MasterBoardModelResponse(BaseSchema):
    model_id: int
    model_name: str
    cpu_model: Optional[str] = None
    core_count: Optional[int] = None
    total_memory: Optional[int] = None
    created_at: datetime


# --- BOARD SCHEMAS ---
class BoardBase(BaseSchema):
    board_name: str
    mikrotik_identity: Optional[str] = None
    model_id: Optional[int] = None
    site_id: int
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
    model_id: Optional[int] = None
    site_id: Optional[int] = None
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
    
    # 3NF Detail: Include related objects
    site: Optional[MasterSiteResponse] = None
    board_model_rel: Optional[MasterBoardModelResponse] = None


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
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct
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
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct
    log_date: date


class MonthlySummaryResponse(BaseSchema):
    summary_id: int
    board_id: UUID
    avg_cpu_load: int
    max_cpu_load: int
    avg_download: Decimal  # UPDATE 2.4.1: Sync to Decimal
    max_download: Decimal  # UPDATE 2.4.1: Sync to Decimal
    total_download_bytes: int
    avg_upload: Decimal  # UPDATE 2.4.1: Sync to Decimal
    max_upload: Decimal  # UPDATE 2.4.1: Sync to Decimal
    total_upload_bytes: int
    avg_hotspot_users: int
    max_hotspot_users: int
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct
    log_month: date


class DashboardSummaryResponse(BaseSchema):
    total_boards: int
    online_boards: int
    offline_boards: int
    maintenance_boards: int
    redis_status: str = "UNKNOWN"


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
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct
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
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct
    log_date: date
    last_update: datetime


class PppoeUsageResponse(BaseSchema):
    usage_id: int
    board_id: UUID
    pppoe_username: str
    upload_bytes: int
    download_bytes: int
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct
    log_date: date
    last_update: datetime


class HotspotUsageRawResponse(BaseSchema):
    raw_id: int
    board_id: UUID
    username: str
    daily_download: int
    daily_upload: int
    daily_uptime: int
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct
    log_date: date


class HotspotUsageMonthlyResponse(BaseSchema):
    summary_id: int
    username: str
    total_download: int
    total_upload: int
    total_uptime: int
    frequency_days: Optional[int] = None
    is_frequent_user: bool = False  # UPDATE 2.4.1: Add is_frequent_user
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct
    month_period: date  # UPDATE 2.4.1: Add month_period
    last_updated: datetime  # UPDATE 2.4.1: Add last_updated


# --- ANALYSIS PIPELINE SCHEMAS ---
class AnalysisMetadata(BaseSchema):
    board_id: UUID
    interface_name: Optional[str] = None  # V2.4.1: Add interface_name
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


# --- STAGE 2: TREND SCHEMAS ---
class TrendSummaryTrafficValue(BaseSchema):
    avg: float
    max: float


class TrendSummaryTraffic(BaseSchema):
    rx: TrendSummaryTrafficValue
    tx: TrendSummaryTrafficValue


class TrendSummaryResourceValue(BaseSchema):
    avg: float
    max: Optional[float] = None
    min: Optional[float] = None


class TrendSummaryResource(BaseSchema):
    cpu: TrendSummaryResourceValue
    mem: TrendSummaryResourceValue


class TrendDataQuality(BaseSchema):
    total_points: int
    gap_points: int
    gap_percentage: float


class TrendPeak(BaseSchema):
    value: float
    timestamp: Optional[str] = None


class TrendTrough(BaseSchema):
    value: float
    timestamp: Optional[str] = None


class TrendDirectional(BaseSchema):
    trend_direction: str
    growth_percent: float
    delta_value: float
    peak: TrendPeak
    trough: TrendTrough
    volatility_score: float


class TrendSummary(BaseSchema):
    traffic: TrendSummaryTraffic
    resource: TrendSummaryResource
    data_quality: TrendDataQuality
    directional: TrendDirectional


class TrendSeriesItem(BaseSchema):
    period: str
    rx: float
    tx: float
    rx_ma: float
    tx_ma: float
    cpu: float
    mem: float


class TrendMetadata(BaseSchema):
    accuracy_pct: Decimal
    is_low_accuracy: bool
    version: str


class TrendAnalysisResponse(BaseSchema):
    summary: TrendSummary
    series: List[TrendSeriesItem]
    metadata: TrendMetadata


# --- STAGE 3-5: ANALYTICS SCHEMAS ---
class CorrelationData(BaseSchema):
    rx_vs_cpu: float


class HabitPeakHour(BaseSchema):
    hour: int
    avg_rx: float


class HabitData(BaseSchema):
    peak_hours: List[HabitPeakHour]


class AnomalyItem(BaseSchema):
    period: str
    rx: float
    z_score: float


class AnomalyData(BaseSchema):
    detected_count: int
    items: List[AnomalyItem]


class AnalyticsMetadata(BaseSchema):
    source_id: str
    processed_at: str


class AdvancedAnalyticsResponse(BaseSchema):
    correlation: CorrelationData
    habit: HabitData
    anomaly: AnomalyData
    metadata: AnalyticsMetadata


# --- STAGE 6: HEALTH SCORE SCHEMAS ---
class HealthComponents(BaseSchema):
    stability: float
    utilization: float
    anomaly_penalty: float
    anomaly_score: float


class HealthMetadata(BaseSchema):
    is_low_confidence: bool
    accuracy_pct: Decimal


class HealthScoreResponse(BaseSchema):
    total_score: Decimal
    components: HealthComponents
    metadata: HealthMetadata


# --- STAGE 7: INSIGHT SCHEMAS ---
class InsightItem(BaseSchema):
    type: str
    level: str
    title: str
    message: str
    link: str
    source_id: str
    accuracy_pct: Decimal
    is_low_confidence: bool
    raw_timestamp: str


class AnalysisResults(BaseSchema):
    trend: TrendAnalysisResponse
    analytics: AdvancedAnalyticsResponse
    health_score: HealthScoreResponse
    insights: List[InsightItem]


class AnalysisResponse(BaseSchema):
    status: str
    metadata: AnalysisMetadata
    stages: AnalysisStages
    results: AnalysisResults


class AsyncAnalysisResponse(BaseSchema):
    status: str
    task_id: str
    board_id: UUID
    interface_name: Optional[str] = None  # V2.4.1: Add interface_name
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


class HeavyAnomalyItem(BaseSchema):
    date: str
    traffic_value: float
    traffic_z_score: float
    cpu_value: float
    cpu_usage: float
    cpu_z_score: float
    mem_value: float
    mem_usage: float
    mem_z_score: float


class HeavyCorrelationData(BaseSchema):
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
    anomalies: List[HeavyAnomalyItem]
    correlation: HeavyCorrelationData
    health_stats: HealthStats
    top_growth_users: List[TopGrowthUser]


# --- KPI SUMMARY SCHEMAS ---
class AnalysisKpiSummaryResponse(BaseSchema):
    avg_cpu: float
    peak_cpu: float
    avg_download: Decimal
    max_download: Decimal
    total_download: Decimal
    active_users: int
    growth_pct: float
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct


# --- INTERFACE ANALYSIS SCHEMAS ---
class InterfaceAnalysisItem(BaseSchema):
    interface_name: str
    dl_val: Decimal
    ul_val: Decimal
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct


# --- HOTSPOT ANALYSIS SCHEMAS ---
class HotspotAnalysisItem(BaseSchema):
    username: str
    download_value: int
    upload_value: int
    active_days: int
    avg_daily_usage: Decimal
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct


# --- CLIENTS ANALYSIS SCHEMAS ---
class ClientsAnalysisItem(BaseSchema):
    period: Any  # Can be date or datetime string
    pppoe: int
    hotspot: int
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct


# --- AGGREGATE ALL SCHEMAS ---
class AggregateAllItem(BaseSchema):
    period: str
    download_mbps: Decimal
    upload_mbps: Decimal
    cpu_percent_standard: Optional[float] = None
    free_memory: Optional[float] = None
    active_users: Optional[int] = None
    accuracy_pct: Decimal  # UPDATE 2.4.1: Add accuracy_pct


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
    interface_name: Optional[str] = None  # V2.4.1: Add interface_name
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
