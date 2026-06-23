#!/bin/bash
docker exec 0a4a226418de_acua-core-postgres psql -U acuacore_user -d acuacore_vectors -c "CREATE USER pitayacore_user WITH ENCRYPTED PASSWORD 'pitayacore_pass';" || true
docker exec 0a4a226418de_acua-core-postgres psql -U acuacore_user -d acuacore_vectors -c "CREATE DATABASE pitayacore_vectors OWNER pitayacore_user;" || true
docker exec 0a4a226418de_acua-core-postgres psql -U acuacore_user -d pitayacore_vectors -c "CREATE EXTENSION IF NOT EXISTS vector;"
