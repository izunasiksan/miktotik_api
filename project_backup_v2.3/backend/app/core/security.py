from datetime import datetime, timedelta, timezone
from typing import Any, Union
import jwt
from argon2 import PasswordHasher
from app.core.config import settings

# Inisialisasi Argon2 Hasher
ph = PasswordHasher()

def get_password_hash(password: str) -> str:
    """Mengembalikan hash Argon2 dari password plain text."""
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Memverifikasi apakah password plain text cocok dengan hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except Exception:
        return False

def create_access_token(subject: Union[str, Any], expires_delta: timedelta | None = None) -> str:
    """Membuat JWT Access Token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict | None:
    """Mendekode JWT Access Token."""
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return decoded_token
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
