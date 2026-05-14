import asyncio
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.mikrotik import MikrotikBoard, BoardCredential, BoardEvent
from app.models.automation import AutomationJob, AutomationLog, ZTPQueue
from app.core.encryption import encrypt_password, decrypt_password
from datetime import datetime
import asyncssh
import logging

logger = logging.getLogger("automation_service")

class AutomationService:
    async def _execute_ssh_command(self, host, port, username, password, command):
        """
        Execute a command via SSH (Async).
        """
        try:
            async with asyncssh.connect(
                host, 
                port=port, 
                username=username, 
                password=password, 
                known_hosts=None, 
                client_keys=None,
                connect_timeout=10
            ) as conn:
                result = await conn.run(command, check=False)
                stdout_text = (result.stdout or "").strip()
                stderr_text = (result.stderr or "").strip() if result.exit_status != 0 else None
                return {
                    "status": "success" if result.exit_status == 0 else "failed",
                    "output": stdout_text,
                    "error": stderr_text
                }
        except (OSError, asyncssh.Error) as e:
            return {
                "status": "failed",
                "output": None,
                "error": str(e)
            }

    async def run_mass_config(
        self, 
        db: AsyncSession, 
        board_ids: List[UUID], 
        command: str, 
        description: str,
        user_id: UUID
    ) -> List[Dict[str, Any]]:
        """
        Phase 8: Mass Configuration (Batch Command Push)
        Uses AutomationJob table for tracking.
        """
        # Create Job
        job = AutomationJob(
            job_type='mass_config',
            payload={"command": command, "target_ids": [str(b) for b in board_ids]},
            description=description,
            status='running',
            created_by=user_id
        )
        db.add(job)
        await db.flush() # Get ID
        
        results = []
        
        # Validate Boards
        query = select(MikrotikBoard).where(MikrotikBoard.board_id.in_(board_ids))
        result = await db.execute(query)
        boards = result.scalars().all()
        
        for board in boards:
            log_entry = AutomationLog(
                job_id=job.job_id,
                board_id=board.board_id,
                status='pending'
            )
            db.add(log_entry)
            
            res = {
                "board_id": board.board_id,
                "board_name": board.board_name,
                "status": "pending",
                "output": None,
                "error": None
            }
            
            try:
                # Credential check
                cred_query = select(BoardCredential).where(BoardCredential.board_id == board.board_id)
                cred_res = await db.execute(cred_query)
                cred = cred_res.scalar_one_or_none()
                
                if not cred:
                    raise Exception("No credentials found")
                
                if not bool(getattr(board, "is_online", False)):
                    raise Exception("Router is offline")
                
                # Decrypt password
                enc_val = getattr(cred, "password_mikrotik_encrypted", None)
                password = decrypt_password(str(enc_val) if enc_val is not None else "")
                
                # Execute SSH Command
                ssh_res = await self._execute_ssh_command(
                    str(board.ip_address),
                    board.port_ssh or 22,
                    cred.username_mikrotik,
                    password,
                    command
                )
                
                res["status"] = ssh_res["status"]
                res["output"] = ssh_res["output"]
                res["error"] = ssh_res["error"]
                
                setattr(log_entry, "status", str(ssh_res["status"]))
                setattr(log_entry, "output", ssh_res["output"])
                setattr(log_entry, "error_message", ssh_res["error"])
                
            except Exception as e:
                res["status"] = "failed"
                res["error"] = str(e)
                
                setattr(log_entry, "status", "failed")
                setattr(log_entry, "error_message", str(e))
            
            results.append(res)
        
        setattr(job, "status", "completed")
        setattr(job, "completed_at", datetime.now())
        await db.commit()
        
        return results

    async def trigger_auto_heal(
        self,
        db: AsyncSession,
        board_id: UUID,
        reason: str,
        user_id: UUID | None = None
    ) -> Dict[str, Any]:
        """
        Phase 8: Self-Healing (Auto Reboot)
        """
        job = AutomationJob(
            job_type='reboot',
            payload={"reason": reason, "target_ids": [str(board_id)]},
            description=f"Auto-Heal: {reason}",
            status='running',
            created_by=user_id
        )
        db.add(job)
        await db.flush()
        
        query = select(MikrotikBoard).where(MikrotikBoard.board_id == board_id)
        result = await db.execute(query)
        board = result.scalar_one_or_none()
        
        if not board:
            raise Exception("Board not found")
            
        log_entry = AutomationLog(
            job_id=job.job_id,
            board_id=board_id,
            status='pending'
        )
        db.add(log_entry)
        
        if not bool(getattr(board, "is_online", False)):
            setattr(log_entry, "status", "failed")
            setattr(log_entry, "error_message", "Router offline")
            setattr(job, "status", "failed")
            setattr(job, "completed_at", datetime.now())
            await db.commit()
            raise Exception("Cannot heal offline router")
            
        # Execute Reboot via SSH
        try:
            # Get credentials
            cred_query = select(BoardCredential).where(BoardCredential.board_id == board_id)
            cred_res = await db.execute(cred_query)
            cred = cred_res.scalar_one_or_none()
            
            if not cred:
                raise Exception("No credentials found")
                
            enc_val = getattr(cred, "password_mikrotik_encrypted", None)
            password = decrypt_password(str(enc_val) if enc_val is not None else "")
            
            ssh_res = await self._execute_ssh_command(
                str(board.ip_address),
                board.port_ssh or 22,
                cred.username_mikrotik,
                password,
                "/system reboot"
            )
            
            setattr(log_entry, "status", str(ssh_res["status"]))
            setattr(log_entry, "output", ssh_res["output"])
            setattr(log_entry, "error_message", ssh_res["error"])
            
            if ssh_res["status"] == "failed":
                 setattr(job, "status", "failed")
                 raise Exception(f"Reboot failed: {ssh_res['error']}")
                 
            setattr(job, "status", "completed")
            setattr(job, "completed_at", datetime.now())
            await db.commit()
            return {"status": "success", "message": f"Reboot command sent to {board.board_name}"}
            
        except Exception as e:
            setattr(log_entry, "status", "failed")
            setattr(log_entry, "error_message", str(e))
            setattr(job, "status", "failed")
            setattr(job, "completed_at", datetime.now())
            await db.commit()
            raise e

    async def register_ztp_device(
        self,
        db: AsyncSession,
        identity: str,
        model: str,
        mac_address: str,
        ip_address: str,
        port_api: int,
        temp_username: str,
        temp_password: str
    ) -> Dict[str, Any]:
        """
        Phase 8: Zero Touch Provisioning (ZTP)
        Uses ZTPQueue table.
        """
        # Check Existing Board
        query = select(MikrotikBoard).where(MikrotikBoard.mac_address == mac_address)
        result = await db.execute(query)
        existing = result.scalar_one_or_none()
        
        if existing:
            return {"status": "exists", "board_id": existing.board_id}
            
        # Check Queue
        q_query = select(ZTPQueue).where(ZTPQueue.mac_address == mac_address, ZTPQueue.status == 'pending')
        q_result = await db.execute(q_query)
        in_queue = q_result.scalar_one_or_none()
        
        if in_queue:
             return {"status": "queued", "ztp_id": in_queue.ztp_id, "message": "Already in queue"}

        encrypted_pass = encrypt_password(temp_password)
        
        new_ztp = ZTPQueue(
            mac_address=mac_address,
            ip_address=ip_address,
            identity=identity,
            model=model,
            temp_username=temp_username,
            temp_password=encrypted_pass,
            status='pending'
        )
        db.add(new_ztp)
        await db.commit()
        
        return {"status": "queued", "ztp_id": new_ztp.ztp_id}

    async def apply_qos_policy(
        self,
        db: AsyncSession,
        board_id: UUID,
        policy_name: str,
        max_bandwidth: int,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Phase 8: Dynamic QoS (Fair Usage Policy)
        Menerapkan simple queue secara dinamis berdasarkan load.
        """
        # Validasi Board
        query = select(MikrotikBoard).where(MikrotikBoard.board_id == board_id)
        result = await db.execute(query)
        board = result.scalar_one_or_none()
        
        if not board or not bool(getattr(board, "is_online", False)):
             raise Exception("Router offline or not found")
             
        # Generate Command
        command = f"/queue simple add name={policy_name} max-limit={max_bandwidth}M/{max_bandwidth}M target=0.0.0.0/0 place-before=0"
        
        # Get Credentials
        cred_query = select(BoardCredential).where(BoardCredential.board_id == board_id)
        cred_res = await db.execute(cred_query)
        cred = cred_res.scalar_one_or_none()
        
        if not cred:
            raise Exception("No credentials found")
            
        enc_val = getattr(cred, "password_mikrotik_encrypted", None)
        password = decrypt_password(str(enc_val) if enc_val is not None else "")
        
        # Execute SSH
        ssh_res = await self._execute_ssh_command(
            str(board.ip_address),
            board.port_ssh or 22,
            cred.username_mikrotik,
            password,
            command
        )
        
        status = 'success' if ssh_res["status"] == "success" else "failed"
        
        # Simpan History Job
        job = AutomationJob(
            job_type='qos_update',
            payload={"policy": policy_name, "limit": max_bandwidth},
            description=f"Applied QoS {policy_name}",
            status=status, 
            created_by=user_id,
            completed_at=datetime.now()
        )
        db.add(job)
        await db.flush() # Flush to get ID for Log
        
        # Log Detail
        log = AutomationLog(
            job_id=job.job_id,
            board_id=board_id,
            status=status,
            output=ssh_res["output"] if status == 'success' else ssh_res["error"] or "Command Failed"
        )
        db.add(log)
        await db.commit()
        
        if status == 'failed':
            raise Exception(f"QoS Application Failed: {ssh_res['error']}")
            
        return {"status": "success", "policy": policy_name}

    async def run_config_recovery(
        self,
        db: AsyncSession,
        board_id: UUID,
        target_config: str,
        baseline_value: str,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Phase 8: Auto-Recovery (Config Drift Correction)
        Mengembalikan konfigurasi ke baseline (misal DNS berubah).
        """
        # Logic Pemulihan
        cmd_map = {
            "dns": f"/ip dns set servers={baseline_value}",
            "ntp": f"/system ntp client set primary-ntp={baseline_value}",
            "firewall": "/ip firewall filter reset-counters-all"
        }
        
        command = cmd_map.get(target_config)
        if not command:
            raise Exception("Unknown config target")

        # Get Board & Creds
        query = select(MikrotikBoard).where(MikrotikBoard.board_id == board_id)
        result = await db.execute(query)
        board = result.scalar_one_or_none()
        
        if not board:
            raise Exception("Board not found")
            
        cred_query = select(BoardCredential).where(BoardCredential.board_id == board_id)
        cred_res = await db.execute(cred_query)
        cred = cred_res.scalar_one_or_none()
        
        if not cred:
             raise Exception("No credentials found")
             
        enc_val = getattr(cred, "password_mikrotik_encrypted", None)
        password = decrypt_password(str(enc_val) if enc_val is not None else "")
            
        # Execute SSH
        ssh_res = await self._execute_ssh_command(
            str(board.ip_address),
            board.port_ssh or 22,
            cred.username_mikrotik,
            password,
            command
        )
        
        status = 'success' if ssh_res["status"] == "success" else "failed"
            
        # Job Tracking
        job = AutomationJob(
            job_type='config_recovery',
            payload={"target": target_config, "baseline": baseline_value},
            description=f"Recovered {target_config}",
            status='completed' if status == 'success' else 'failed',
            created_by=user_id,
            completed_at=datetime.now()
        )
        db.add(job)
        await db.flush()
        
        # Log Detail
        log = AutomationLog(
            job_id=job.job_id,
            board_id=board_id,
            status=status,
            output=ssh_res["output"] if status == 'success' else ssh_res["error"]
        )
        db.add(log)
        await db.commit()
        
        if status == 'failed':
             raise Exception(f"Recovery Failed: {ssh_res['error']}")
        
        return {"status": "recovered", "target": target_config}

automation_service = AutomationService()
