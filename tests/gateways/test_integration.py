"""Integration tests: SELECT-only enforcement at the database, per gateway role.

Spec §11.2: read-only is enforced by Postgres grants, verified by attempting
an INSERT through each gateway role and asserting failure. Requires the
TimescaleDB from docker/timescale.yml (skips cleanly when unreachable).
"""

import os

import asyncpg
import pytest

pytestmark = pytest.mark.integration

# (env var with the role's DSN, its table, INSERT tail for that table)
GATEWAYS = [
    (
        "HERMES_SIGNALS_DSN",
        "signals.signals",
        "(ts, symbol, price, side, strength) VALUES (NOW(), 'TEST', 1.0, 'buy', 0.5)",
    ),
    (
        "HERMES_SECURITY_DSN",
        "security.alerts",
        "(ts, severity, source, message) VALUES (NOW(), 'info', 'test', 'test')",
    ),
    (
        "HERMES_DISCORD_DSN",
        "discord.recaps",
        "(ts, channel, period, summary) VALUES (NOW(), 'test', 'daily', 'test')",
    ),
]

GATEWAY_IDS = ["signals", "security", "discord"]


async def _connect(env_var: str) -> asyncpg.Connection:
    dsn = os.getenv(env_var)
    if not dsn:
        pytest.skip(f"{env_var} not configured")
    try:
        return await asyncpg.connect(dsn)
    except Exception as exc:  # noqa: BLE001 - any connect failure means skip
        pytest.skip(f"Database unreachable: {exc}")


@pytest.mark.parametrize(("env_var", "table", "insert_tail"), GATEWAYS, ids=GATEWAY_IDS)
async def test_role_can_select(env_var, table, insert_tail):
    conn = await _connect(env_var)
    try:
        rows = await conn.fetch(f"SELECT * FROM {table} LIMIT 1")
        assert rows is not None
    finally:
        await conn.close()


@pytest.mark.parametrize(("env_var", "table", "insert_tail"), GATEWAYS, ids=GATEWAY_IDS)
async def test_role_cannot_insert(env_var, table, insert_tail):
    conn = await _connect(env_var)
    try:
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await conn.execute(f"INSERT INTO {table} {insert_tail}")
    finally:
        await conn.close()


@pytest.mark.parametrize(("env_var", "table", "insert_tail"), GATEWAYS, ids=GATEWAY_IDS)
async def test_role_cannot_update_or_delete(env_var, table, insert_tail):
    conn = await _connect(env_var)
    try:
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await conn.execute(f"UPDATE {table} SET ts = NOW()")
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await conn.execute(f"DELETE FROM {table}")
    finally:
        await conn.close()


async def test_signals_role_cannot_read_other_schemas():
    """Cross-schema isolation: gw_signals must not see security.alerts."""
    conn = await _connect("HERMES_SIGNALS_DSN")
    try:
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await conn.fetch("SELECT * FROM security.alerts LIMIT 1")
    finally:
        await conn.close()
