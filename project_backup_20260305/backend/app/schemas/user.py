from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

# Shared properties
class UserBase(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "teknisi"
    is_active: Optional[bool] = True

# Properties to receive via API on creation
class UserCreate(BaseModel):
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
    model_config = ConfigDict(from_attributes=True)

# Additional properties to return via API
class User(UserInDBBase):
    pass

# Schema for User Board Access
class UserBoardAccessBase(BaseModel):
    user_id: UUID
    board_id: UUID

class UserBoardAccessCreate(UserBoardAccessBase):
    pass

class UserBoardAccessResponse(UserBoardAccessBase):
    access_id: int
    granted_at: datetime
    board_name: Optional[str] = None  # To show board name in response

    model_config = ConfigDict(from_attributes=True)
