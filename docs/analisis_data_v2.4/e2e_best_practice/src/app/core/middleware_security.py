from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.limiter import check_blacklist


class BlacklistMiddleware(BaseHTTPMiddleware):
    """
    Middleware to block IPs listed in Redis blacklist (Jail2Ban).
    """

    async def dispatch(self, request: Request, call_next):
        # 0. Skip for CORS Preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        # 1. Get Real IP
        client_ip = "0.0.0.0"
        if request.client:
            client_ip = request.client.host

        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"].split(",")[0]

        # 2. Check Blacklist
        try:
            if await check_blacklist(client_ip):
                # Return 403 Forbidden immediately
                raise HTTPException(
                    status_code=403,
                    detail="Access Denied: IP Blacklisted due to excessive violations.",
                )
        except Exception as e:
            # Fail-open if Redis is down
            print(
                f"Blacklist check failed (Redis error): {e}. Proceeding as fail-open."
            )

        return await call_next(request)


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    def __init__(
        self, app, allowed_ips: list[str], protected_paths: list[str] | None = None
    ):
        super().__init__(app)
        self.allowed_ips = allowed_ips
        self.protected_paths = protected_paths or []

    async def dispatch(self, request: Request, call_next):
        # 0. Skip for CORS Preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        # 0.5 Skip checks if Whitelist is disabled ("*")
        if self.allowed_ips and "*" in self.allowed_ips:
            return await call_next(request)

        # 1. Check if path is protected (if specific paths are defined)
        # If protected_paths is defined, ONLY check IP for those paths.
        if self.protected_paths:
            current_path = request.url.path
            is_protected = any(
                current_path.startswith(path) for path in self.protected_paths
            )
            if not is_protected:
                return await call_next(request)

        # 2. Get Client IP
        client_ip = "0.0.0.0"
        if request.client:
            client_ip = request.client.host

        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"].split(",")[0]

        # 3. Validate IP
        if client_ip not in self.allowed_ips:
            raise HTTPException(
                status_code=403,
                detail="Access Denied: IP Address not allowed for this resource.",
            )

        response = await call_next(request)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Skip for CORS Preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        try:
            response = await call_next(request)
        except Exception as e:
            # Jika terjadi error di middleware lain, pastikan header security tetap ada
            raise e

        # Hardening Headers (Helmet-like)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        # CSP adjusted for local development and Recharts (inline styles)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data:;"
        )

        return response
