#!/bin/bash
set -e

export PGPASSWORD="$POSTGRES_PASSWORD"

psql -U hermes_admin -d hermes << EOF
-- Create read-only roles
CREATE ROLE gw_signals WITH LOGIN PASSWORD '$GW_SIGNALS_PASSWORD';
CREATE ROLE gw_security WITH LOGIN PASSWORD '$GW_SECURITY_PASSWORD';
CREATE ROLE gw_discord WITH LOGIN PASSWORD '$GW_DISCORD_PASSWORD';

-- Revoke default privileges
REVOKE ALL ON SCHEMA signals FROM PUBLIC;
REVOKE ALL ON SCHEMA security FROM PUBLIC;
REVOKE ALL ON SCHEMA discord FROM PUBLIC;

-- Grant signals role
GRANT USAGE ON SCHEMA signals TO gw_signals;
GRANT SELECT ON ALL TABLES IN SCHEMA signals TO gw_signals;
ALTER DEFAULT PRIVILEGES IN SCHEMA signals GRANT SELECT ON TABLES TO gw_signals;

-- Grant security role
GRANT USAGE ON SCHEMA security TO gw_security;
GRANT SELECT ON ALL TABLES IN SCHEMA security TO gw_security;
ALTER DEFAULT PRIVILEGES IN SCHEMA security GRANT SELECT ON TABLES TO gw_security;

-- Grant discord role
GRANT USAGE ON SCHEMA discord TO gw_discord;
GRANT SELECT ON ALL TABLES IN SCHEMA discord TO gw_discord;
ALTER DEFAULT PRIVILEGES IN SCHEMA discord GRANT SELECT ON TABLES TO gw_discord;
EOF
