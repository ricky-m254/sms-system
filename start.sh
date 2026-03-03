#!/usr/bin/env bash
set -e

echo "Starting backend..."

cd sms_backend

python manage.py migrate --noinput
python manage.py collectstatic --noinput || true

gunicorn config.wsgi:application \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers 3
