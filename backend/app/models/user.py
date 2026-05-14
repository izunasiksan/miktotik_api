import uuid
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.mikrotik import MikrotikBoard

class MasterUser(Base):
    __tablename__ = "master_users"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), default="teknisi")  # admin, teknisi, viewer
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    board_access: Mapped[List["UserBoardAccess"]] = relationship("UserBoardAccess", back_populates="user", cascade="all, delete-orphan")

class UserBoardAccess(Base):
    __tablename__ = "user_board_access"

    access_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("master_users.user_id", ondelete="CASCADE"))
    board_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE"))
    
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user: Mapped["MasterUser"] = relationship("MasterUser", back_populates="board_access")
    
    # Gunakan forward reference untuk MikrotikBoard
    if TYPE_CHECKING:
        board: Mapped["MikrotikBoard"] = relationship("MikrotikBoard", back_populates="user_access")
    else:
        board: Mapped["MikrotikBoard"] = relationship("MikrotikBoard", back_populates="user_access")

    __table_args__ = (
        UniqueConstraint('user_id', 'board_id', name='unique_access'),
    )
