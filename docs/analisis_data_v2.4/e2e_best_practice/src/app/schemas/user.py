from datetime import datetime
from typing import Optional
from uuid import UUID

from app.schemas.base import BaseSchema


# Shared properties
class MasterRoleResponse(BaseSchema):
    role_id: int
    role_name: str
    permissions: Optional[dict] = None
    created_at: datetime


class UserBase(BaseSchema):
    username: Optional[str] = None
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = True


# Properties to receive via API on creation
class UserCreate(BaseSchema):
    username: str
    password: str
    full_name: str
    role_id: int
    is_active: Optional[bool] = True


# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None


class UserInDBBase(UserBase):
    user_id: UUID


class UserResponse(UserInDBBase):
    role_rel: Optional[MasterRoleResponse] = None


# Additional properties to return via API
class User(UserResponse):
    pass


# Schema for User Board Access
class UserBoardAccessBase(BaseSchema):
    user_id: UUID
    board_id: UUID


class UserBoardAccessCreate(UserBoardAccessBase):
    pass


class UserBoardAccessResponse(UserBoardAccessBase):
    access_id: int
    granted_at: datetime
    board_name: Optional[str] = None  # To show board name in response
