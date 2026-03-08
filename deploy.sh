#!/usr/bin/env bash
set -e

WORKSPACE="$(cd "$(dirname "$0")" && pwd)"
cd "$WORKSPACE/sms_backend"

echo "==> Starting gunicorn on port 3000..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:3000 \
  --workers 3 \
  --timeout 120
