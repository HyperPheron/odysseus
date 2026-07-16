"""Unit tests for gateways.config and gateways.db modules."""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from gateways.config import Settings, get_settings
from gateways.db import DBPool, configure_pools, get_signals_pool, get_security_pool, get_discord_pool, _pools


class TestSettingsInit:
    """Test Settings initialization with environment variables."""

    def test_settings_with_all_vars_present(self, monkeypatch):
        """Test Settings initializes successfully when all required env vars are set."""
        monkeypatch.setenv("HERMES_SIGNALS_TOKEN", "signals_token_value")
        monkeypatch.setenv("HERMES_SECURITY_TOKEN", "security_token_value")
        monkeypatch.setenv("HERMES_DISCORD_TOKEN", "discord_token_value")
        monkeypatch.setenv("HERMES_SIGNALS_DSN", "postgresql://signals")
        monkeypatch.setenv("HERMES_SECURITY_DSN", "postgresql://security")
        monkeypatch.setenv("HERMES_DISCORD_DSN", "postgresql://discord")
        monkeypatch.setenv("HERMES_WS_ORIGINS", "http://example.com,https://example.com")
        monkeypatch.setenv("HERMES_GATEWAY_PORT", "8000")

        settings = Settings()

        assert settings.hermes_signals_token == "signals_token_value"
        assert settings.hermes_security_token == "security_token_value"
        assert settings.hermes_discord_token == "discord_token_value"
        assert settings.hermes_signals_dsn == "postgresql://signals"
        assert settings.hermes_security_dsn == "postgresql://security"
        assert settings.hermes_discord_dsn == "postgresql://discord"
        assert settings.hermes_ws_origins == "http://example.com,https://example.com"
        assert settings.hermes_gateway_port == 8000

    @pytest.mark.parametrize("missing_var,env_name", [
        ("hermes_signals_token", "HERMES_SIGNALS_TOKEN"),
        ("hermes_security_token", "HERMES_SECURITY_TOKEN"),
        ("hermes_discord_token", "HERMES_DISCORD_TOKEN"),
        ("hermes_signals_dsn", "HERMES_SIGNALS_DSN"),
        ("hermes_security_dsn", "HERMES_SECURITY_DSN"),
        ("hermes_discord_dsn", "HERMES_DISCORD_DSN"),
    ])
    def test_settings_raises_on_missing_required_var(self, monkeypatch, missing_var, env_name):
        """Test Settings raises ValueError when a required env var is missing."""
        # Set all vars except the missing one
        monkeypatch.setenv("HERMES_SIGNALS_TOKEN", "signals_token_value")
        monkeypatch.setenv("HERMES_SECURITY_TOKEN", "security_token_value")
        monkeypatch.setenv("HERMES_DISCORD_TOKEN", "discord_token_value")
        monkeypatch.setenv("HERMES_SIGNALS_DSN", "postgresql://signals")
        monkeypatch.setenv("HERMES_SECURITY_DSN", "postgresql://security")
        monkeypatch.setenv("HERMES_DISCORD_DSN", "postgresql://discord")

        # Delete the missing var
        monkeypatch.delenv(env_name, raising=False)

        with pytest.raises(ValueError) as exc_info:
            Settings()

        assert env_name in str(exc_info.value)

    def test_ws_allowed_origins_default(self, monkeypatch):
        """Test ws_allowed_origins parses the default value correctly."""
        monkeypatch.setenv("HERMES_SIGNALS_TOKEN", "signals_token_value")
        monkeypatch.setenv("HERMES_SECURITY_TOKEN", "security_token_value")
        monkeypatch.setenv("HERMES_DISCORD_TOKEN", "discord_token_value")
        monkeypatch.setenv("HERMES_SIGNALS_DSN", "postgresql://signals")
        monkeypatch.setenv("HERMES_SECURITY_DSN", "postgresql://security")
        monkeypatch.setenv("HERMES_DISCORD_DSN", "postgresql://discord")
        # Don't set HERMES_WS_ORIGINS, use default

        settings = Settings()
        origins = settings.ws_allowed_origins

        assert isinstance(origins, list)
        assert len(origins) == 2
        assert "http://localhost:1420" in origins
        assert "tauri://localhost" in origins

    def test_ws_allowed_origins_custom(self, monkeypatch):
        """Test ws_allowed_origins parses custom comma-separated values and strips whitespace."""
        monkeypatch.setenv("HERMES_SIGNALS_TOKEN", "signals_token_value")
        monkeypatch.setenv("HERMES_SECURITY_TOKEN", "security_token_value")
        monkeypatch.setenv("HERMES_DISCORD_TOKEN", "discord_token_value")
        monkeypatch.setenv("HERMES_SIGNALS_DSN", "postgresql://signals")
        monkeypatch.setenv("HERMES_SECURITY_DSN", "postgresql://security")
        monkeypatch.setenv("HERMES_DISCORD_DSN", "postgresql://discord")
        monkeypatch.setenv("HERMES_WS_ORIGINS", "http://a.com , http://b.com , http://c.com")

        settings = Settings()
        origins = settings.ws_allowed_origins

        assert len(origins) == 3
        assert origins == ["http://a.com", "http://b.com", "http://c.com"]

    def test_ws_allowed_origins_single(self, monkeypatch):
        """Test ws_allowed_origins handles a single origin without commas."""
        monkeypatch.setenv("HERMES_SIGNALS_TOKEN", "signals_token_value")
        monkeypatch.setenv("HERMES_SECURITY_TOKEN", "security_token_value")
        monkeypatch.setenv("HERMES_DISCORD_TOKEN", "discord_token_value")
        monkeypatch.setenv("HERMES_SIGNALS_DSN", "postgresql://signals")
        monkeypatch.setenv("HERMES_SECURITY_DSN", "postgresql://security")
        monkeypatch.setenv("HERMES_DISCORD_DSN", "postgresql://discord")
        monkeypatch.setenv("HERMES_WS_ORIGINS", "http://single-origin.com")

        settings = Settings()
        origins = settings.ws_allowed_origins

        assert len(origins) == 1
        assert origins == ["http://single-origin.com"]

    def test_get_settings_returns_settings_instance(self, monkeypatch):
        """Test get_settings() returns a Settings instance."""
        monkeypatch.setenv("HERMES_SIGNALS_TOKEN", "signals_token_value")
        monkeypatch.setenv("HERMES_SECURITY_TOKEN", "security_token_value")
        monkeypatch.setenv("HERMES_DISCORD_TOKEN", "discord_token_value")
        monkeypatch.setenv("HERMES_SIGNALS_DSN", "postgresql://signals")
        monkeypatch.setenv("HERMES_SECURITY_DSN", "postgresql://security")
        monkeypatch.setenv("HERMES_DISCORD_DSN", "postgresql://discord")

        settings = get_settings()

        assert isinstance(settings, Settings)
        assert settings.hermes_signals_token == "signals_token_value"


class TestDBPool:
    """Test DBPool class and lazy initialization."""

    def test_dbpool_init_stores_dsn(self):
        """Test DBPool.__init__ stores the DSN and initializes pool to None."""
        dsn = "postgresql://user:pass@localhost/db"
        pool = DBPool(dsn)

        assert pool.dsn == dsn
        assert pool.pool is None

    @pytest.mark.asyncio
    async def test_dbpool_fetch_lazy_initializes_pool(self):
        """Test DBPool.fetch() lazily initializes the pool on first call."""
        mock_pool = AsyncMock()
        mock_pool.fetch.return_value = [{"id": 1, "name": "test"}]

        with patch("asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool):
            pool = DBPool("postgresql://localhost/db")
            assert pool.pool is None

            result = await pool.fetch("SELECT * FROM users", )

            assert result == [{"id": 1, "name": "test"}]
            assert pool.pool is mock_pool
            mock_pool.fetch.assert_called_once_with("SELECT * FROM users")

    @pytest.mark.asyncio
    async def test_dbpool_fetch_reuses_existing_pool(self):
        """Test DBPool.fetch() reuses existing pool on subsequent calls."""
        mock_pool = AsyncMock()
        mock_pool.fetch.return_value = [{"id": 1}]

        with patch("asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool) as create_pool_mock:
            pool = DBPool("postgresql://localhost/db")

            # First call initializes
            await pool.fetch("SELECT 1")
            assert create_pool_mock.call_count == 1

            # Second call reuses
            await pool.fetch("SELECT 2")
            assert create_pool_mock.call_count == 1  # Still 1, not 2

    @pytest.mark.asyncio
    async def test_dbpool_fetchval_lazy_initializes_pool(self):
        """Test DBPool.fetchval() lazily initializes the pool on first call."""
        mock_pool = AsyncMock()
        mock_pool.fetchval.return_value = 42

        with patch("asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool):
            pool = DBPool("postgresql://localhost/db")
            assert pool.pool is None

            result = await pool.fetchval("SELECT COUNT(*) FROM users")

            assert result == 42
            assert pool.pool is mock_pool
            mock_pool.fetchval.assert_called_once_with("SELECT COUNT(*) FROM users")

    @pytest.mark.asyncio
    async def test_dbpool_close_closes_pool(self):
        """Test DBPool.close() closes the pool if it exists."""
        mock_pool = AsyncMock()
        mock_pool.close = AsyncMock()

        pool = DBPool("postgresql://localhost/db")
        pool.pool = mock_pool

        await pool.close()

        mock_pool.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_dbpool_close_when_pool_is_none(self):
        """Test DBPool.close() does nothing when pool is None."""
        pool = DBPool("postgresql://localhost/db")
        assert pool.pool is None

        # Should not raise
        await pool.close()

    @pytest.mark.asyncio
    async def test_dbpool_fetch_with_query_args(self):
        """Test DBPool.fetch() passes query arguments to pool.fetch()."""
        mock_pool = AsyncMock()
        mock_pool.fetch.return_value = [{"id": 1}]

        with patch("asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool):
            pool = DBPool("postgresql://localhost/db")

            await pool.fetch("SELECT * FROM users WHERE id = $1", 42)

            mock_pool.fetch.assert_called_once_with("SELECT * FROM users WHERE id = $1", 42)

    @pytest.mark.asyncio
    async def test_dbpool_fetchval_with_query_args(self):
        """Test DBPool.fetchval() passes query arguments to pool.fetchval()."""
        mock_pool = AsyncMock()
        mock_pool.fetchval.return_value = "john_doe"

        with patch("asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool):
            pool = DBPool("postgresql://localhost/db")

            result = await pool.fetchval("SELECT name FROM users WHERE id = $1", 42)

            assert result == "john_doe"
            mock_pool.fetchval.assert_called_once_with("SELECT name FROM users WHERE id = $1", 42)


class TestConfigurePools:
    """Test pool configuration and provider functions."""

    def setup_method(self):
        """Save pool state before each test."""
        self.saved_pools = _pools.copy()

    def teardown_method(self):
        """Restore pool state after each test."""
        _pools.clear()
        _pools.update(self.saved_pools)

    def test_configure_pools_creates_three_pools(self):
        """Test configure_pools() creates three distinct DBPool instances."""
        signals_dsn = "postgresql://signals"
        security_dsn = "postgresql://security"
        discord_dsn = "postgresql://discord"

        configure_pools(signals_dsn, security_dsn, discord_dsn)

        assert "signals" in _pools
        assert "security" in _pools
        assert "discord" in _pools
        assert len(_pools) == 3

    def test_configure_pools_sets_correct_dsns(self):
        """Test configure_pools() sets the correct DSN for each pool."""
        signals_dsn = "postgresql://signals-host/db"
        security_dsn = "postgresql://security-host/db"
        discord_dsn = "postgresql://discord-host/db"

        configure_pools(signals_dsn, security_dsn, discord_dsn)

        assert _pools["signals"].dsn == signals_dsn
        assert _pools["security"].dsn == security_dsn
        assert _pools["discord"].dsn == discord_dsn

    def test_configure_pools_creates_distinct_instances(self):
        """Test that configure_pools() creates distinct DBPool instances."""
        configure_pools("dsn1", "dsn2", "dsn3")

        signals_pool = _pools["signals"]
        security_pool = _pools["security"]
        discord_pool = _pools["discord"]

        assert signals_pool is not security_pool
        assert security_pool is not discord_pool
        assert signals_pool is not discord_pool

    def test_configure_pools_overwrites_existing(self):
        """Test configure_pools() overwrites existing pools."""
        configure_pools("old_signals", "old_security", "old_discord")
        old_signals = _pools["signals"]

        configure_pools("new_signals", "new_security", "new_discord")
        new_signals = _pools["signals"]

        assert old_signals is not new_signals
        assert _pools["signals"].dsn == "new_signals"

    def test_get_signals_pool_returns_configured_pool(self):
        """Test get_signals_pool() returns the configured signals pool."""
        configure_pools("signals_dsn", "security_dsn", "discord_dsn")

        pool = get_signals_pool()

        assert pool is _pools["signals"]
        assert pool.dsn == "signals_dsn"

    def test_get_security_pool_returns_configured_pool(self):
        """Test get_security_pool() returns the configured security pool."""
        configure_pools("signals_dsn", "security_dsn", "discord_dsn")

        pool = get_security_pool()

        assert pool is _pools["security"]
        assert pool.dsn == "security_dsn"

    def test_get_discord_pool_returns_configured_pool(self):
        """Test get_discord_pool() returns the configured discord pool."""
        configure_pools("signals_dsn", "security_dsn", "discord_dsn")

        pool = get_discord_pool()

        assert pool is _pools["discord"]
        assert pool.dsn == "discord_dsn"

    def test_get_signals_pool_raises_when_unconfigured(self):
        """Test get_signals_pool() raises KeyError when pools are not configured."""
        _pools.clear()

        with pytest.raises(KeyError):
            get_signals_pool()

    def test_get_security_pool_raises_when_unconfigured(self):
        """Test get_security_pool() raises KeyError when pools are not configured."""
        _pools.clear()

        with pytest.raises(KeyError):
            get_security_pool()

    def test_get_discord_pool_raises_when_unconfigured(self):
        """Test get_discord_pool() raises KeyError when pools are not configured."""
        _pools.clear()

        with pytest.raises(KeyError):
            get_discord_pool()

    def test_provider_functions_return_same_pool_instance(self):
        """Test that calling a provider function multiple times returns the same pool instance."""
        configure_pools("signals", "security", "discord")

        pool1 = get_signals_pool()
        pool2 = get_signals_pool()
        pool3 = get_signals_pool()

        assert pool1 is pool2
        assert pool2 is pool3
