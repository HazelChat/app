-- Create additional databases
CREATE DATABASE sequin;
CREATE DATABASE cluster;

-- Switch to app database and set up CDC
\c app

-- Create publication for all tables (for Sequin CDC)
CREATE PUBLICATION sequin_pub FOR ALL TABLES;

-- Create logical replication slot (for Sequin CDC)
SELECT pg_create_logical_replication_slot('sequin_slot', 'pgoutput');
