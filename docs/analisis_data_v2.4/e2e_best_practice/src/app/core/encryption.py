import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings


def _get_fernet() -> Fernet:
    # Derive a 32-byte URL-safe base64 key from the configured secret
    # This ensures consistent key generation from the string secret
    key = hashlib.sha256(settings.AES_SECRET_KEY.encode()).digest()
    key_b64 = base64.urlsafe_b64encode(key)
    return Fernet(key_b64)


def encrypt_password(plain_password: str) -> str:
    """Encrypts a plain text password using Fernet (AES)."""
    if not plain_password:
        return ""
    f = _get_fernet()
    return f.encrypt(plain_password.encode()).decode()


def decrypt_password(encrypted_password: str) -> str:
    """Decrypts an encrypted password."""
    if not encrypted_password:
        return ""
    try:
        f = _get_fernet()
        return f.decrypt(encrypted_password.encode()).decode()
    except Exception:
        # Return empty or handle error if decryption fails (e.g. key changed)
        return ""
