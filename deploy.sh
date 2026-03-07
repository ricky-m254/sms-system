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

echo "==> Faking all Django migrations (tables already exist from dev schema copy)..."
python manage.py migrate_schemas --shared --fake --noinput 2>&1 \
  || echo "WARNING: migrate --fake had errors, continuing..."

echo "==> Ensuring public tenant and production domains are registered..."
python manage.py shell << 'PYEOF'
import os
from django.conf import settings

try:
    from clients.models import Tenant, Domain

    # Ensure the public tenant record exists
    public_tenant, created = Tenant.objects.get_or_create(
        schema_name="public",
        defaults={"name": "Platform Public"},
    )
    if created:
        print(f"Created public tenant record.")
    else:
        print(f"Public tenant already exists.")

    # Register every Replit domain as a public-schema domain
    replit_domains = os.environ.get("REPLIT_DOMAINS", "")
    for raw in replit_domains.split(","):
        domain_name = raw.strip()
        if not domain_name:
            continue
        obj, created = Domain.objects.get_or_create(
            domain=domain_name,
            defaults={"tenant": public_tenant, "is_primary": True},
        )
        action = "Registered" if created else "Already registered"
        print(f"{action} domain: {domain_name}")

except Exception as exc:
    print(f"WARNING: domain setup failed: {exc}")
PYEOF

echo "==> Starting production server on port 3000..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:3000 \
  --workers 3 \
  --timeout 120
