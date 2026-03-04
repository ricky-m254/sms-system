#!/usr/bin/env bash
set -euo pipefail

echo "[render] starting backend bootstrap..."

python manage.py migrate_schemas --shared --noinput
python manage.py migrate_schemas --noinput
python manage.py collectstatic --noinput

echo "[render] starting gunicorn..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers ${WEB_CONCURRENCY:-3} \
  --timeout 120
