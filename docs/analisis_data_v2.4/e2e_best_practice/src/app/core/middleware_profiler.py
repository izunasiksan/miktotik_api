import os
import time

import aiofiles
from pyinstrument import Profiler
from starlette.types import ASGIApp, Receive, Scope, Send


class ProfilerMiddleware:
    """
    Middleware that profiles the request handling and returns an HTML report
    if the 'profile=true' query parameter is present.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        query_string = scope.get("query_string", b"").decode()
        if "profile=true" not in query_string:
            await self.app(scope, receive, send)
            return

        profiler = Profiler(interval=0.001, async_mode="enabled")
        profiler.start()

        # Capture the response
        await self.app(scope, receive, send)

        profiler.stop()

        # Strategy: Save report to disk and log the path.
        timestamp = int(time.time())
        # Try to get path info for better filename
        path_info = scope.get("path", "unknown").replace("/", "_")
        filename = f"profile_{timestamp}{path_info}.html"

        # Ensure directory exists
        output_dir = "docs/profiling"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        path = os.path.join(output_dir, filename)

        async with aiofiles.open(path, "w", encoding="utf-8") as f:
            await f.write(profiler.output_html())

        print(f"🔥 Profiling report saved to: {path}")
