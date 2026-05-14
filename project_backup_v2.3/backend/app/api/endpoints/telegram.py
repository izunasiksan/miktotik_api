from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.api import deps
from app.core.database import get_db
from app.models.mikrotik import TelegramBot, TelegramRecipient
from app.schemas.mikrotik import (
    TelegramBotCreate,
    TelegramBotUpdate,
    TelegramBotResponse,
    TelegramRecipientCreate,
    TelegramRecipientUpdate,
    TelegramRecipientResponse,
)
from app.models.user import MasterUser

router = APIRouter()

# --- BOTS ENDPOINTS ---

@router.get("/bots/", response_model=List[TelegramBotResponse])
async def read_bots(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve all Telegram Bots.
    """
    stmt = select(TelegramBot).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/bots/", response_model=TelegramBotResponse)
async def create_bot(
    bot_in: TelegramBotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create a new Telegram Bot.
    """
    bot = TelegramBot(**bot_in.model_dump())
    db.add(bot)
    await db.commit()
    await db.refresh(bot)
    return bot

@router.put("/bots/{bot_id}/", response_model=TelegramBotResponse)
async def update_bot(
    bot_id: int,
    bot_in: TelegramBotUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a Telegram Bot.
    """
    bot = await db.get(TelegramBot, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    update_data = bot_in.model_dump(exclude_unset=True)
    if update_data:
        for field, value in update_data.items():
            setattr(bot, field, value)
        
        await db.commit()
        await db.refresh(bot)
    return bot

@router.delete("/bots/{bot_id}/")
async def delete_bot(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete a Telegram Bot.
    """
    bot = await db.get(TelegramBot, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    await db.delete(bot)
    await db.commit()
    return {"message": "Bot deleted successfully"}

# --- RECIPIENTS ENDPOINTS ---

@router.get("/recipients/", response_model=List[TelegramRecipientResponse])
async def read_recipients(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve all Telegram Recipients.
    """
    stmt = select(TelegramRecipient).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/recipients/", response_model=TelegramRecipientResponse)
async def create_recipient(
    recipient_in: TelegramRecipientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create a new Telegram Recipient.
    """
    # Check if bot exists
    bot = await db.get(TelegramBot, recipient_in.bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    recipient = TelegramRecipient(**recipient_in.model_dump())
    db.add(recipient)
    await db.commit()
    await db.refresh(recipient)
    return recipient

@router.put("/recipients/{recipient_id}/", response_model=TelegramRecipientResponse)
async def update_recipient(
    recipient_id: int,
    recipient_in: TelegramRecipientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a Telegram Recipient.
    """
    recipient = await db.get(TelegramRecipient, recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    update_data = recipient_in.model_dump(exclude_unset=True)
    if update_data:
        for field, value in update_data.items():
            setattr(recipient, field, value)
            
        await db.commit()
        await db.refresh(recipient)
    return recipient

@router.delete("/recipients/{recipient_id}/")
async def delete_recipient(
    recipient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete a Telegram Recipient.
    """
    recipient = await db.get(TelegramRecipient, recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    await db.delete(recipient)
    await db.commit()
    return {"message": "Recipient deleted successfully"}
