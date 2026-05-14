import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.mikrotik import MikrotikBoard


class MasterRole(Base):
    __tablename__ = "master_roles"

    role_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    permissions: Mapped[dict] = mapped_column(JSONB, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    users: Mapped[List["MasterUser"]] = relationship("MasterUser", back_populates="role_rel")


class MasterUser(Base):
    __tablename__ = "master_users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(100))
    
    # 3NF Update: role_id replaces role string
    role_id: Mapped[int] = mapped_column(ForeignKey("master_roles.role_id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    role_rel: Mapped["MasterRole"] = relationship("MasterRole", back_populates="users")
    board_access: Mapped[List["UserBoardAccess"]] = relationship(
        "UserBoardAccess", back_populates="user", cascade="all, delete-orphan"
    )


class UserBoardAccess(Base):
    __tablename__ = "user_board_access"

    access_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("master_users.user_id", ondelete="CASCADE")
    )
    board_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mikrotik_boards.board_id", ondelete="CASCADE")
    )

    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["MasterUser"] = relationship(
        "MasterUser", back_populates="board_access"
    )

    # Gunakan forward reference untuk MikrotikBoard
    if TYPE_CHECKING:
        board: Mapped["MikrotikBoard"] = relationship(
            "MikrotikBoard", back_populates="user_access"
        )
    else:
        board: Mapped["MikrotikBoard"] = relationship(
            "MikrotikBoard", back_populates="user_access"
        )

    __table_args__ = (UniqueConstraint("user_id", "board_id", name="unique_access"),)
