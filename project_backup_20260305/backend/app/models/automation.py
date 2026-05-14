import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, func, Index, Text, BigInteger
from sqlalchemy.dialects.postgresql import UUID, MACADDR, INET, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class AutomationJob(Base):
    __tablename__ = "automation_jobs"
    
    job_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_type = Column(String(50), nullable=False) # 'mass_config', 'reboot'
    
    payload = Column(JSONB) # { "command": "...", "target_ids": [...] }
    description = Column(Text)
    
    status = Column(String(20), default='pending') # pending, running, completed
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("master_users.user_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    logs = relationship("AutomationLog", back_populates="job", cascade="all, delete-orphan")

class AutomationLog(Base):
    __tablename__ = "automation_logs"
    
    log_id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("automation_jobs.job_id", ondelete="CASCADE"))
    board_id = Column(UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE"))
    
    status = Column(String(20), default='pending') # pending, success, failed
    output = Column(Text)
    error_message = Column(Text)
    
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    job = relationship("AutomationJob", back_populates="logs")
    board = relationship("MikrotikBoard") # Unidirectional link to board

class ZTPQueue(Base):
    __tablename__ = "ztp_queue"
    
    ztp_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    mac_address = Column(MACADDR, nullable=False)
    ip_address = Column(INET, nullable=False)
    
    identity = Column(String(100))
    model = Column(String(50))
    router_version = Column(String(50))
    
    temp_username = Column(String(50))
    temp_password = Column(Text) # Encrypted
    
    status = Column(String(20), default='pending') # pending, approved, rejected
    
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    processed_by = Column(UUID(as_uuid=True), ForeignKey("master_users.user_id"))
    
    __table_args__ = (
        Index('idx_ztp_status', 'status'),
    )
