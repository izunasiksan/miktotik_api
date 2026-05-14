# UPDATED v2.4 - INDIKATOR SINKRONISASI
import redis.asyncio as redis
import os
import json
from typing import Any, Optional
from datetime import timedelta

class RedisManager:
    """
    Redis Manager untuk Backend (Python/FastAPI) v2.4
    Menghubungkan aplikasi native ke Redis Container melalui localhost:6379
    """
    def __init__(self):
        self.host = os.getenv("REDIS_HOST", "localhost")
        self.port = int(os.getenv("REDIS_PORT", 6379))
        self.password = os.getenv("REDIS_PASSWORD", "mikrotik_api_v24")
        self.db = int(os.getenv("REDIS_DB", 0))
        self.client: Optional[redis.Redis] = None

    async def connect(self):
        """Membangun koneksi ke Redis"""
        if not self.client:
            self.client = redis.Redis(
                host=self.host,
                port=self.port,
                password=self.password,
                db=self.db,
                decode_responses=True
            )
            print(f"🚀 Redis Backend Connected: {self.host}:{self.port}")

    async def disconnect(self):
        """Menutup koneksi Redis"""
        if self.client:
            await self.client.close()
            self.client = None

    async def set_cache(self, key: str, value: Any, expire: int = 3600):
        """Operasi SET dengan Expiry (Default 1 jam)"""
        await self.connect()
        if self.client:
            serialized_val = json.dumps(value)
            await self.client.set(key, serialized_val, ex=expire)

    async def get_cache(self, key: str) -> Optional[Any]:
        """Operasi GET"""
        await self.connect()
        if self.client:
            data = await self.client.get(key)
            return json.loads(data) if data else None
        return None

    async def delete_cache(self, key: str):
        """Operasi DEL"""
        await self.connect()
        if self.client:
            await self.client.delete(key)

# Singleton Instance
redis_manager = RedisManager()
