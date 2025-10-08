#!/bin/sh
echo "=== Environment Debug ==="
echo "PORT=$PORT"
echo "RAILWAY_PUBLIC_PORT=$RAILWAY_PUBLIC_PORT"
echo "All env vars:"
env | grep -E "(PORT|RAILWAY)" || true
echo "======================="

# Use PORT if set, otherwise try RAILWAY vars, finally default to 8080
SERVE_PORT=${PORT:-${RAILWAY_PUBLIC_PORT:-8080}}
echo "Starting server on port $SERVE_PORT"
exec npx serve dist -s -p "$SERVE_PORT"
