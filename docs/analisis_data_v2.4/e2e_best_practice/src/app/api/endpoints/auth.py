from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_password_hash
from app.models.user import MasterUser, MasterRole
from app.schemas.base import BaseSchema
from app.schemas.user import User, UserCreate
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("/ping")
async def ping():
    print("DEBUG: Ping endpoint hit")
    return {"message": "pong"}


class Token(BaseModel):
    """
    Standard OAuth2 Token response.
    MUST be snake_case to comply with OAuth2 spec and authStore.js.
    Inherits from BaseModel instead of BaseSchema to avoid camelCase transformation.
    """
    access_token: str
    refresh_token: str | None = None
    token_type: str


class RefreshRequest(BaseSchema):
    """Payload untuk refresh token request (V2.4.1 CamelCase)."""
    refreshToken: str


class RegisterResponse(BaseSchema):
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
    - Creates a new user with role_id (3NF V2.4).
    - Default role is 'teknisi' if role_id is not provided in logic (though schema requires it).
    - Sets is_active=False so admin must approve.
    - Password is hashed (no plaintext stored).
    - Action is rate-limited and audited.
    """
    result = await db.execute(
        select(MasterUser).where(MasterUser.username == user_in.username)
    )
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Get default role if needed (though UserCreate.role_id is required)
    role_id = user_in.role_id
    if not role_id:
        role_result = await db.execute(select(MasterRole).where(MasterRole.role_name == "teknisi"))
        role = role_result.scalars().first()
        if not role:
             # Create default role if missing (fallback for migration/dev)
             role = MasterRole(role_name="teknisi")
             db.add(role)
             await db.flush()
        role_id = role.role_id

    db_user = MasterUser(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role_id=role_id,
        is_active=False,
    )
    db.add(db_user)
    await db.commit()
    
    # Reload user with eager loading for role_rel
    stmt = select(MasterUser).where(MasterUser.user_id == db_user.user_id).options(joinedload(MasterUser.role_rel))
    result = await db.execute(stmt)
    db_user = result.scalars().first()

    import asyncio

    asyncio.create_task(
        AuditService.log_activity(
            user_id=db_user.user_id if db_user else None,
            action="REGISTER",
            target_resource="System",
            details={"username": user_in.username},
            ip_address=request.client.host if request.client else "Unknown",
            status="PENDING_APPROVAL",
        )
    )
    # UPDATE 2.4.1 Pastikan response menggunakan camelCase
    return jsonable_encoder(RegisterResponse(
        message="Registration submitted. Awaiting admin approval.",
        user=User.model_validate(db_user),
    ), by_alias=True)


@router.post("/login/", response_model=Token)
@limiter.limit("5/minute")
async def login_access_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    # print(f"DEBUG: Login attempt for user: {form_data.username}")
    try:
        # 1. Cari user berdasarkan username
        # print("DEBUG: Executing DB query...")
        result = await db.execute(
            select(MasterUser).where(MasterUser.username == form_data.username)
        )
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

            asyncio.create_task(
                AuditService.log_activity(
                    user_id=user.user_id if user else None,
                    action="LOGIN",
                    target_resource="System",
                    details={
                        "username": form_data.username,
                        "reason": "Invalid credentials",
                    },
                    ip_address=request.client.host if request.client else "Unknown",
                    status="FAILED",
                )
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            # print("DEBUG: User inactive.")
            import asyncio

            asyncio.create_task(
                AuditService.log_activity(
                    user_id=user.user_id,
                    action="LOGIN",
                    target_resource="System",
                    details={"username": form_data.username, "reason": "Inactive user"},
                    ip_address=request.client.host if request.client else "Unknown",
                    status="FAILED",
                )
            )
            raise HTTPException(status_code=400, detail="Inactive user")

        # 3. Buat token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            subject=user.username, expires_delta=access_token_expires
        )
        refresh_token = security.create_refresh_token(subject=user.username)

        import asyncio

        asyncio.create_task(
            AuditService.log_activity(
                user_id=user.user_id,
                action="LOGIN",
                target_resource="System",
                details={"username": user.username},
                ip_address=request.client.host if request.client else "Unknown",
                status="SUCCESS",
            )
        )

        # UPDATE 2.4.1 KEMBALI KE SNAKE_CASE UNTUK TOKEN (OAuth2 Standard)
        # Frontend (authStore.js) mengharapkan 'access_token' dan 'token_type'.
        # Meskipun BaseSchema menggunakan alias_generator=to_camel, kita menggunakan 
        # dictionary manual di sini agar output jsonable_encoder tetap snake_case 
        # khusus untuk endpoint login ini guna menjaga kompatibilitas OAuth2 & Frontend.
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
    except Exception as e:
        # print(f"DEBUG: Exception in login_access_token: {e}")
        # import traceback
        # traceback.print_exc()
        raise e


@router.post("/refresh/", response_model=Token)
async def refresh_access_token(
    refresh_in: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Refresh access token using a valid refresh token.
    - Decodes refresh token.
    - Validates user still active.
    - Returns new access + refresh token (V2.4.1 UX improvement).
    """
    payload = security.decode_access_token(refresh_in.refreshToken)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject missing",
        )
        
    # Cari user
    result = await db.execute(
        select(MasterUser).where(MasterUser.username == username)
    )
    user = result.scalars().first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
        
    # Buat token baru
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = security.create_access_token(
        subject=user.username, expires_delta=access_token_expires
    )
    # Refresh token baru untuk rotasi (Opsional tapi lebih aman)
    new_refresh_token = security.create_refresh_token(subject=user.username)
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.get("/me/", response_model=dict)
async def read_users_me(current_user: MasterUser = Depends(deps.get_current_user)):
    """
    Get current user details (3NF compliant)
    """
    # UPDATE 2.4.1 Pastikan response menggunakan camelCase
    return jsonable_encoder({
        "userId": str(current_user.user_id),
        "username": current_user.username,
        "role": current_user.role_rel.role_name if current_user.role_rel else "Unknown",
        "fullName": current_user.full_name,
        "isActive": current_user.is_active,
    }, by_alias=True)


@router.post("/test-token/", response_model=dict)
async def test_token(current_user: MasterUser = Depends(deps.get_current_user)) -> Any:
    """
    Test access token (3NF compliant)
    """
    # UPDATE 2.4.1 Pastikan response menggunakan camelCase
    return jsonable_encoder({
        "username": current_user.username,
        "role": current_user.role_rel.role_name if current_user.role_rel else "Unknown",
        "fullName": current_user.full_name,
    }, by_alias=True)
