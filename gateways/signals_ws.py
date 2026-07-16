import asyncio
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect, status

from gateways.auth import verify_signals_token

# Module-level connection counter for rate limiting
_active_connections = 0
_active_connections_lock = asyncio.Lock()
MAX_CONCURRENT_WS = 8

POLL_INTERVAL_SECONDS = 2.0

# Fixed prepared queries only — client input never reaches SQL.
SNAPSHOT_QUERY = (
    "SELECT ts, symbol, price, side, strength FROM signals.signals "
    "ORDER BY ts DESC LIMIT 50"
)
SERIES_QUERY = (
    "SELECT symbol, price FROM ("
    " SELECT symbol, price, ts,"
    "        row_number() OVER (PARTITION BY symbol ORDER BY ts DESC) AS rn"
    " FROM signals.signals"
    ") ranked WHERE rn <= 30 ORDER BY symbol, ts"
)
NEW_SIGNALS_QUERY = (
    "SELECT ts, symbol, price, side, strength FROM signals.signals "
    "WHERE ts > $1 ORDER BY ts LIMIT 200"
)


async def handle_signals_websocket(ws: WebSocket, db_pool, settings):
    """
    Handle WebSocket connection for signals.
    Auth contract: client passes subprotocols ['hermes-bearer', token].
    Server validates token AND origin BEFORE accepting.
    """
    global _active_connections

    # Get subprotocols from connection (second item is token)
    subprotocols = ws.scope.get("subprotocols", [])
    token = subprotocols[1] if len(subprotocols) > 1 else None

    # Validate token before accepting
    if not token or not await verify_signals_token(token, settings):
        await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    # Validate origin (browser clients always send one; absent = non-browser,
    # which the token requirement already covers)
    origin = ws.headers.get("origin", "")
    if origin and origin not in settings.ws_allowed_origins:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="Origin not allowed")
        return

    # Rate limiting: reject if too many active connections
    async with _active_connections_lock:
        if _active_connections >= MAX_CONCURRENT_WS:
            await ws.close(code=status.WS_1013_TRY_AGAIN_LATER, reason="Server at capacity")
            return
        _active_connections += 1

    try:
        await ws.accept(subprotocol="hermes-bearer")

        snapshot, last_ts = await _get_snapshot(db_pool)
        await ws.send_json(snapshot)

        # Push new rows by ts cursor; heartbeat when idle so client
        # disconnects surface within one poll interval.
        while True:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
            rows = await db_pool.fetch(NEW_SIGNALS_QUERY, last_ts)
            if rows:
                last_ts = rows[-1]["ts"]
                for row in rows:
                    await ws.send_json({"type": "signal", "signal": _signal_dict(row)})
            else:
                await ws.send_json({"type": "heartbeat"})
    except (WebSocketDisconnect, RuntimeError):
        pass  # client went away mid-send; nothing to clean up beyond the counter
    finally:
        async with _active_connections_lock:
            _active_connections -= 1


def _signal_dict(row) -> dict:
    return {
        "ts": str(row["ts"]),
        "symbol": row["symbol"],
        "price": float(row["price"]),
        "side": row["side"],
        "strength": float(row["strength"]),
    }


async def _get_snapshot(db_pool) -> tuple[dict, datetime]:
    """Fetch last 50 signals + last 30 prices per symbol, and the ts cursor."""
    rows = await db_pool.fetch(SNAPSHOT_QUERY)
    series_rows = await db_pool.fetch(SERIES_QUERY)

    series: dict[str, list[float]] = {}
    for row in series_rows:
        series.setdefault(row["symbol"], []).append(float(row["price"]))

    last_ts = max(
        (row["ts"] for row in rows),
        default=datetime.now(timezone.utc),
    )
    snapshot = {
        "type": "snapshot",
        "signals": [_signal_dict(row) for row in rows],
        "series": series,
    }
    return snapshot, last_ts
