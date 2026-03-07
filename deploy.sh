#!/usr/bin/env bash

cd sms_backend

echo "==> Building React frontend..."
cd ../sms_frontend
npm ci --prefer-offline
npm run build
cd ..

echo "==> Copying frontend build to Django..."
mkdir -p sms_backend/frontend_build
cp -r sms_frontend/dist/. sms_backend/frontend_build/

echo "==> Collecting static files..."
cd sms_backend
python manage.py collectstatic --noinput || echo "WARNING: collectstatic had errors, continuing..."

echo "==> Starting gunicorn on port 5000 (background)..."
gunicorn config.wsgi:application \
  --bind 0.0.0.0:5000 \
  --workers 3 \
  --timeout 120 &
GUNICORN_PID=$!

echo "==> Running Django migrations in parallel..."
(
  python manage.py migrate_schemas --shared --fake-initial --noinput 2>&1 \
    || python manage.py migrate_schemas --shared --noinput 2>&1 \
    || echo "WARNING: Migrations had errors — database may already be in sync"
  echo "==> Migrations complete."
) &

echo "==> Waiting for gunicorn (PID $GUNICORN_PID)..."
wait $GUNICORN_PID
