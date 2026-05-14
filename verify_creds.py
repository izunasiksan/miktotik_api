
import asyncio
import sys
import os
from uuid import UUID

# Add project root to path
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.mikrotik import MikrotikBoard, BoardCredential
import app.models.user # Import to register UserBoardAccess relationship
from app.core.encryption import decrypt_password
from sqlalchemy import select
import routeros_api

async def verify_db_creds(board_id_str):
    print(f"Verifying credentials for board: {board_id_str}")
    
    async with SessionLocal() as db:
        board_id = UUID(board_id_str)
        
        # Fetch Board
        board = await db.get(MikrotikBoard, board_id)
        if not board:
            print("Board not found in DB")
            return
            
        print(f"Board: {board.board_name} (IP: {board.ip_address}, Port: {board.port_api})")
        
        # Fetch Credentials
        stmt = select(BoardCredential).where(BoardCredential.board_id == board_id)
        result = await db.execute(stmt)
        cred = result.scalars().first()
        
        if not cred:
            print("Credentials not found in DB")
            return
            
        password = decrypt_password(str(cred.password_mikrotik_encrypted))
        print(f"Credentials - Username: {cred.username_mikrotik}, Password: {password}")
        
        print("\nAttempting connection with these credentials...")
        try:
            pool = routeros_api.RouterOsApiPool(
                str(board.ip_address), 
                username=str(cred.username_mikrotik), 
                password=password, 
                port=board.port_api or 8728, 
                plaintext_login=True,
                use_ssl=bool(board.port_api == 8729)
            )
            api = pool.get_api()
            
            print(f"✅ Connection successful! Fetching interfaces...")
            interfaces = api.get_resource("/interface").get()
            print(f"Successfully fetched {len(interfaces)} interfaces.")
            
            pool.disconnect()
            print("Disconnected.")
            
        except Exception as e:
            print(f"❌ Connection failed: {str(e)}")

if __name__ == "__main__":
    target_id = "f63d3b50-aa21-4c6a-9adc-42f77dbc40ea"
    asyncio.run(verify_db_creds(target_id))
