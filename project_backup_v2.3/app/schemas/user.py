from typing import Optional
from uuid import UUID
from datetime import datetime
from app.schemas.base import BaseSchema

# Shared properties
class UserBase(BaseSchema):
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "teknisi"
    is_active: Optional[bool] = True

# Properties to receive via API on creation
class UserCreate(BaseSchema):
    username: str
    password: str
    full_name: str
    role: str = "teknisi"
    is_active: Optional[bool] = True

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    user_id: UUID

class UserResponse(UserInDBBase):
    pass

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

