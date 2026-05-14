import pytest
import asyncio
from app.services.retention_service import vacuum_database, verify_backups

@pytest.mark.asyncio
async def test_vacuum_database():
    """
    Test that vacuum_database runs without error.
    Note: This requires a real Postgres database to be accessible.
    """
    try:
        await vacuum_database()
        assert True
    except Exception as e:
        pytest.fail(f"Vacuum database failed: {e}")

@pytest.mark.asyncio
async def test_verify_backups():
    """
    Test that verify_backups runs without error.
    """
    try:
        await verify_backups()
        assert True
    except Exception as e:
        pytest.fail(f"Verify backups failed: {e}")
