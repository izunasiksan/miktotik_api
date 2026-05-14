from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.user import MasterUser
from app.services.audit_service import AuditService
from pydantic import BaseModel
from app.schemas.user import UserCreate, User
from app.core.security import get_password_hash

router = APIRouter()

@router.get("/ping")
async def ping():
    print("DEBUG: Ping endpoint hit")
    return {"message": "pong"}

class Token(BaseModel):
    access_token: str
    token_type: str

class RegisterResponse(BaseModel):
    message: str
    user: User

@router.post("/register/", response_model=RegisterResponse)
@limiter.limit("5/minute")
async def register_user(
    request: Request,
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Public user registration (self-service).
    - Creates a new user with role 'teknisi' by default.
    - Sets is_active=False so admin must approve.
    - Password is hashed (no plaintext stored).
    - Action is rate-limited and audited.
    """
    result = await db.execute(select(MasterUser).where(MasterUser.username == user_in.username))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    db_user = MasterUser(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role or "teknisi",
        is_active=False
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    import asyncio
    asyncio.create_task(AuditService.log_activity(
        user_id=db_user.user_id,
        action="REGISTER",
        target_resource="System",
        details={"username": user_in.username},
        ip_address=request.client.host if request.client else "Unknown",
        status="PENDING_APPROVAL"
    ))
    return RegisterResponse(message="Registration submitted. Awaiting admin approval.", user=User.model_validate(db_user))

@router.post("/login/", response_model=Token)
@limiter.limit("5/minute")
async def login_access_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    # print(f"DEBUG: Login attempt for user: {form_data.username}")
    try:
        # 1. Cari user berdasarkan username
        # print("DEBUG: Executing DB query...")
        result = await db.execute(select(MasterUser).where(MasterUser.username == form_data.username))
        user = result.scalars().first()
        # print(f"DEBUG: User found: {user}")

        # 2. Validasi user dan password
        is_valid = False
        if user:
            # print(f"DEBUG: Verifying password for user {user.username}...")
            is_valid = security.verify_password(form_data.password, user.password_hash)
            # print(f"DEBUG: Password valid: {is_valid}")
        else:
            # print("DEBUG: User not found.")
            is_valid = False

        if not user or not is_valid:
            # print("DEBUG: Login failed. Logging audit...")
            import asyncio
            asyncio.create_task(AuditService.log_activity(
                user_id=user.user_id if user else None,
                action="LOGIN",
                target_resource="System",
                details={"username": form_data.username, "reason": "Invalid credentials"},
                ip_address=request.client.host if request.client else "Unknown",
                status="FAILED"
            ))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not user.is_active:
            # print("DEBUG: User inactive.")
            import asyncio
            asyncio.create_task(AuditService.log_activity(
                user_id=user.user_id,
                action="LOGIN",
                target_resource="System",
                details={"username": form_data.username, "reason": "Inactive user"},
                ip_address=request.client.host if request.client else "Unknown",
                status="FAILED"
            ))
            raise HTTPException(status_code=400, detail="Inactive user")
            
        # 3. Buat token
        # print("DEBUG: Creating token...")
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            subject=user.username, expires_delta=access_token_expires
        )
        # print("DEBUG: Token created.")

        import asyncio
        asyncio.create_task(AuditService.log_activity(
            user_id=user.user_id,
            action="LOGIN",
            target_resource="System",
            details={"username": user.username},
            ip_address=request.client.host if request.client else "Unknown",
            status="SUCCESS"
        ))
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
        }
    except Exception as e:
        # print(f"DEBUG: Exception in login_access_token: {e}")
        # import traceback
        # traceback.print_exc()
        raise e

@router.get("/me/", response_model=dict)
async def read_users_me(current_user: MasterUser = Depends(deps.get_current_user)):
    """
    Get current user details
    """
    return {
        "user_id": str(current_user.user_id),
        "username": current_user.username,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active
    }

@router.post("/test-token/", response_model=dict)
async def test_token(current_user: MasterUser = Depends(deps.get_current_user)) -> Any:
    """
    Test access token
    """
    return {
        "username": current_user.username,
        "role": current_user.role,
        "full_name": current_user.full_name
    }
