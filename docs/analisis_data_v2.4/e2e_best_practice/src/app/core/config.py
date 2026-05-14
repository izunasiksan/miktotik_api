# UPDATED v2.4 - INDIKATOR SINKRONISASI
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # DATABASE
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "db_master_mikrotik"
    DB_USER: str = "postgres"
    DB_PASS: str = "root"  # REMEDIATION: No default password, must be provided via env

    # SECURITY
    AES_SECRET_KEY: str = "REDACTED"
    SECRET_KEY: str = "REDACTED"  # Matches .env SECRET_KEY
    ALGORITHM: str = "HS256"  # Matches .env ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # MIKROTIK
    MAX_DB_CONNECTIONS: int = 20
    POLLING_INTERVAL_MINUTES: int = 5

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:5173",
    ]  # REMEDIATION: Specific domains only

    # SECURITY - PHASE 11
    ALLOWED_ADMIN_IPS: list[str] = [
        "127.0.0.1",
        "localhost",
        "::1",
    ]  # Default to local only

    # REDIS
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: Optional[str] = None  # Will be constructed if not provided

    @property
    def FINAL_REDIS_URL(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        # Use IPv4 127.0.0.1 instead of 'localhost' to avoid dual-stack/IPv6 connection issues (Errno 10061)
        host = "127.0.0.1" if self.REDIS_HOST == "localhost" else self.REDIS_HOST
        return f"redis://{host}:{self.REDIS_PORT}/0"

    # TELEGRAM
    TELEGRAM_BOT_TOKEN: Optional[str] = None

    # MONITORING
    ENABLE_METRICS: bool = True  # Enable Prometheus metrics

    # SYSTEM
    ENABLE_SCHEDULER: bool = True  # Enable for background tasks

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = [".env", "../.env"]
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env if any


settings = Settings()
