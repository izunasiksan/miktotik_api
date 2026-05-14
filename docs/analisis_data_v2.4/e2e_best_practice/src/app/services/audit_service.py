import logging

from app.core.database import SessionLocal
from app.models.audit import AuditLog

logger = logging.getLogger("audit_service")


class AuditService:
    @staticmethod
    async def log_activity(
        user_id,
        action: str,
        target_resource: str,
        details: dict | None = None,
        ip_address: str | None = None,
        status: str = "SUCCESS",
    ):
        """
        Catat aktivitas user ke tabel audit_logs secara async.
        Tidak mem-block flow utama jika gagal (fire-and-forget logic).
        """
        async with SessionLocal() as db:
            try:
                log = AuditLog(
                    user_id=user_id,
                    action=action,
                    target_resource=target_resource,
                    details=details,
                    ip_address=ip_address,
                    status=status,
                )
                db.add(log)
                await db.commit()
            except Exception as e:
                logger.error(f"❌ Failed to write audit log: {e}")
                # Silent fail to prevent impacting user experience
