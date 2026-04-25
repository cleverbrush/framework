-- Creates a read-only user for local development.
-- This script runs once on first container initialization.
CREATE USER readonly WITH PASSWORD 'qwerty123';

GRANT CONNECT ON DATABASE todo_db TO readonly;
\c todo_db
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO readonly;
