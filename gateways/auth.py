import secrets
from fastapi import HTTPException, status, Depends, Header
from typing import Optional

from gateways.config import Settings, get_settings


async def verify_security_token(
    authorization: Optional[str] = Header(None),
    settings: Settings = Depends(get_settings)
) -> str:
    """Verify bearer token for security gateway"""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    token = parts[1]
    if not secrets.compare_digest(token, settings.hermes_security_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    return token


async def verify_discord_token(
    authorization: Optional[str] = Header(None),
    settings: Settings = Depends(get_settings)
) -> str:
    """Verify bearer token for discord gateway"""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    token = parts[1]
    if not secrets.compare_digest(token, settings.hermes_discord_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    return token


async def verify_signals_token(token: str, settings: Settings = Depends(get_settings)) -> bool:
    """Verify bearer token for signals WebSocket"""
    return secrets.compare_digest(token, settings.hermes_signals_token)
