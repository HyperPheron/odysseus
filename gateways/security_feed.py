from fastapi import APIRouter, Depends, Query
from gateways.auth import verify_security_token
from gateways.db import DBPool, get_security_pool

router = APIRouter(prefix="/api/security", tags=["security"])


@router.get("/alerts")
async def get_security_alerts(
    limit: int = Query(50, ge=1, le=200),
    token: str = Depends(verify_security_token),
    db_pool: DBPool = Depends(get_security_pool)
):
    """Get security alerts feed (fixed query, no client input)"""
    # Clamp limit
    limit = min(limit, 200)
    limit = max(limit, 1)

    # Fixed prepared query only
    rows = await db_pool.fetch(
        "SELECT ts, severity, source, message FROM security.alerts "
        "ORDER BY ts DESC LIMIT $1",
        limit
    )

    return [
        {
            "ts": str(row["ts"]),
            "severity": row["severity"],
            "source": row["source"],
            "message": row["message"]
        }
        for row in rows
    ]
