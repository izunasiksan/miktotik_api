import httpx
import asyncio
import logging
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.mikrotik import TelegramRecipient, TelegramBot

# Setup logging
logger = logging.getLogger("telegram_service")

class TelegramService:
    def __init__(self):
        # Kita tidak lagi set base_url statis dari settings
        # Token akan diambil dinamis dari parameter atau database
        self.client = httpx.AsyncClient(timeout=10.0)

    async def get_active_bot(self, session: AsyncSession) -> Optional[TelegramBot]:
        """Mengambil bot aktif pertama dari database."""
        stmt = select(TelegramBot).where(TelegramBot.is_active == True).limit(1)
        result = await session.execute(stmt)
        return result.scalars().first()

    async def send_message(self, chat_id: int, text: str, token: str | None = None, parse_mode: str = "Markdown") -> bool:
        """
        Mengirim pesan ke satu chat_id.
        Membutuhkan token. Jika tidak ada token, akan mencoba fallback ke settings (deprecated).
        """
        if not token:
            token = str(getattr(settings, "TELEGRAM_BOT_TOKEN", "")) or None
        
        if not token:
            logger.warning("❌ [Telegram] No Token provided and no Settings fallback.")
            return False

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }

        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            logger.info(f"✅ [Telegram] Sent to {chat_id}: {text[:20]}...")
            return True
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ [Telegram] API Error: {e.response.status_code} - {e.response.text}")
            return False
        except Exception as e:
            logger.error(f"❌ [Telegram] Connection Error: {str(e)}")
            return False

    async def send_alert(self, session: AsyncSession, board_id: str, message: str, level: str = 'critical') -> int:
        """
        Mengirim alert ke semua penerima yang terdaftar untuk board_id tersebut.
        Mengambil token dari database secara otomatis.
        """
        # 1. Ambil Bot Token Aktif
        bot = await self.get_active_bot(session)
        if not bot:
            logger.warning("⚠️ [Telegram] No active bot found in database.")
            # Fallback ke settings jika ada
            token_value = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
            token_str: Optional[str] = str(token_value) if token_value is not None else None
            if not token_str:
                return 0
        else:
            token_value = getattr(bot, "bot_token", None)
            token_str: Optional[str] = str(token_value) if token_value is not None else None

        # 2. Cari penerima yang relevan
        # Logic: Select recipient where board_id matches
        stmt = select(TelegramRecipient).where(TelegramRecipient.board_id == board_id)
        result = await session.execute(stmt)
        recipients = result.scalars().all()
        
        sent_count = 0
        for recipient in recipients:
            # Cek level alert (manual filtering karena array di DB)
            # Asumsi alert_levels adalah list python
            levels = getattr(recipient, 'alert_levels', []) or []
            if levels and level in levels:
                chat_id_value = getattr(recipient, "chat_id", None)
                if chat_id_value is None:
                    continue
                chat_id_int = int(str(chat_id_value))
                success = await self.send_message(chat_id_int, message, token=token_str)
                if success:
                    sent_count += 1
                
                # Rate limit prevention
                await asyncio.sleep(0.05) 
                
        return sent_count

    async def close(self):
        await self.client.aclose()

# Singleton instance
telegram_service = TelegramService()
