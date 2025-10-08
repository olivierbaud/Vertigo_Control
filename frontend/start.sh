#!/bin/sh
echo "Starting server on port ${PORT:-8080}"
exec npx serve dist -s -p "${PORT:-8080}"
