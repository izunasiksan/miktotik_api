# Core Backend Fixes - 2026-03-01

## Overview
This update addresses critical stability and security issues identified in the core backend services, middleware, and workers. The changes ensure strict adherence to async programming models and prevent potential runtime crashes in specific environments.

## Fixed Components

### 1. `app/core/middleware_security.py` & `app/main.py`
- **Issue**: Potential `AttributeError: 'NoneType' object has no attribute 'host'` when accessing `request.client.host` if the request originates from a client that doesn't provide this attribute (e.g., certain test clients or proxies).
- **Fix**: Added defensive checks `if request.client:` before accessing `.host`. Fallback to `"0.0.0.0"` if client is unavailable.

### 2. `app/services/polling_worker.py`
- **Issue**:
  - `routeros_api` (synchronous library) calls were blocking the event loop in `fetch_sync`.
  - SSL was disabled by default even for secure ports.
- **Fix**:
  - Wrapped blocking `fetch_sync` calls in `loop.run_in_executor` to offload them to a thread pool, preventing event loop blocking.
  - Enforced `use_ssl=True` when connecting to port 8729 (Mikrotik API-SSL default).

### 3. `app/scheduler/cron_tasks.py`
- **Issue**: Synchronous file system operations (`os.remove`, `glob.glob`) in `run_daily_backups` cleanup logic could block the scheduler loop.
- **Fix**: Wrapped cleanup logic in a separate function `cleanup_sync` and executed it via `loop.run_in_executor`.

### 4. Verification
- **Syntax Check**: Ran `tests/verify_syntax.py` to ensure all modified modules import correctly without syntax errors.
- **Async Compliance**: Confirmed that no blocking I/O remains in critical paths without executor wrapping.

## Validated Files
- `app/core/config.py` (Configuration verified)
- `app/core/security.py` (Security logic verified)
- `app/models/user.py` (Schema consistency verified)
- `app/services/alert_manager.py` (Alert logic verified)
- `app/services/audit_service.py` (Async logging verified)
- `app/services/automation_service.py` (Automation tasks verified)
- `app/services/backup_service.py` (Backup logic verified)
- `app/services/polling_async_experiment.py` (Experimental code reviewed)
- `app/services/retention_service.py` (Retention logic verified)
- `app/services/telegram_service.py` (Telegram integration verified)

## Next Steps
- Monitor `polling_worker` performance with SSL enabled.
- Consider migrating polling logic fully to `asyncssh` in future phases for better performance.
