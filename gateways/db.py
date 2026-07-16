from typing import Optional

import asyncpg


class DBPool:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool: Optional[asyncpg.Pool] = None

    async def init(self):
        """Lazy initialize pool"""
        if not self.pool:
            self.pool = await asyncpg.create_pool(self.dsn)

    async def fetch(self, query: str, *args):
        """Execute SELECT and return rows"""
        await self.init()
        return await self.pool.fetch(query, *args)

    async def fetchval(self, query: str, *args):
        """Execute SELECT and return single value"""
        await self.init()
        return await self.pool.fetchval(query, *args)

    async def close(self):
        """Close pool"""
        if self.pool:
            await self.pool.close()


# One pool per gateway role — each DSN carries a SELECT-only Postgres role.
_pools: dict[str, DBPool] = {}


def configure_pools(signals_dsn: str, security_dsn: str, discord_dsn: str) -> None:
    _pools["signals"] = DBPool(signals_dsn)
    _pools["security"] = DBPool(security_dsn)
    _pools["discord"] = DBPool(discord_dsn)


def get_signals_pool() -> DBPool:
    return _pools["signals"]


def get_security_pool() -> DBPool:
    return _pools["security"]


def get_discord_pool() -> DBPool:
    return _pools["discord"]
