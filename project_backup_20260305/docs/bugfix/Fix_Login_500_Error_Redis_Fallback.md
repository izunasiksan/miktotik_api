# Fix Login 500 Error (Redis Fallback)

## Issue
User reported "Login failed in AuthContext AxiosError: Request failed with status code 500" or "Internal Server Error" when accessing the login endpoint.
The logs showed `redis.exceptions.ConnectionError: Error 10061 connecting to localhost:6379`.

## Cause
The application uses `slowapi` for rate limiting, which defaults to using Redis as a storage backend.
When Redis is not running or unreachable, the `limiter` initialization fails or throws errors during request processing, causing a 500 Internal Server Error.

## Solution
Implemented a fallback mechanism in `app/core/limiter.py`:
1.  Check if Redis is reachable using `socket.create_connection`.
2.  If Redis is unreachable, switch `storage_uri` to `"memory://"` (in-memory storage).
3.  This ensures the application continues to function (albeit with local-only rate limiting) even if Redis is down.

## Verification
1.  Restarted the backend server.
2.  Observed log message: `WARNING: Redis not reachable. Falling back to memory storage for Limiter.`
3.  Successfully accessed `/api/v1/auth/login/` with user `developer` and received a valid JWT token.
4.  Verified root endpoint `/` and `/docs` are accessible.

## Files Modified
- `app/core/limiter.py`: Added `is_redis_available` check and fallback logic.
- `app/main.py`: Re-enabled middleware (`SlowAPIMiddleware`, `BlacklistMiddleware`, etc.) after verifying they handle Redis failure gracefully.
- `app/api/endpoints/auth.py`: Re-enabled `@limiter.limit` decorator.

## Status
RESOLVED.
