from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any, Optional
from uuid import UUID
import json

from app.core.database import get_db
from app.api import deps
from app.models.user import MasterUser
from app.models.mikrotik import MikrotikBoard, BoardCredential, BoardResourceStat, VPNProfile, BoardEvent
from app.schemas.mikrotik import BoardCreate, BoardResponse, BoardUpdate, ResourceStatResponse, VPNProfileCreate, VPNProfileUpdate, VPNProfileResponse, EventResponse
from app.core.encryption import encrypt_password, decrypt_password
from app.services.audit_service import AuditService
from app.db.redis import redis_client

router = APIRouter()

@router.get("/", response_model=List[BoardResponse])
async def read_boards(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve all Mikrotik boards.
    """
    cache_key = f"boards:list:{skip}:{limit}"
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis error in read_boards (get): {e}")

    result = await db.execute(select(MikrotikBoard).offset(skip).limit(limit))
    boards = result.scalars().all()
    
    # Cache for 60 seconds
    try:
        data = jsonable_encoder(boards)
        await redis_client.setex(cache_key, 60, json.dumps(data))
    except Exception as e:
        print(f"Redis error in read_boards (set): {e}")
    
    return boards

@router.post("/", response_model=BoardResponse)
async def create_board(
    board_in: BoardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create a new Mikrotik board.
    """
    # 1. Create Board
    board = MikrotikBoard(
        board_name=board_in.board_name,
        mikrotik_identity=board_in.mikrotik_identity,
        site_group=board_in.site_group,
        mac_address=board_in.mac_address,
        ip_address=str(board_in.ip_address),
        port_api=board_in.port_api,
        port_ssh=board_in.port_ssh,
        is_monitor=board_in.is_monitor,
        is_maintenance=board_in.is_maintenance,
    )
    db.add(board)
    await db.commit()
    await db.refresh(board)
    
    # 2. Create Credentials
    # Encrypt password using AES
    encrypted_pass = encrypt_password(board_in.password)
    
    credential = BoardCredential(
        board_id=board.board_id,
        username_mikrotik=board_in.username,
        password_mikrotik_encrypted=encrypted_pass
    )
    db.add(credential)
    await db.commit()
    
    import asyncio
    asyncio.create_task(AuditService.log_activity(
        user_id=current_user.user_id,
        action="CREATE_BOARD",
        target_resource=f"Board: {board.board_name} ({board.ip_address})",
        details=board_in.model_dump(),
        status="SUCCESS"
    ))
    
    return board

@router.get("/{board_id}/debug-auth")
async def debug_auth_board(
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Debug authentication for a board.
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        return {"status": "error", "detail": "Board not found"}
        
    stmt = select(BoardCredential).where(BoardCredential.board_id == board_id)
    result = await db.execute(stmt)
    cred = result.scalars().first()
    
    if not cred:
        return {"status": "error", "detail": "Credentials not found"}
        
    from app.core.config import settings
    password = decrypt_password(str(cred.password_mikrotik_encrypted))
    
    auth_info = {
        "ip": str(board.ip_address),
        "port": board.port_api,
        "username": cred.username_mikrotik,
        "password_len": len(password),
        "password_preview": password[:2] + "***" if password else "EMPTY",
        "key_preview": settings.AES_SECRET_KEY[:4] + "***" if settings.AES_SECRET_KEY else "NONE"
    }
    
    try:
        import routeros_api
        def test_conn():
            pool = routeros_api.RouterOsApiPool(
                str(board.ip_address), 
                username=str(cred.username_mikrotik), 
                password=password, 
                port=board.port_api or 8728, 
                plaintext_login=True,
                use_ssl=bool(board.port_api == 8729)
            )
            api = pool.get_api()
            res = api.get_resource("/interface").get()
            pool.disconnect()
            return len(res)

        import asyncio
        loop = asyncio.get_running_loop()
        count = await loop.run_in_executor(None, test_conn)
        
        return {
            "status": "success",
            "auth_info": auth_info,
            "interfaces_count": count
        }
    except Exception as e:
        return {
            "status": "failed",
            "auth_info": auth_info,
            "error": str(e)
        }

@router.get("/{board_id}/", response_model=BoardResponse)
async def read_board(
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific board by ID.
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board

@router.put("/{board_id}/", response_model=BoardResponse)
async def update_board(
    board_id: UUID,
    board_in: BoardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a board.
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    update_data = board_in.model_dump(exclude_unset=True)
    if update_data:
        # If IP address is updated, convert to string
        if 'ip_address' in update_data and update_data['ip_address']:
            update_data['ip_address'] = str(update_data['ip_address'])
            
        stmt = update(MikrotikBoard).where(MikrotikBoard.board_id == board_id).values(**update_data)
        await db.execute(stmt)
        await db.commit()
        await db.refresh(board)
        
        import asyncio
        asyncio.create_task(AuditService.log_activity(
            user_id=current_user.user_id,
            action="UPDATE_BOARD",
            target_resource=f"Board: {board.board_name} ({board.ip_address})",
            details=update_data,
            status="SUCCESS"
        ))
        
    return board

@router.post("/{board_id}/ping/")
async def ping_board(
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Trigger a real ping check for a board.
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
        
    import subprocess
    import platform
    
    host = str(board.ip_address)
    # Determine ping command based on OS
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', '-w', '2000', host] # 2s timeout
    
    try:
        # Run ping command
        # Note: In production, consider using a more robust ICMP library or async ping
        # For now, subprocess is safer than simulation
        process = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        is_online = (process.returncode == 0)
        
        latency = None
        if is_online:
            # Extract latency from output (simple parsing for Windows/Linux)
            import re
            if platform.system().lower() == 'windows':
                match = re.search(r"time[=<](\d+)ms", process.stdout)
            else:
                match = re.search(r"time=(\d+\.?\d*)", process.stdout)
            
            if match:
                latency = float(match.group(1))
        
        # Update board status in DB
        stmt = update(MikrotikBoard).where(MikrotikBoard.board_id == board_id).values(
            is_online=is_online,
            last_ping_at=func.now()
        )
        await db.execute(stmt)
        await db.commit()
        
        return {
            "message": "Ping check completed", 
            "is_online": is_online, 
            "latency": latency,
            "details": process.stdout if not is_online else "OK"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ping operation failed: {str(e)}")

@router.delete("/{board_id}/")
async def delete_board(
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete a board.
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
        
    board_details = f"Board: {board.board_name} ({board.ip_address})"
    
    # Delete associated credentials
    await db.execute(delete(BoardCredential).where(BoardCredential.board_id == board_id))
    
    await db.delete(board)
    await db.commit()
    
    import asyncio
    asyncio.create_task(AuditService.log_activity(
        user_id=current_user.user_id,
        action="DELETE_BOARD",
        target_resource=board_details,
        status="SUCCESS"
    ))
    
    return {"message": "Board deleted successfully"}

@router.get("/{board_id}/stats/", response_model=List[ResourceStatResponse])
async def read_board_stats(
    board_id: UUID,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get recent resource stats for a board.
    """
    cache_key = f"boards:stats:{board_id}:{limit}"
    cached_data = await redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    stmt = (
        select(BoardResourceStat)
        .where(BoardResourceStat.board_id == board_id)
        .order_by(BoardResourceStat.log_time.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    stats = result.scalars().all()
    
    # Cache for 60 seconds (aligned with polling intervals, though frontend might poll faster)
    data = jsonable_encoder(stats)
    await redis_client.setex(cache_key, 60, json.dumps(data))
    
    return stats

@router.post("/{board_id}/vpn/", response_model=VPNProfileResponse)
async def create_vpn_profile(
    board_id: UUID,
    vpn_in: VPNProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create a new VPN profile for a board.
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
        
    # Encrypt password if provided
    encrypted_pass = None
    if vpn_in.vpn_password:
        encrypted_pass = encrypt_password(vpn_in.vpn_password)

    vpn = VPNProfile(
        board_id=board_id,
        vpn_type=vpn_in.vpn_type,
        vpn_api=vpn_in.vpn_api,
        vpn_username=vpn_in.vpn_username,
        vpn_password_encrypted=encrypted_pass,
        vpn_ssh=vpn_in.vpn_ssh,
        vpn_ftp=vpn_in.vpn_ftp,
        vpn_winbox=vpn_in.vpn_winbox
    )
    db.add(vpn)
    await db.commit()
    await db.refresh(vpn)
    
    await AuditService.log_activity(
        user_id=current_user.user_id,
        action="CREATE_VPN",
        target_resource=f"VPN: {vpn.vpn_username} on Board {board.board_name}",
        details=vpn_in.model_dump(),
        status="SUCCESS"
    )
    
    return vpn

@router.get("/{board_id}/vpn/", response_model=List[VPNProfileResponse])
async def read_vpn_profiles(
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Get all VPN profiles for a board.
    """
    stmt = select(VPNProfile).where(VPNProfile.board_id == board_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/{board_id}/vpn/{vpn_id}/", response_model=VPNProfileResponse)
async def update_vpn_profile(
    board_id: UUID,
    vpn_id: int,
    vpn_in: VPNProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a VPN profile.
    """
    vpn = await db.get(VPNProfile, vpn_id)
    if not vpn:
        raise HTTPException(status_code=404, detail="VPN profile not found")
    if str(vpn.board_id) != str(board_id):
         raise HTTPException(status_code=400, detail="VPN profile does not belong to this board")
         
    update_data = vpn_in.model_dump(exclude_unset=True)
    
    # Handle password encryption if updated
    if 'vpn_password' in update_data:
        if update_data['vpn_password']:
            update_data['vpn_password_encrypted'] = encrypt_password(update_data['vpn_password'])
        del update_data['vpn_password']

    for field in update_data:
        setattr(vpn, field, update_data[field])
        
    db.add(vpn)
    await db.commit()
    await db.refresh(vpn)
    
    await AuditService.log_activity(
        user_id=current_user.user_id,
        action="UPDATE_VPN",
        target_resource=f"VPN: {vpn.vpn_username} on Board {board_id}",
        details=vpn_in.model_dump(exclude={"vpn_password"}),
        status="SUCCESS"
    )
    
    return vpn

@router.delete("/{board_id}/vpn/{vpn_id}/")
async def delete_vpn_profile(
    board_id: UUID,
    vpn_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete a VPN profile.
    """
    vpn = await db.get(VPNProfile, vpn_id)
    if not vpn:
        raise HTTPException(status_code=404, detail="VPN profile not found")
    if str(vpn.board_id) != str(board_id):
         raise HTTPException(status_code=400, detail="VPN profile does not belong to this board")
    
    vpn_details = f"VPN: {vpn.vpn_username} on Board {board_id}"
    
    await db.delete(vpn)
    await db.commit()
    
    await AuditService.log_activity(
        user_id=current_user.user_id,
        action="DELETE_VPN",
        target_resource=vpn_details,
        status="SUCCESS"
    )
    
    return {"message": "VPN profile deleted successfully"}

@router.get("/{board_id}/events/", response_model=List[EventResponse])
async def read_board_events(
    board_id: UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Get recent events for a board.
    """
    stmt = (
        select(BoardEvent)
        .where(BoardEvent.board_id == board_id)
        .order_by(BoardEvent.log_time.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{board_id}/interfaces/")
async def read_board_interfaces(
    board_id: UUID,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    interface_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Get interfaces for a board.
    Fetches real-time data from Mikrotik router via RouterOS API.
    Supports pagination to handle large number of interfaces (e.g., VLANs).
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    # Fetch credentials
    stmt = select(BoardCredential).where(BoardCredential.board_id == board_id)
    result = await db.execute(stmt)
    cred = result.scalars().first()

    if not cred:
        raise HTTPException(status_code=400, detail="Board credentials not found")

    try:
        # Decrypt password
        password = decrypt_password(str(cred.password_mikrotik_encrypted))
        
        # Connect to Mikrotik
        import routeros_api

        def fetch_interfaces_sync():
            # Use a timeout for connection to avoid hanging threads
            pool = routeros_api.RouterOsApiPool(
                str(board.ip_address), 
                username=str(cred.username_mikrotik), 
                password=password, 
                port=board.port_api or 8728, 
                plaintext_login=True,
                use_ssl=bool(board.port_api == 8729)
            )
            api = pool.get_api()
            try:
                # Get interfaces
                # Optimization: We fetch all, then slice. 
                # RouterOS API 'get' fetches all. 'print' with 'from/count' is not directly exposed in simple wrapper.
                # Ideally, we should use 'print' command with arguments if library supported it easily.
                # For now, we rely on Python-side slicing which is fast enough for < 1000 items.
                interfaces = api.get_resource("/interface").get()
                
                # Filter in Python (Server-Side Filtering)
                filtered_interfaces = interfaces
                
                if search:
                    search_lower = search.lower()
                    filtered_interfaces = [
                        i for i in filtered_interfaces 
                        if search_lower in i.get('name', '').lower()
                    ]
                
                if interface_type and interface_type != 'all':
                    # Map frontend filter types to Mikrotik types if needed
                    # 'ether' -> 'ether'
                    # 'vlan' -> 'vlan'
                    # 'bridge' -> 'bridge'
                    # 'pppoe' -> 'pppoe-in' or 'pppoe-out'
                    target_type = interface_type
                    if interface_type == 'pppoe':
                         filtered_interfaces = [
                            i for i in filtered_interfaces 
                            if 'pppoe' in i.get('type', '')
                        ]
                    else:
                        filtered_interfaces = [
                            i for i in filtered_interfaces 
                            if i.get('type') == target_type
                        ]

                # Sort by name for consistent pagination
                filtered_interfaces.sort(key=lambda x: x.get('name', ''))
                
                processed = []
                # Apply slicing here on the FILTERED list
                paginated_interfaces = filtered_interfaces[skip : skip + limit]
                
                for iface in paginated_interfaces:
                    processed.append({
                        "interface_name": iface.get("name"),
                        "interface_type": iface.get("type"),
                        "mac_address": iface.get("mac-address"),
                        "status": "running" if iface.get("running") == "true" else "down",
                        "disabled": iface.get("disabled") == "true",
                        "comment": iface.get("comment", ""),
                        "rx_byte": int(iface.get("rx-byte", 0)),
                        "tx_byte": int(iface.get("tx-byte", 0)),
                        "last_link_up_time": iface.get("last-link-up-time"),
                    })
                
                return {
                    "data": processed,
                    "total": len(filtered_interfaces),
                    "skip": skip,
                    "limit": limit
                }
            finally:
                pool.disconnect()

        import asyncio
        loop = asyncio.get_running_loop()
        # Run sync Mikrotik call in thread pool
        result = await loop.run_in_executor(None, fetch_interfaces_sync)
        return result

    except Exception as e:
        # Check for specific authentication error
        error_msg = str(e)
        if "invalid user name or password" in error_msg.lower():
             raise HTTPException(
                 status_code=503, 
                 detail=f"Router Authentication Failed: Invalid username or password for {board.ip_address}. Please update credentials in Board Settings."
             )
        
        raise HTTPException(status_code=503, detail=f"Failed to fetch interfaces: {error_msg}")

@router.get("/{board_id}/interfaces/{interface_name}/monitor")
async def monitor_interface_traffic(
    board_id: UUID,
    interface_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Get live traffic data for an interface.
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    stmt = select(BoardCredential).where(BoardCredential.board_id == board_id)
    result = await db.execute(stmt)
    cred = result.scalars().first()

    if not cred:
        raise HTTPException(status_code=400, detail="Board credentials not found")

    try:
        password = decrypt_password(str(cred.password_mikrotik_encrypted))
        
        import routeros_api

        def fetch_traffic_sync():
            pool = routeros_api.RouterOsApiPool(
                str(board.ip_address), 
                username=str(cred.username_mikrotik), 
                password=password, 
                port=board.port_api or 8728, 
                plaintext_login=True,
                use_ssl=bool(board.port_api == 8729)
            )
            api = pool.get_api()
            try:
                # Get interface traffic
                traffic = api.get_resource("/interface/monitor-traffic")
                traffic_data = traffic.call("monitor", {
                    "interface": interface_name,
                    "once": "true"
                })
                return traffic_data[0] if traffic_data else {}
            finally:
                pool.disconnect()

        import asyncio
        loop = asyncio.get_running_loop()
        traffic_data = await loop.run_in_executor(None, fetch_traffic_sync)
        
        # Parse data to be frontend-friendly
        return {
            "interface": interface_name,
            "rx_bps": int(traffic_data.get("rx-bits-per-second", 0)),
            "tx_bps": int(traffic_data.get("tx-bits-per-second", 0)),
            # These might not be available in monitor-traffic, checking standard output
            # If not available, we return 0 or what's available
            "rx_packets_ps": int(traffic_data.get("rx-packets-per-second", 0)),
            "tx_packets_ps": int(traffic_data.get("tx-packets-per-second", 0)),
            "timestamp": func.now()
        }

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to fetch traffic data: {str(e)}")

@router.post("/{board_id}/interfaces/{interface_name}/toggle")
async def toggle_interface_status(
    board_id: UUID,
    interface_name: str,
    action_data: dict, # Expect {"action": "enable" | "disable"}
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Enable or Disable an interface.
    """
    action = action_data.get("action")
    if action not in ["enable", "disable"]:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'enable' or 'disable'.")

    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    stmt = select(BoardCredential).where(BoardCredential.board_id == board_id)
    result = await db.execute(stmt)
    cred = result.scalars().first()

    if not cred:
        raise HTTPException(status_code=400, detail="Board credentials not found")

    try:
        password = decrypt_password(str(cred.password_mikrotik_encrypted))
        
        import routeros_api
        
        def toggle_sync():
            pool = routeros_api.RouterOsApiPool(
                str(board.ip_address), 
                username=str(cred.username_mikrotik), 
                password=password, 
                port=board.port_api or 8728, 
                plaintext_login=True,
                use_ssl=bool(board.port_api == 8729)
            )
            api = pool.get_api()
            try:
                # Find the interface ID first (safer than using name directly in some contexts, but name works for most)
                # Here we use the command on /interface
                
                # Method 1: direct call on resource
                # api.get_resource('/interface').set(id=interface_name, disabled='yes' if action == 'disable' else 'no')
                
                # Method 2: specific command
                if action == 'enable':
                    api.get_resource('/interface').call('enable', {'numbers': interface_name})
                else:
                    api.get_resource('/interface').call('disable', {'numbers': interface_name})
                    
                return True
            finally:
                pool.disconnect()

        import asyncio
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, toggle_sync)
        
        return {"status": "success", "message": f"Interface {interface_name} {action}d successfully"}

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to toggle interface: {str(e)}")

@router.get("/{board_id}/pppoe/")
async def read_board_pppoe(
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Get PPPoE users for a board (Live).
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    stmt = select(BoardCredential).where(BoardCredential.board_id == board_id)
    result = await db.execute(stmt)
    cred = result.scalars().first()

    if not cred:
        raise HTTPException(status_code=400, detail="Board credentials not found")

    try:
        password = decrypt_password(str(cred.password_mikrotik_encrypted))
        
        import routeros_api
        def fetch_pppoe_sync():
            pool = routeros_api.RouterOsApiPool(
                str(board.ip_address), 
                username=str(cred.username_mikrotik), 
                password=password, 
                port=board.port_api or 8728, 
                plaintext_login=True,
                use_ssl=bool(board.port_api == 8729)
            )
            api = pool.get_api()
            try:
                active_users = api.get_resource("/ppp/active").get()
                processed = []
                for user in active_users:
                    processed.append({
                        "name": user.get("name"),
                        "service": user.get("service"),
                        "caller_id": user.get("caller-id"),
                        "address": user.get("address"),
                        "uptime": user.get("uptime"),
                        "encoding": user.get("encoding"),
                        "session_id": user.get("session-id"),
                        "limit_bytes_in": user.get("limit-bytes-in"),
                        "limit_bytes_out": user.get("limit-bytes-out"),
                        "radius": user.get("radius") == "true",
                        "id": user.get(".id")
                    })
                return processed
            finally:
                pool.disconnect()

        import asyncio
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, fetch_pppoe_sync)

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to fetch live data: {str(e)}")

@router.delete("/{board_id}/pppoe/{username}/")
async def delete_board_pppoe(
    board_id: UUID,
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Disconnect a PPPoE user (Live).
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    stmt = select(BoardCredential).where(BoardCredential.board_id == board_id)
    result = await db.execute(stmt)
    cred = result.scalars().first()

    if not cred:
        raise HTTPException(status_code=400, detail="Board credentials not found")

    try:
        password = decrypt_password(str(cred.password_mikrotik_encrypted))
        
        import routeros_api
        def disconnect_pppoe_sync():
            pool = routeros_api.RouterOsApiPool(
                str(board.ip_address), 
                username=str(cred.username_mikrotik), 
                password=password, 
                port=board.port_api or 8728, 
                plaintext_login=True,
                use_ssl=bool(board.port_api == 8729)
            )
            api = pool.get_api()
            try:
                # Find the active connection by username
                active_users = api.get_resource("/ppp/active").get(name=username)
                if not active_users:
                    return {"message": "User not found or already disconnected"}
                
                # Remove all sessions for this user
                for user in active_users:
                    api.get_resource("/ppp/active").remove(id=user.get(".id"))
                
                return {"message": f"User {username} disconnected"}
            finally:
                pool.disconnect()

        import asyncio
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, disconnect_pppoe_sync)

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to disconnect user: {str(e)}")

@router.delete("/{board_id}/hotspot/{username}/")
async def delete_board_hotspot(
    board_id: UUID,
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Disconnect a Hotspot user (Live).
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    stmt = select(BoardCredential).where(BoardCredential.board_id == board_id)
    result = await db.execute(stmt)
    cred = result.scalars().first()

    if not cred:
        raise HTTPException(status_code=400, detail="Board credentials not found")

    try:
        password = decrypt_password(str(cred.password_mikrotik_encrypted))
        
        import routeros_api
        def disconnect_hotspot_sync():
            pool = routeros_api.RouterOsApiPool(
                str(board.ip_address), 
                username=str(cred.username_mikrotik), 
                password=password, 
                port=board.port_api or 8728, 
                plaintext_login=True,
                use_ssl=bool(board.port_api == 8729)
            )
            api = pool.get_api()
            try:
                # Find the active connection by username (user property in hotspot active)
                active_users = api.get_resource("/ip/hotspot/active").get(user=username)
                if not active_users:
                    return {"message": "User not found or already disconnected"}
                
                # Remove all sessions for this user
                for user in active_users:
                    api.get_resource("/ip/hotspot/active").remove(id=user.get(".id"))
                
                return {"message": f"User {username} disconnected"}
            finally:
                pool.disconnect()

        import asyncio
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, disconnect_hotspot_sync)

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to disconnect user: {str(e)}")

@router.get("/{board_id}/hotspot/")
async def read_board_hotspot(
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
) -> Any:
    """
    Get Hotspot users for a board (Live).
    """
    board = await db.get(MikrotikBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    stmt = select(BoardCredential).where(BoardCredential.board_id == board_id)
    result = await db.execute(stmt)
    cred = result.scalars().first()

    if not cred:
        raise HTTPException(status_code=400, detail="Board credentials not found")

    try:
        password = decrypt_password(str(cred.password_mikrotik_encrypted))
        
        import routeros_api
        def fetch_hotspot_sync():
            pool = routeros_api.RouterOsApiPool(
                str(board.ip_address), 
                username=str(cred.username_mikrotik), 
                password=password, 
                port=board.port_api or 8728, 
                plaintext_login=True,
                use_ssl=bool(board.port_api == 8729)
            )
            api = pool.get_api()
            try:
                active_users = api.get_resource("/ip/hotspot/active").get()
                processed = []
                for user in active_users:
                    processed.append({
                        "user": user.get("user"),
                        "address": user.get("address"),
                        "mac_address": user.get("mac-address"),
                        "uptime": user.get("uptime"),
                        "bytes_in": int(user.get("bytes-in", 0)),
                        "bytes_out": int(user.get("bytes-out", 0)),
                        "login_by": user.get("login-by"),
                        "server": user.get("server"),
                        "id": user.get(".id")
                    })
                return processed
            finally:
                pool.disconnect()

        import asyncio
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, fetch_hotspot_sync)

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to fetch live data: {str(e)}")
