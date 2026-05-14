from typing import Any, List
from uuid import UUID
import asyncio
import json

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.api import deps
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.user import MasterUser, UserBoardAccess
from app.schemas.user import User, UserCreate, UserUpdate, UserBoardAccessCreate, UserBoardAccessResponse
from app.models.mikrotik import MikrotikBoard
from app.services.audit_service import AuditService
from app.db.redis import redis_client

router = APIRouter()

@router.get("/", response_model=List[User])
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve users.
    """
    cache_key = f"users:list:{skip}:{limit}"
    cached_data = await redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    result = await db.execute(select(MasterUser).offset(skip).limit(limit))
    users = result.scalars().all()
    
    # Cache for 60 seconds
    data = jsonable_encoder(users)
    await redis_client.setex(cache_key, 60, json.dumps(data))
    
    return users

@router.post("/", response_model=User)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new user.
    """
    result = await db.execute(select(MasterUser).where(MasterUser.username == user_in.username))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    db_obj = MasterUser(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=user_in.is_active,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    asyncio.create_task(AuditService.log_activity(
        user_id=current_user.user_id,
        action="CREATE_USER",
        target_resource=f"User: {db_obj.username}",
        details=user_in.model_dump(exclude={"password"}),
        status="SUCCESS"
    ))
    
    return db_obj

@router.put("/{user_id}/", response_model=User)
async def update_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: UUID,
    user_in: UserUpdate,
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a user.
    """
    user = await db.get(MasterUser, user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system",
        )
    
    update_data = user_in.model_dump(exclude_unset=True)
    if update_data.get("password"):
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["password_hash"] = hashed_password
        
    for field in update_data:
        setattr(user, field, update_data[field])
        
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    asyncio.create_task(AuditService.log_activity(
        user_id=current_user.user_id,
        action="UPDATE_USER",
        target_resource=f"User: {user.username}",
        details=user_in.model_dump(exclude={"password"}, exclude_unset=True),
        status="SUCCESS"
    ))
    
    return user

@router.get("/{user_id}/", response_model=User)
async def read_user_by_id(
    user_id: UUID,
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get a specific user by id.
    """
    user = await db.get(MasterUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        return user
    if current_user.role != "admin":
         raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return user

@router.delete("/{user_id}/", response_model=User)
async def delete_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: UUID,
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete a user.
    """
    user = await db.get(MasterUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.user_id == current_user.user_id:
         raise HTTPException(status_code=400, detail="Users cannot delete themselves")
         
    await db.execute(delete(MasterUser).where(MasterUser.user_id == user.user_id))
    await db.commit()
    
    asyncio.create_task(AuditService.log_activity(
        user_id=current_user.user_id,
        action="DELETE_USER",
        target_resource=f"User: {user.username}",
        status="SUCCESS"
    ))
    
    return user

@router.post("/{user_id}/access/", response_model=UserBoardAccessResponse)
async def grant_user_access(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: UUID,
    access_in: UserBoardAccessCreate,
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Grant user access to a board.
    """
    if user_id != access_in.user_id:
         raise HTTPException(status_code=400, detail="User ID in path does not match body")

    user = await db.get(MasterUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    board = await db.get(MikrotikBoard, access_in.board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
        
    # Check if access already exists
    stmt = select(UserBoardAccess).where(
        UserBoardAccess.user_id == user_id,
        UserBoardAccess.board_id == access_in.board_id
    )
    result = await db.execute(stmt)
    existing_access = result.scalars().first()
    
    if existing_access:
        # Just return existing access, maybe fetch board name
        return UserBoardAccessResponse(
            access_id=existing_access.access_id,
            user_id=existing_access.user_id,
            board_id=existing_access.board_id,
            granted_at=existing_access.granted_at,
            board_name=str(board.board_name)
        )
        
    access = UserBoardAccess(
        user_id=user_id,
        board_id=access_in.board_id
    )
    db.add(access)
    await db.commit()
    await db.refresh(access)
    
    # Add board_name for response
    response = UserBoardAccessResponse(
        access_id=access.access_id,
        user_id=access.user_id,
        board_id=access.board_id,
        granted_at=access.granted_at,
        board_name=str(board.board_name)
    )
    
    asyncio.create_task(AuditService.log_activity(
        user_id=current_user.user_id,
        action="GRANT_ACCESS",
        target_resource=f"User: {user.username} -> Board: {board.board_name}",
        status="SUCCESS"
    ))
    
    return response

@router.delete("/{user_id}/access/{board_id}/")
async def revoke_user_access(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: UUID,
    board_id: UUID,
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Revoke user access from a board.
    """
    stmt = select(UserBoardAccess).where(
        UserBoardAccess.user_id == user_id,
        UserBoardAccess.board_id == board_id
    )
    result = await db.execute(stmt)
    access = result.scalars().first()
    
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
        
    await db.execute(delete(UserBoardAccess).where(UserBoardAccess.access_id == access.access_id))
    await db.commit()
    
    asyncio.create_task(AuditService.log_activity(
        user_id=current_user.user_id,
        action="REVOKE_ACCESS",
        target_resource=f"User: {user_id} -> Board: {board_id}",
        status="SUCCESS"
    ))
    
    return {"message": "Access revoked successfully"}

@router.get("/{user_id}/access/", response_model=List[UserBoardAccessResponse])
async def read_user_access(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Get all boards accessible by a user.
    """
    stmt = (
        select(UserBoardAccess, MikrotikBoard.board_name)
        .join(MikrotikBoard, UserBoardAccess.board_id == MikrotikBoard.board_id)
        .where(UserBoardAccess.user_id == user_id)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    access_list = []
    for access, board_name in rows:
        response = UserBoardAccessResponse(
            access_id=access.access_id,
            user_id=access.user_id,
            board_id=access.board_id,
            granted_at=access.granted_at,
            board_name=board_name
        )
        access_list.append(response)
        
    return access_list
