import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Computed,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Interval,
    Numeric,
    Sequence,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, INET, MACADDR, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class MasterSite(Base):
    __tablename__ = "master_sites"

    site_id = Column(Integer, primary_key=True, autoincrement=True)
    site_name = Column(String(50), unique=True, nullable=False)
    location = Column(Text)
    pic_name = Column(String(100))
    pic_phone = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    boards = relationship("MikrotikBoard", back_populates="site")


class MasterBoardModel(Base):
    __tablename__ = "master_board_models"

    model_id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(50), unique=True, nullable=False)
    cpu_model = Column(String(100))
    core_count = Column(Integer)
    total_memory = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    boards = relationship("MikrotikBoard", back_populates="board_model_rel")


class MikrotikBoard(Base):
    __tablename__ = "mikrotik_boards"

    board_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Identitas & Manajemen
    board_name = Column(String(100), nullable=False)
    mikrotik_identity = Column(String(100))
    
    # 3NF Update: IDs replace strings
    model_id = Column(Integer, ForeignKey("master_board_models.model_id"))
    site_id = Column(Integer, ForeignKey("master_sites.site_id"), nullable=False)

    # Jaringan & Port
    mac_address = Column(MACADDR, nullable=False)
    ip_address = Column(INET, nullable=False)
    port_ssh = Column(Integer, default=22)
    port_api = Column(Integer, default=8728)
    port_winbox = Column(Integer, default=8291)
    port_ftp = Column(Integer, default=21)

    # Status & Flags (Logic Monitoring)
    is_online = Column(Boolean, default=False)
    is_monitor = Column(Boolean, default=True)
    is_public_review = Column(Boolean, default=True)
    is_maintenance = Column(Boolean, default=False)

    # Metadata
    last_ping_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    site = relationship("MasterSite", back_populates="boards")
    board_model_rel = relationship("MasterBoardModel", back_populates="boards")
    credentials = relationship(
        "BoardCredential",
        back_populates="board",
        uselist=False,
        cascade="all, delete-orphan",
    )
    vpn_profiles = relationship(
        "VPNProfile", back_populates="board", cascade="all, delete-orphan"
    )
    client_stats = relationship(
        "BoardClientStat", back_populates="board", cascade="all, delete-orphan"
    )
    resource_stats = relationship(
        "BoardResourceStat", back_populates="board", cascade="all, delete-orphan"
    )
    speed_stats = relationship(
        "BoardSpeedStat", back_populates="board", cascade="all, delete-orphan"
    )
    daily_summaries = relationship(
        "BoardDailySummary", back_populates="board", cascade="all, delete-orphan"
    )
    interface_daily_summaries = relationship(
        "BoardInterfaceDailySummary",
        back_populates="board",
        cascade="all, delete-orphan",
    )
    monthly_summaries = relationship(
        "BoardMonthlySummary", back_populates="board", cascade="all, delete-orphan"
    )
    events = relationship(
        "BoardEvent", back_populates="board", cascade="all, delete-orphan"
    )
    user_access = relationship(
        "UserBoardAccess", back_populates="board", cascade="all, delete-orphan"
    )

    # New Relationships
    backups = relationship(
        "BoardBackup", back_populates="board", cascade="all, delete-orphan"
    )
    interface_configs = relationship(
        "BoardInterfaceConfig", back_populates="board", cascade="all, delete-orphan"
    )
    interface_usages = relationship(
        "BoardInterfaceUsage", back_populates="board", cascade="all, delete-orphan"
    )
    pppoe_usages = relationship(
        "BoardPppoeUsage", back_populates="board", cascade="all, delete-orphan"
    )
    hotspot_usages = relationship(
        "HotspotUsageRaw", back_populates="board", cascade="all, delete-orphan"
    )
    # Note: TelegramRecipients links to board, but usually accessed via board_id query.
    # We can add relationship if needed.
    telegram_recipients = relationship(
        "TelegramRecipient", back_populates="board", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_board_logic", "is_online", "is_monitor", "is_public_review"),
        Index("idx_board_site", "site_id"),
    )


class BoardCredential(Base):
    __tablename__ = "board_credentials"

    cred_id = Column(Integer, primary_key=True, autoincrement=True)
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )
    username_mikrotik = Column(String(50), nullable=False)
    password_mikrotik_encrypted = Column(
        Text, nullable=False
    )  # Changed to Text based on schema
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    board = relationship("MikrotikBoard", back_populates="credentials")


class VPNProfile(Base):
    __tablename__ = "vpn_profiles"

    vpn_id = Column(Integer, primary_key=True, autoincrement=True)
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )

    vpn_type = Column(String(20), default="L2TP/IPSEC")
    vpn_api = Column(String(255))
    vpn_username = Column(String(50))
    vpn_password_encrypted = Column(Text)  # Changed to Text based on schema

    vpn_ssh = Column(String(255))
    vpn_ftp = Column(String(255))
    vpn_winbox = Column(String(255))

    is_connected = Column(Boolean, default=False)
    last_connected_at = Column(DateTime(timezone=True))

    board = relationship("MikrotikBoard", back_populates="vpn_profiles")


class BoardClientStat(Base):
    __tablename__ = "board_client_stats"

    # UPDATE 2.4.1 Sinkronisasi Skema: Refaktor BigSerial ke BigInt + Sequence untuk Partisi (Composite PK)
    stat_id = Column(
        BigInteger,
        Sequence("board_client_stats_stat_id_seq"),
        primary_key=True,
        autoincrement=False,
    )
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )
    total_hotspot = Column(Integer, default=0)
    total_pppoe = Column(Integer, default=0)

    # Generated column support in SQLAlchemy
    total_active = Column(
        Integer, Computed("total_hotspot + total_pppoe", persisted=True)
    )

    accuracy_pct = Column(Numeric(5, 2), server_default="100.00")
    log_time = Column(DateTime(timezone=True), server_default=func.now(), primary_key=True) # UPDATE 2.4.1: Composite PK for Partitioning

    board = relationship("MikrotikBoard", back_populates="client_stats")

    __table_args__ = (
        Index("idx_client_stats_time", "board_id", log_time.desc()),
        Index("idx_client_stats_brd_time", "board_id", log_time),
    )


class BoardResourceStat(Base):
    __tablename__ = "board_resource_stats"

    # UPDATE 2.4.1 Sinkronisasi Skema: Refaktor BigSerial ke BigInt + Sequence untuk Partisi (Composite PK)
    resource_id = Column(
        BigInteger,
        Sequence("board_resource_stats_resource_id_seq"),
        primary_key=True,
        autoincrement=False,
    )
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )
    cpu_load = Column(Integer)
    free_memory = Column(BigInteger)  # BigInt
    free_hdd = Column(BigInteger)  # BigInt
    uptime = Column(Interval)  # Interval type
    accuracy_pct = Column(Numeric(5, 2), server_default="100.00")
    log_time = Column(DateTime(timezone=True), server_default=func.now(), primary_key=True) # UPDATE 2.4.1: Composite PK

    board = relationship("MikrotikBoard", back_populates="resource_stats")

    __table_args__ = (
        Index("idx_resource_stats_time", "board_id", log_time.desc()),
        Index("idx_resource_stats_brd_time", "board_id", log_time),
    )


class BoardSpeedStat(Base):
    __tablename__ = "board_speed_stats"

    # UPDATE 2.4.1 Sinkronisasi Skema: Refaktor BigSerial ke BigInt + Sequence untuk Partisi (Composite PK)
    speed_id = Column(
        BigInteger,
        Sequence("board_speed_stats_speed_id_seq"),
        primary_key=True,
        autoincrement=False,
    )
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )
    interface_name = Column(String(100), nullable=False)
    download_mbps = Column(
        Numeric(15, 2), default=0
    )  # Numeric (UPDATE 2.4.1: Sync precision)
    upload_mbps = Column(
        Numeric(15, 2), default=0
    )  # Numeric (UPDATE 2.4.1: Sync precision)
    accuracy_pct = Column(Numeric(5, 2), server_default="100.00")
    log_time = Column(DateTime(timezone=True), server_default=func.now(), primary_key=True) # UPDATE 2.4.1: Composite PK

    board = relationship("MikrotikBoard", back_populates="speed_stats")

    __table_args__ = (
        Index(
            "idx_speed_interface_time", "board_id", "interface_name", log_time.desc()
        ),
        Index("idx_speed_brd_time", "board_id", log_time),
    )


class BoardDailySummary(Base):
    __tablename__ = "board_daily_summary"

    summary_id = Column(Integer, primary_key=True, autoincrement=True)
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )

    # Resource Stats
    avg_cpu_load = Column(Integer, default=0)
    max_cpu_load = Column(Integer, default=0)
    min_free_memory = Column(BigInteger, default=0)

    # Traffic Stats (UPDATE 2.4.1: Sync precision to Numeric(15,2))
    avg_download = Column(Numeric(15, 2), default=0)
    max_download = Column(Numeric(15, 2), default=0)
    total_download_bytes = Column(BigInteger, default=0)

    avg_upload = Column(Numeric(15, 2), default=0)
    max_upload = Column(Numeric(15, 2), default=0)
    total_upload_bytes = Column(BigInteger, default=0)

    # Client Stats
    avg_hotspot_users = Column(Integer, default=0)
    max_hotspot_users = Column(Integer, default=0)

    avg_pppoe_users = Column(Integer, default=0)
    max_pppoe_users = Column(Integer, default=0)

    # V2.4.2: Gap Metadata
    cpu_sample_count = Column(Integer, default=0)
    speed_sample_count = Column(Integer, default=0)
    gap_ratio = Column(Numeric(5, 2), default=0.00)
    data_completeness = Column(Numeric(5, 2), default=0.00)

    accuracy_pct = Column(
        Numeric(5, 2), server_default="100.00"
    )  # UPDATE 2.4.1: Add accuracy_pct
    log_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    board = relationship("MikrotikBoard", back_populates="daily_summaries")

    __table_args__ = (
        Index("idx_daily_summary_board_date", "board_id", "log_date", unique=True),
    )


class BoardInterfaceDailySummary(Base):
    __tablename__ = "board_interface_daily_summary"

    summary_id = Column(Integer, primary_key=True, autoincrement=True)
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )
    interface_name = Column(String(100), nullable=False)

    # Traffic Stats (UPDATE 2.4.1: Sync precision to Numeric(15,2))
    avg_download_mbps = Column(Numeric(15, 2), default=0)
    max_download_mbps = Column(Numeric(15, 2), default=0)
    p95_download_mbps = Column(Numeric(15, 2), default=0)

    avg_upload_mbps = Column(Numeric(15, 2), default=0)
    max_upload_mbps = Column(Numeric(15, 2), default=0)

    accuracy_pct = Column(
        Numeric(5, 2), server_default="100.00"
    )  # UPDATE 2.4.1: Add accuracy_pct
    log_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    board = relationship("MikrotikBoard", back_populates="interface_daily_summaries")

    __table_args__ = (
        Index(
            "idx_interface_summary_lookup",
            "board_id",
            "interface_name",
            "log_date",
        ),
        UniqueConstraint(
            "board_id", "interface_name", "log_date", name="unique_interface_daily"
        ),
    )


class BoardMonthlySummary(Base):
    __tablename__ = "board_monthly_summary"

    summary_id = Column(Integer, primary_key=True, autoincrement=True)
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )

    # Resource Stats
    avg_cpu_load = Column(Integer, default=0)
    max_cpu_load = Column(Integer, default=0)

    # Traffic Stats (UPDATE 2.4.1: Correct type and precision to Numeric(15,2))
    avg_download = Column(Numeric(15, 2), default=0)
    max_download = Column(Numeric(15, 2), default=0)
    total_download_bytes = Column(BigInteger, default=0)

    avg_upload = Column(Numeric(15, 2), default=0)
    max_upload = Column(Numeric(15, 2), default=0)
    total_upload_bytes = Column(BigInteger, default=0)

    # Client Stats
    avg_hotspot_users = Column(Integer, default=0)
    max_hotspot_users = Column(Integer, default=0)

    accuracy_pct = Column(
        Numeric(5, 2), server_default="100.00"
    )  # UPDATE 2.4.1: Add accuracy_pct
    log_month = Column(Date, nullable=False)  # First day of month
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    board = relationship("MikrotikBoard", back_populates="monthly_summaries")

    __table_args__ = (
        Index("idx_monthly_summary_board_date", "board_id", "log_month", unique=True),
    )


class BoardEvent(Base):
    __tablename__ = "board_events"

    # UPDATE 2.4.1 Sinkronisasi Skema: Refaktor BigSerial ke BigInt + Sequence untuk Partisi (Composite PK)
    event_id = Column(
        BigInteger,
        Sequence("board_events_event_id_seq"),
        primary_key=True,
        autoincrement=False,
    )
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )
    event_category = Column(String(20))
    event_level = Column(String(10))
    event_name = Column(Text, nullable=False)
    event_detail = Column(Text)
    performed_by = Column(
        UUID(as_uuid=True), ForeignKey("master_users.user_id", ondelete="SET NULL")
    )
    is_reset_event = Column(Boolean, default=False)
    accuracy_pct = Column(Numeric(5, 2), server_default="100.00")
    log_time = Column(DateTime(timezone=True), server_default=func.now(), primary_key=True) # UPDATE 2.4.1: Composite PK

    board = relationship("MikrotikBoard", back_populates="events")

    __table_args__ = (
        Index("idx_board_events_board_time", "board_id", log_time.desc()),
        Index("idx_board_events_time", log_time.desc()),
    )


# --- NEW TABLES FROM SCHEMA.SQL ---


class BoardBackup(Base):
    __tablename__ = "board_backups"

    backup_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )

    log_date = Column(DateTime(timezone=True), server_default=func.now())
    file_name = Column(String(255), nullable=False)
    router_name = Column(String(100))
    router_model = Column(String(50))

    file_location = Column(Text, nullable=False)
    status = Column(String(20), default="success")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    board = relationship("MikrotikBoard", back_populates="backups")

    __table_args__ = (Index("idx_backup_board_history", "board_id", log_date.desc()),)


class TelegramBot(Base):
    __tablename__ = "telegram_bots"

    bot_id = Column(Integer, primary_key=True, autoincrement=True)
    bot_name = Column(String(100), nullable=False)
    bot_token = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    recipients = relationship(
        "TelegramRecipient", back_populates="bot", cascade="all, delete-orphan"
    )


class TelegramRecipient(Base):
    __tablename__ = "telegram_recipients"

    recipient_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("master_users.user_id", ondelete="CASCADE")
    )
    bot_id = Column(Integer, ForeignKey("telegram_bots.bot_id", ondelete="CASCADE"))
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )

    chat_id = Column(BigInteger, nullable=False)
    alert_levels = Column(ARRAY(Text), default=["critical"])  # Using ARRAY
    is_active = Column(Boolean, default=True)

    bot = relationship("TelegramBot", back_populates="recipients")
    board = relationship("MikrotikBoard", back_populates="telegram_recipients")
    # user relationship needed if we want to access user details
    # user = relationship("MasterUser", ...) # Assuming MasterUser is in user.py, we might need to import or use string reference if possible, or just keep ID.

    __table_args__ = (
        UniqueConstraint("bot_id", "board_id", "chat_id", name="unique_mapping"),
    )


class BoardInterfaceConfig(Base):
    __tablename__ = "board_interface_configs"

    config_id = Column(Integer, primary_key=True, autoincrement=True)
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )

    interface_name = Column(String(100), nullable=False)
    interface_label = Column(String(100))

    is_active = Column(Boolean, default=True)
    is_primary_uplink = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    board = relationship("MikrotikBoard", back_populates="interface_configs")

    __table_args__ = (
        UniqueConstraint("board_id", "interface_name", name="unique_board_port"),
    )


class BoardInterfaceUsage(Base):
    __tablename__ = "board_interface_usage"

    # UPDATE 2.4.1 Sinkronisasi Skema: Refaktor BigSerial ke BigInt + Sequence untuk Partisi (Composite PK)
    usage_id = Column(
        BigInteger,
        Sequence("board_interface_usage_usage_id_seq"),
        primary_key=True,
        autoincrement=False,
    )
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )
    interface_name = Column(String(100), nullable=False)

    total_tx_bytes = Column(BigInteger, default=0)
    total_rx_bytes = Column(BigInteger, default=0)

    accuracy_pct = Column(Numeric(5, 2), server_default="100.00")
    log_date = Column(Date, server_default=func.current_date(), primary_key=True) # UPDATE 2.4.1: Composite PK
    last_update = Column(DateTime(timezone=True), server_default=func.now())

    board = relationship("MikrotikBoard", back_populates="interface_usages")

    __table_args__ = (
        Index("idx_usage_report_v2", "board_id", log_date.desc()),
        UniqueConstraint(
            "board_id", "interface_name", "log_date", name="unique_daily_usage"
        ),
    )


class BoardPppoeUsage(Base):
    __tablename__ = "board_pppoe_usage"

    # UPDATE 2.4.1 Sinkronisasi Skema: Refaktor BigSerial ke BigInt + Sequence untuk Partisi (Composite PK)
    usage_id = Column(
        BigInteger,
        Sequence("board_pppoe_usage_usage_id_seq"),
        primary_key=True,
        autoincrement=False,
    )
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )

    pppoe_username = Column(String(100), nullable=False)

    upload_bytes = Column(BigInteger, default=0)
    download_bytes = Column(BigInteger, default=0)

    accuracy_pct = Column(Numeric(5, 2), server_default="100.00")
    log_date = Column(Date, server_default=func.current_date(), primary_key=True) # UPDATE 2.4.1: Composite PK
    last_update = Column(DateTime(timezone=True), server_default=func.now())

    board = relationship("MikrotikBoard", back_populates="pppoe_usages")

    __table_args__ = (
        Index(
            "idx_pppoe_usage_lookup_v2",
            "board_id",
            log_date.desc(),
            download_bytes.desc(),
        ),
        UniqueConstraint(
            "board_id", "pppoe_username", "log_date", name="unique_pppoe_daily"
        ),
    )


class HotspotUsageRaw(Base):
    __tablename__ = "hotspot_usage_raw"

    # UPDATE 2.4.1 Sinkronisasi Skema: Refaktor BigSerial ke BigInt + Sequence untuk Partisi (Composite PK)
    raw_id = Column(
        BigInteger,
        Sequence("hotspot_usage_raw_raw_id_seq"),
        primary_key=True,
        autoincrement=False,
    )
    board_id = Column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )
    username = Column(String(100), nullable=False)

    daily_download = Column(BigInteger, default=0)
    daily_upload = Column(BigInteger, default=0)
    daily_uptime = Column(BigInteger, default=0)

    accuracy_pct = Column(Numeric(5, 2), server_default="100.00")
    log_date = Column(Date, server_default=func.current_date(), primary_key=True) # UPDATE 2.4.1: Composite PK

    board = relationship("MikrotikBoard", back_populates="hotspot_usages")

    __table_args__ = (
        Index(
            "idx_hotspot_usage_lookup",
            "board_id",
            log_date.desc(),
            daily_download.desc(),
        ),
        UniqueConstraint(
            "username", "board_id", "log_date", name="unique_user_daily_raw"
        ),
    )


class HotspotUsageMonthly(Base):
    __tablename__ = "hotspot_usage_monthly"

    summary_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False)
    total_download = Column(BigInteger, default=0)
    total_upload = Column(BigInteger, default=0)
    total_uptime = Column(BigInteger, default=0)

    frequency_days = Column(Integer)
    month_period = Column(Date, nullable=False)  # First day of month
    is_frequent_user = Column(Boolean, default=False)
    accuracy_pct = Column(
        Numeric(5, 2), server_default="100.00"
    )  # UPDATE 2.4.1: Add accuracy_pct
    last_updated = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("username", "month_period", name="unique_user_monthly"),
    )
