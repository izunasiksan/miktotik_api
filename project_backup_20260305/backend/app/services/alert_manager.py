import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.mikrotik import MikrotikBoard, BoardEvent
from app.services.telegram_service import telegram_service
from app.core.database import SessionLocal

logger = logging.getLogger("alert_manager")

class AlertManager:
    """
    Manages alerting logic, flapping prevention, and message formatting.
    """
    
    # Store flapping state in memory for now (or Redis in future)
    # Key: board_id, Value: timestamp of first failure
    _offline_candidates: Dict[str, datetime] = {}
    
    # Track failure counts per board for Rule 1.3 (> 3 times)
    _failure_counts: Dict[str, int] = {}
    
    # Grace period in seconds before sending alert for offline status
    FLAPPING_GRACE_PERIOD = 60 
    MAX_FAILURE_COUNT = 3 # Rule 1.3: Jika gagal berturut-turut > 3 kali, status router update OFFLINE
    async def check_health(self, session: AsyncSession, board: MikrotikBoard, metrics: Dict[str, Any]):
        """
        Main entry point to check metrics and trigger alerts.
        """
        # 1. Maintenance Check
        if getattr(board, 'is_maintenance', False):
            logger.info(f"Board {board.board_name} is in maintenance. Alerts suppressed.")
            return

        # 2. Offline Detection
        is_online_now = metrics.get('is_online', False)
        
        if not is_online_now:
            await self._handle_offline_event(session, board)
        else:
            await self._handle_recovery_event(session, board)
            
            # 3. High Load Detection (Only if online)
            cpu_load = metrics.get('cpu_load', 0)
            if cpu_load > 90:
                await self._trigger_alert(
                    session, 
                    board, 
                    "warning", 
                    f"⚠️ *HIGH CPU LOAD*\n\nRouter: {board.board_name}\nCPU: {cpu_load}%"
                )

    async def _handle_offline_event(self, session: AsyncSession, board: MikrotikBoard):
        board_id_str = str(board.board_id)
        
        # Rule 1.3: Increment failure count
        self._failure_counts[board_id_str] = self._failure_counts.get(board_id_str, 0) + 1
        count = self._failure_counts[board_id_str]
        
        logger.warning(f"Board {board.board_name} failure detected. Count: {count}/{self.MAX_FAILURE_COUNT}")
        
        # Check if we should mark as offline (if failed > MAX_FAILURE_COUNT times)
        if count >= self.MAX_FAILURE_COUNT:
            # Only send alert if DB status is currently Online
            if getattr(board, 'is_online', False): 
                logger.warning(f"Board {board.board_name} confirmed OFFLINE after {count} consecutive failures.")
                
                # Update Board Status in DB
                stmt = update(MikrotikBoard).where(MikrotikBoard.board_id == board.board_id).values(is_online=False)
                await session.execute(stmt)
                await session.commit()
                
                # Log Event
                await self._log_event(session, board, "critical", "Device Offline", f"Device detected offline for {count} consecutive polling cycles.")
                
                # Send Telegram
                msg = (
                    f"🚨 *ROUTER DOWN (STRICT)*\n\n"
                    f"Nama: {board.board_name}\n"
                    f"Site: {board.site_group}\n"
                    f"Waktu: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
                    f"Status: Gagal terhubung > {self.MAX_FAILURE_COUNT} kali berturut-turut"
                )
                await telegram_service.send_alert(session, str(board.board_id), msg, "critical")
    
    async def _handle_recovery_event(self, session: AsyncSession, board: MikrotikBoard):
        board_id_str = str(board.board_id)
        
        # Reset failure count on success
        if board_id_str in self._failure_counts:
            logger.info(f"Board {board.board_name} recovered. Resetting failure count.")
            del self._failure_counts[board_id_str]

        # If DB says Offline, but now Online -> Recovery
        is_online_flag = bool(getattr(board, "is_online", False))
        if not is_online_flag:
            logger.info(f"Board {board.board_name} RECOVERED.")
            
            # Update DB
            stmt = update(MikrotikBoard).where(MikrotikBoard.board_id == board.board_id).values(is_online=True)
            await session.execute(stmt)
            await session.commit()
            
            # Log Event
            await self._log_event(session, board, "info", "Device Recovered", "Connection restored")
            
            # Send Telegram
            msg = (
                f"✅ *ROUTER RECOVERED*\n\n"
                f"Nama: {board.board_name}\n"
                f"Site: {board.site_group}\n"
                f"Waktu: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
                f"Status: Online"
            )
            await telegram_service.send_alert(session, str(board.board_id), msg, "info")

    async def _trigger_alert(self, session: AsyncSession, board: MikrotikBoard, level: str, message: str):
        # Helper for generic alerts
        await telegram_service.send_alert(session, str(board.board_id), message, level)

    async def _log_event(self, session: AsyncSession, board: MikrotikBoard, level: str, name: str, detail: str):
        event = BoardEvent(
            board_id=board.board_id,
            event_category="system",
            event_level=level,
            event_name=name,
            event_detail=detail
        )
        session.add(event)
        await session.commit()

alert_manager = AlertManager()
