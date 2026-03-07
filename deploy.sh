#!/usr/bin/env bash
set -e

echo "==> Building React frontend..."
cd sms_frontend
npm ci --prefer-offline
npm run build
cd ..

echo "==> Copying frontend build to Django..."
mkdir -p sms_backend/frontend_build
cp -r sms_frontend/dist/. sms_backend/frontend_build/

echo "==> Running Django migrations..."
cd sms_backend
python manage.py migrate_schemas --shared --noinput
python manage.py collectstatic --noinput

echo "==> Starting production server (gunicorn)..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:5000 \
  --workers 3 \
  --timeout 120
