#!/usr/bin/env bash
set -e

WORKSPACE="$(cd "$(dirname "$0")" && pwd)"

echo "==> [build] Installing and building React frontend..."
cd "$WORKSPACE/sms_frontend"
npm ci
npm run build

echo "==> [build] Copying frontend build to Django..."
cd "$WORKSPACE"
mkdir -p sms_backend/frontend_build
cp -r sms_frontend/dist/. sms_backend/frontend_build/

echo "==> [build] Collecting Django static files..."
cd "$WORKSPACE/sms_backend"
python manage.py collectstatic --noinput

echo "==> [build] Done."
