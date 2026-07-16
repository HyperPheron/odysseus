from fastapi import APIRouter, Depends, Query
from gateways.auth import verify_discord_token
from gateways.db import DBPool, get_discord_pool

router = APIRouter(prefix="/api/discord", tags=["discord"])


@router.get("/recaps")
async def get_discord_recaps(
    limit: int = Query(20, ge=1, le=100),
    token: str = Depends(verify_discord_token),
    db_pool: DBPool = Depends(get_discord_pool)
):
    """Get discord recaps feed (fixed query, no client input)"""
    # Clamp limit
    limit = min(limit, 100)
    limit = max(limit, 1)

    # Fixed prepared query only
    rows = await db_pool.fetch(
        "SELECT ts, channel, period, summary FROM discord.recaps "
        "ORDER BY ts DESC LIMIT $1",
        limit
    )

    return [
        {
            "ts": str(row["ts"]),
            "channel": row["channel"],
            "period": row["period"],
            "summary": row["summary"]
        }
        for row in rows
    ]
