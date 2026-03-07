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

cd sms_backend

echo "==> Collecting static files..."
python manage.py collectstatic --noinput || echo "WARNING: collectstatic had errors, continuing..."

echo "==> Running Django migrations (fake-initial for pre-existing tables)..."
python manage.py migrate_schemas --shared --fake-initial --noinput 2>&1 \
  || python manage.py migrate_schemas --shared --noinput 2>&1 \
  || echo "WARNING: Migrations had errors — database may already be in sync, continuing..."

echo "==> Starting production server on port 3000..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:3000 \
  --workers 3 \
  --timeout 120
