#!/usr/bin/env bash
set -e

WORKSPACE="$(cd "$(dirname "$0")" && pwd)"
cd "$WORKSPACE/sms_backend"

echo "==> Faking Django migrations (tables already exist from dev schema)..."
python manage.py migrate_schemas --shared --fake --noinput 2>&1 || true

echo "==> Registering production domain..."
python manage.py shell << 'PYEOF'
import os
try:
    from clients.models import Tenant, Domain

    try:
        public_tenant = Tenant.objects.get(schema_name="public")
        print("[domain] Public tenant found.")
    except Tenant.DoesNotExist:
        public_tenant = Tenant(schema_name="public", name="Platform Public")
        try:
            public_tenant.save()
            print("[domain] Created public tenant.")
        except Exception as e:
            print(f"[domain] Warning creating public tenant: {e}")
            public_tenant = None

    if public_tenant:
        for raw in os.environ.get("REPLIT_DOMAINS", "").split(","):
            domain_name = raw.strip()
            if not domain_name:
                continue
            obj, created = Domain.objects.get_or_create(
                domain=domain_name,
                defaults={"tenant": public_tenant, "is_primary": True},
            )
            print(f"[domain] {'Registered' if created else 'Already registered'}: {domain_name}")
except Exception as exc:
    print(f"[domain] WARNING: {exc}")
PYEOF

echo "==> Starting gunicorn on port 3000..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:3000 \
  --workers 3 \
  --timeout 120
