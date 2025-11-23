-- Initialize SnapDocs database
CREATE DATABASE snapdocs;

-- Connect to the snapdocs database
\c snapdocs;

-- Create extensions (optional, for advanced features)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
