
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(BigInteger, primary_key=True, autoincrement=True) # UPDATE 2.4.1: Upgrade to BigInt for scalability
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("master_users.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    action = Column(String(50), nullable=False)  # LOGIN, CREATE, UPDATE, DELETE
    target_resource = Column(String(100), nullable=False)  # e.g., "Board: Gateway-HQ"
    details = Column(JSONB, nullable=True)  # Details of change
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    status = Column(String(20), default="SUCCESS")  # SUCCESS, FAILED
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("MasterUser")
