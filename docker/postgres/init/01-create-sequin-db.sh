#!/bin/bash
set -e

# Create the sequin database (for Sequin's internal data)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname=postgres <<-EOSQL
    CREATE DATABASE sequin;
EOSQL

# Set up CDC on the app database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname="$POSTGRES_DB" <<-EOSQL
    -- Create publication for all tables (for Sequin CDC)
    CREATE PUBLICATION sequin_pub FOR ALL TABLES;

    -- Create logical replication slot (for Sequin CDC)
    SELECT pg_create_logical_replication_slot('sequin_slot', 'pgoutput');
EOSQL
