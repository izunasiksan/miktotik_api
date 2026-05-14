import os
import aiofiles
import asyncssh
import asyncio
from datetime import datetime
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.mikrotik import MikrotikBoard, BoardBackup
from app.core.config import settings
from app.core.encryption import decrypt_password

class BackupService:
    async def create_backup(self, db: AsyncSession, board_id: UUID, file_name: str) -> BoardBackup:
        # 1. Get Board Info & Credentials
        stmt = select(MikrotikBoard).where(MikrotikBoard.board_id == board_id)
        result = await db.execute(stmt)
        board = result.scalar_one_or_none()
        
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
            
        # Ensure credentials are loaded (lazy loading might require explicit join or attribute access)
        # Using await to trigger lazy load if configured async, or rely on relationship being available if eager loaded
        # Since we use AsyncSession, we might need to query credentials separately if not joined.
        # But MikrotikBoard model has `credentials` relationship.
        # For safety in async, let's explicit join or fetch.
        await db.refresh(board, attribute_names=['credentials'])
        
        if not board.credentials:
             raise HTTPException(status_code=400, detail="Board credentials not found")

        enc_val = getattr(board.credentials, "password_mikrotik_encrypted", None)
        decrypted_password = decrypt_password(str(enc_val) if enc_val is not None else "")
        
        # Local storage setup
        backup_dir = "backups"
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, lambda: os.makedirs(backup_dir, exist_ok=True))
        
        local_filename = f"{file_name}.backup"
        local_file_path = os.path.join(backup_dir, local_filename)
        
        try:
            async with asyncssh.connect(
                board.ip_address, 
                port=board.port_ssh, 
                username=board.credentials.username_mikrotik, 
                password=decrypted_password,
                known_hosts=None, # Skip host key verification for internal usage/simplicity
                connect_timeout=10
            ) as conn:
                
                # 2. Trigger Backup on Mikrotik
                # Using .backup extension as standard Mikrotik backup
                # Command: /system backup save name={file_name}
                # Note: Mikrotik automatically appends .backup if not present, but we should be explicit
                remote_filename = f"{file_name}.backup"
                
                # Run backup command
                # Timeout 60s for backup creation
                result = await conn.run(f'/system/backup/save name="{file_name}"', check=True, timeout=60)
                
                # 3. Download via SFTP
                async with conn.start_sftp_client() as sftp:
                    await sftp.get(remote_filename, local_file_path)
                    
                    # 4. Cleanup on Mikrotik
                    await conn.run(f'/file/remove "{remote_filename}"', timeout=10)
                    
                # Get Router Identity/Model if possible
                identity_res = await conn.run('/system/identity/print', timeout=5)
                router_name = board.board_name # Default
                # Parse identity if needed, but we have board_name
                
                # Get Router Model
                resource_res = await conn.run('/system/resource/print', timeout=5)
                router_model = "Unknown"
                if resource_res.stdout:
                    # Ensure stdout is string before splitting
                    stdout_str: str = str(resource_res.stdout)
                    for line in stdout_str.split('\n'):
                        if "board-name" in line:
                            router_model = line.split(":")[-1].strip()

        except asyncssh.PermissionDenied:
             raise HTTPException(status_code=403, detail="SSH Permission Denied. Check username/password.")
        except asyncssh.TimeoutError:
             raise HTTPException(status_code=504, detail="SSH Connection/Command Timeout.")
        except (OSError, asyncssh.Error) as e:
            raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

        # 5. Save to Database
        backup = BoardBackup(
            board_id=board_id,
            file_name=file_name,
            router_name=router_name,
            router_model=router_model,
            file_location=local_file_path,
            status="success",
            log_date=datetime.now()
        )
        db.add(backup)
        await db.commit()
        await db.refresh(backup)
        return backup

    async def get_backups(self, db: AsyncSession, board_id: UUID, skip: int = 0, limit: int = 100):
        stmt = (
            select(BoardBackup)
            .where(BoardBackup.board_id == board_id)
            .order_by(BoardBackup.log_date.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def restore_backup(self, db: AsyncSession, backup_id: UUID):
        # 1. Get Backup Info
        backup = await db.get(BoardBackup, backup_id)
        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")
            
        board = await db.get(MikrotikBoard, backup.board_id)
        if not board:
             raise HTTPException(status_code=404, detail="Board not found")
             
        await db.refresh(board, attribute_names=['credentials'])
        if not board.credentials:
             raise HTTPException(status_code=400, detail="Board credentials not found")
             
        enc_val = getattr(board.credentials, "password_mikrotik_encrypted", None)
        decrypted_password = decrypt_password(str(enc_val) if enc_val is not None else "")
        
        file_location_val = getattr(backup, "file_location", None)
        file_location_str = str(file_location_val) if file_location_val is not None else ""
        if not os.path.exists(file_location_str):
            raise HTTPException(status_code=404, detail="Backup file not found on server")

        try:
            async with asyncssh.connect(
                board.ip_address, 
                port=board.port_ssh, 
                username=board.credentials.username_mikrotik, 
                password=decrypted_password,
                known_hosts=None
            ) as conn:
                
                remote_filename = os.path.basename(file_location_str)
                
                # 2. Upload file to Mikrotik via SFTP
                async with conn.start_sftp_client() as sftp:
                    await sftp.put(file_location_str, remote_filename)
                
                # 3. Trigger Restore command
                # This will likely reboot the router and close the connection
                # So we might not get a clean exit/response
                try:
                    await conn.run(f'/system/backup/load name="{remote_filename}" password=""', timeout=10)
                except (asyncssh.TimeoutError, asyncssh.ConnectionLost, OSError):
                    # Expected behavior as router reboots
                    pass
                
        except (OSError, asyncssh.Error) as e:
            # If it's just connection lost during restore, it might be success
            if "Connection lost" not in str(e):
                 raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")
        
        return {"message": f"Restore initiated for {backup.file_name}. Router is rebooting."}

backup_service = BackupService()
