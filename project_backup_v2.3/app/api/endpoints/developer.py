from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.api import deps
from app.core.database import get_db
from app.models.user import MasterUser
import os
import asyncio
import aiofiles

router = APIRouter()

# WebSocket Manager for Logs
class LogConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = LogConnectionManager()

async def get_log_file_path():
    log_paths = [
        "app.log",
        "logs/app.log",
        "/var/log/mikrotik-api/app.log",
        "e:/mikrotik_api/app.log"
    ]
    loop = asyncio.get_running_loop()
    for path in log_paths:
        # Use run_in_executor for blocking OS calls
        exists = await loop.run_in_executor(None, os.path.exists, path)
        if exists:
            is_file = await loop.run_in_executor(None, os.path.isfile, path)
            if is_file:
                return path
    return None

@router.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """
    Stream server logs via WebSocket.
    """
    # Note: Authentication in WebSocket is tricky. Usually done via query param token or cookie.
    # For simplicity in this dev tool, we might skip strict auth or implement basic token check.
    # In production, use `deps.get_current_active_superuser` equivalent for WS.
    
    await manager.connect(websocket)
    try:
        log_path = await get_log_file_path()
        if not log_path:
            await websocket.send_text("Log file not found.")
            return

        async with aiofiles.open(log_path, mode='r') as f:
            # Read last 20 lines initially
            content = await f.read()
            lines = content.splitlines()
            for line in lines[-20:]:
                await websocket.send_text(line)
            
            # Tail the file
            while True:
                line = await f.readline()
                if line:
                    await websocket.send_text(line.strip())
                else:
                    await asyncio.sleep(0.5) # Wait for new content
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        import logging
        logger = logging.getLogger("developer_endpoint")
        logger.error(f"WebSocket Error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass

@router.get("/metrics/", response_model=dict)
async def get_prometheus_metrics(
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Proxy to get raw Prometheus metrics text.
    """
    # Internal call to the exposed /metrics endpoint or manual scrape
    # Since /metrics is exposed by Instrumentator on the app, we can fetch it via HTTP client or expose raw data if possible.
    # However, Instrumentator usually hooks into ASGI.
    # Let's try to return a simple status or instructions, or fetch from localhost:8000/metrics if running.
    
    # Better approach: Just return the URL where metrics are available, or try to read them.
    # For now, we return a message pointing to the real endpoint.
    return {
        "metrics_url": "/metrics",
        "status": "active",
        "message": "Prometheus metrics are exposed at /metrics endpoint."
    }

@router.get("/logs/", response_model=dict)
async def get_system_logs(
    lines: int = 100,
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve system logs from the server.
    """
    # Attempt to find log file in common locations
    log_paths = [
        "app.log",
        "logs/app.log",
        "/var/log/mikrotik-api/app.log",
        "e:/mikrotik_api/app.log"
    ]
    
    found_log = None
    for path in log_paths:
        if os.path.exists(path) and os.path.isfile(path):
            found_log = path
            break
            
    if not found_log:
        return {
            "status": "warning", 
            "message": "Log file not found. Ensure application is configured to write to a file.",
            "logs": []
        }
        
    try:
        async with aiofiles.open(found_log, mode="r", encoding="utf-8", errors="ignore") as f:
            # Read all lines and take the last N
            content = await f.read()
            all_lines = content.splitlines()
            last_lines = all_lines[-lines:]
            return {
                "status": "success",
                "path": found_log,
                "logs": [line.strip() for line in last_lines]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read log file: {str(e)}")

@router.post("/sql/", response_model=dict)
async def execute_raw_sql(
    query: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Execute raw SQL query. SUPERUSER ONLY.
    """
    # Basic safety check (though superuser should be trusted, we prevent accidental destruction if possible)
    # In a real "God Mode", we might allow everything, but let's be slightly cautious or just warn in UI.
    
    try:
        result = await db.execute(text(query))
        
        # If it's a SELECT query, return rows
        if query.strip().upper().startswith("SELECT"):
            keys = result.keys()
            rows = result.fetchall()
            return {
                "status": "success",
                "columns": list(keys),
                "rows": [dict(zip(keys, row)) for row in rows],
                "affected_rows": len(rows)
            }
        else:
            # For UPDATE/DELETE/INSERT, commit might be needed depending on session config
            await db.commit()
            return {
                "status": "success",
                "message": "Query executed successfully",
                "affected_rows": getattr(result, 'rowcount', -1)
            }
    except Exception as e:
        await db.rollback()
        return {
            "status": "error",
            "message": str(e)
        }
