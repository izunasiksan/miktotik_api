import asyncio
import logging
from sqlalchemy import select
from app.core.database import SessionLocal
from app.services.audit_service import AuditService
from app.models.audit import AuditLog
from app.models.user import MasterUser
from app.models.mikrotik import MikrotikBoard # Required for SQLAlchemy relationship resolution

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_audit")

async def test_audit_flow():
    logger.info("🧪 Starting Audit Service Test...")
    
    async with SessionLocal() as db:
        # 1. Get a user or create dummy
        result = await db.execute(select(MasterUser).limit(1))
        user = result.scalars().first()
        
        user_id = user.user_id if user else None
        
        # 2. Simulate Login Action
        logger.info("📝 Logging activity: LOGIN")
        await AuditService.log_activity(
            user_id=user_id,
            action="TEST_LOGIN",
            target_resource="System",
            details={"test": "true"},
            ip_address="127.0.0.1",
            status="SUCCESS"
        )
        
        # 3. Verify Log exists
        result = await db.execute(
            select(AuditLog)
            .where(AuditLog.action == "TEST_LOGIN")
            .order_by(AuditLog.created_at.desc())
        )
        log = result.scalars().first()
        
        assert log is not None, "❌ Audit Log not found!"
        assert log.status == "SUCCESS", "❌ Status mismatch"
        assert log.details["test"] == "true", "❌ Details mismatch"
        
        logger.info(f"✅ Log found: ID={log.log_id}, Action={log.action}")
        
        # Cleanup
        await db.delete(log)
        await db.commit()
        logger.info("🧹 Cleanup done.")
        
    logger.info("🎉 Audit Test Passed!")

if __name__ == "__main__":
    asyncio.run(test_audit_flow())
