-- Mounting db/init over /docker-entrypoint-initdb.d replaces the image's own
-- extension-install script, so the extension must be created here.
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Signals schema with TimescaleDB hypertable
CREATE SCHEMA signals;
CREATE TABLE signals.signals (
  ts timestamptz NOT NULL,
  symbol text NOT NULL,
  price numeric NOT NULL,
  side text NOT NULL CHECK (side IN ('buy', 'sell', 'hold')),
  strength real NOT NULL
);
SELECT create_hypertable('signals.signals', 'ts', if_not_exists => TRUE);

-- Security alerts schema
CREATE SCHEMA security;
CREATE TABLE security.alerts (
  ts timestamptz,
  severity text CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  source text,
  message text
);

-- Discord recaps schema
CREATE SCHEMA discord;
CREATE TABLE discord.recaps (
  ts timestamptz,
  channel text,
  period text,
  summary text
);
