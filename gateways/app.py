from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocket

from gateways.config import get_settings
from gateways.db import (
    configure_pools,
    get_discord_pool,
    get_security_pool,
    get_signals_pool,
)
from gateways.discord_feed import router as discord_router
from gateways.security_feed import router as security_router
from gateways.signals_ws import handle_signals_websocket


class _TestSettings:
    """In-memory settings for unit tests — no env vars required."""

    hermes_signals_token = "test-signals-token"  # secret-scan: allow — test-mode dummy
    hermes_security_token = "test-security-token"  # secret-scan: allow — test-mode dummy
    hermes_discord_token = "test-discord-token"  # secret-scan: allow — test-mode dummy
    ws_allowed_origins = ["http://localhost:1420", "tauri://localhost"]


class _NullPool:
    """Empty-result pool for unit tests — auth paths never reach the DB."""

    async def fetch(self, query, *args):
        return []

    async def fetchval(self, query, *args):
        return None


def create_app(test_mode: bool = False) -> FastAPI:
    """FastAPI factory with CORS, feed routers, and the signals WebSocket."""

    app = FastAPI(title="Hermes Gateway Service")

    if test_mode:
        settings = _TestSettings()
        null_pool = _NullPool()
        app.dependency_overrides[get_settings] = lambda: settings
        app.dependency_overrides[get_security_pool] = lambda: null_pool
        app.dependency_overrides[get_discord_pool] = lambda: null_pool
        signals_pool = null_pool
    else:
        settings = get_settings()
        configure_pools(
            settings.hermes_signals_dsn,
            settings.hermes_security_dsn,
            settings.hermes_discord_dsn,
        )
        signals_pool = get_signals_pool()

    # CORS: allowlist exactly localhost:1420 and tauri://localhost, no wildcard
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ws_allowed_origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["authorization", "origin"],
    )

    # Health check (no auth, no DB)
    @app.get("/healthz")
    async def health():
        return {"status": "ok"}

    app.include_router(security_router)
    app.include_router(discord_router)

    @app.websocket("/ws/signals")
    async def websocket_signals(ws: WebSocket):
        await handle_signals_websocket(ws, signals_pool, settings)

    return app
