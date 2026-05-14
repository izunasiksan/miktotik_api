from datetime import datetime, timedelta
import asyncio
import os
import glob
from sqlalchemy import select
from fastapi import HTTPException
from app.core.database import SessionLocal as AsyncSessionLocal
from app.core.config import settings
from app.models.mikrotik import MikrotikBoard, TelegramRecipient
from app.services.backup_service import backup_service
from app.services.telegram_service import telegram_service
from app.services.aggregation_service import run_daily_aggregation_job, run_monthly_aggregation_job
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_daily_backups():
    """
    Task terjadwal untuk melakukan backup semua router aktif.
    Berjalan setiap malam (misal: 02:00 AM).
    """
    logger.info("🚀 [Scheduler] Starting Daily Backup Task...")
    
    report_data = {
        "success": [],
        "failed": []
    }

    # Gunakan session terpisah untuk pengambilan data board
    async with AsyncSessionLocal() as db:
        # 1. Ambil semua board yang dimonitor dan tidak sedang maintenance
        stmt = select(MikrotikBoard).where(
            MikrotikBoard.is_monitor.is_(True),
            MikrotikBoard.is_maintenance.is_(False)
        )
        result = await db.execute(stmt)
        boards = result.scalars().all()
        
        logger.info(f"📋 [Scheduler] Found {len(boards)} boards eligible for backup.")
        
        # Limit concurrency to avoid overwhelming the network
        semaphore = asyncio.Semaphore(5) 
        
        async def backup_single_board(board):
            async with semaphore:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                file_name = f"daily_backup_{board.board_name}_{timestamp}"
                
                try:
                    logger.info(f"⏳ [Backup] Starting backup for {board.board_name} ({board.ip_address})...")
                    
                    # Create a new session per task to be safe with async concurrency
                    async with AsyncSessionLocal() as task_db:
                         await backup_service.create_backup(task_db, board.board_id, file_name)
                    
                    logger.info(f"✅ [Backup] Success: {board.board_name}")
                    report_data["success"].append(board.board_name)
                    
                except HTTPException as e:
                    logger.error(f"❌ [Backup] Failed for {board.board_name}: {e.detail}")
                    report_data["failed"].append(f"{board.board_name} ({e.detail})")
                except Exception as e:
                    logger.error(f"❌ [Backup] Error for {board.board_name}: {str(e)}")
                    report_data["failed"].append(f"{board.board_name} ({str(e)})")

        # Create tasks
        tasks = [backup_single_board(board) for board in boards]
        
        if tasks:
            await asyncio.gather(*tasks)
            
    # 2. Retention Policy: Hapus file backup lama (> 30 hari)
    logger.info("🧹 [Scheduler] Starting Retention Cleanup...")
    backup_dir = "backups"
    retention_days = 30
    cutoff_time = datetime.now() - timedelta(days=retention_days)
    
    def cleanup_sync():
        count = 0
        if os.path.exists(backup_dir):
            # Cari semua file .backup
            files = glob.glob(os.path.join(backup_dir, "*.backup"))
            for file_path in files:
                try:
                    file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    if file_time < cutoff_time:
                        os.remove(file_path)
                        count += 1
                        logger.info(f"🗑️ [Cleanup] Deleted old backup: {os.path.basename(file_path)}")
                except Exception as e:
                    logger.error(f"⚠️ [Cleanup] Failed to delete {file_path}: {e}")
        return count

    loop = asyncio.get_running_loop()
    deleted_files_count = await loop.run_in_executor(None, cleanup_sync)
                
    logger.info(f"🏁 [Scheduler] Cleanup Completed. Deleted {deleted_files_count} files.")

    # 3. Send Telegram Report
    logger.info("📢 [Scheduler] Preparing Telegram Report...")
    
    total = len(report_data["success"]) + len(report_data["failed"])
    success_count = len(report_data["success"])
    failed_count = len(report_data["failed"])
    
    message = (
        f"📊 *DAILY BACKUP REPORT*\n"
        f"🗓️ {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
        f"✅ *Success:* {success_count}/{total}\n"
        f"❌ *Failed:* {failed_count}/{total}\n"
        f"🗑️ *Cleaned:* {deleted_files_count} files (>30 days)\n\n"
    )
    
    if report_data["failed"]:
        message += "*Failed Details:*\n"
        for fail in report_data["failed"][:10]: # Limit 10 items to prevent huge message
            message += f"• {fail}\n"
        if failed_count > 10:
            message += f"...and {failed_count - 10} more.\n"
    
    # Kirim ke Admin (Ambil dari DB atau Settings)
    async with AsyncSessionLocal() as db:
        try:
            # A. Ambil Bot Token dari DB
            bot = await telegram_service.get_active_bot(db)
            # Ambil token tanpa evaluasi boolean langsung pada Column
            token_value = getattr(bot, "bot_token", None) if bot is not None else None
            token: str | None = str(token_value) if token_value is not None else None
            # B. Ambil Admin Chat ID dari DB (TelegramRecipient dengan board_id NULL dianggap Global Admin)
            #    Atau bisa ditambahkan flag is_admin di masa depan.
            stmt = select(TelegramRecipient).where(TelegramRecipient.board_id.is_(None))
            result = await db.execute(stmt)
            admins = result.scalars().all()
            admin_ids = [int(str(admin.chat_id)) for admin in admins]
            # Fallback ke Settings jika DB kosong
            if not admin_ids:
                env_admin_id = getattr(settings, "TELEGRAM_ADMIN_ID", None)
                if env_admin_id:
                    admin_ids.append(int(env_admin_id))
            if not admin_ids:
                logger.warning("⚠️ [Telegram] No Admin ID found in DB or Settings. Skipping report.")
            else:
                for admin_id in admin_ids:
                    # Pastikan token bertipe str untuk memenuhi type checker yang ketat
                    token_to_use: str = str(token) if token is not None else ""
                    await telegram_service.send_message(admin_id, message, token=token_to_use)
        except Exception as e:
            logger.error(f"❌ [Report] Failed to send Telegram: {e}")

    logger.info("🏁 [Scheduler] Daily Backup Task Completed.")

async def run_daily_aggregation():
    """
    Task terjadwal untuk agregasi data harian.
    Dijalankan setiap hari (misal: 01:00 AM).
    """
    logger.info("📊 [Scheduler] Starting Daily Aggregation Task...")
    try:
        await run_daily_aggregation_job()
        logger.info("✅ [Aggregation] Daily aggregation completed successfully.")
    except Exception as e:
        logger.error(f"❌ [Aggregation] Daily aggregation failed: {e}")

async def run_monthly_aggregation():
    """
    Task terjadwal untuk agregasi data bulanan & loyalty.
    Dijalankan setiap tanggal 1 bulan baru (misal: 01:30 AM).
    """
    logger.info("📅 [Scheduler] Starting Monthly & Loyalty Aggregation Task...")
    try:
        await run_monthly_aggregation_job()
        logger.info("✅ [Aggregation] Monthly aggregation completed successfully.")
    except Exception as e:
        logger.error(f"❌ [Aggregation] Monthly aggregation failed: {e}")
