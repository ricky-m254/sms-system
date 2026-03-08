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

cd "$WORKSPACE/sms_backend"

echo "==> [build] Collecting Django static files..."
python manage.py collectstatic --noinput

echo "==> [build] Faking shared migrations (tables already exist)..."
python manage.py migrate_schemas --shared --fake --noinput 2>&1 || true

echo "==> [build] Seeding demo school (idempotent — safe to re-run)..."
python manage.py seed_demo \
  --schema_name demo_school \
  --name "Demo School" \
  --domain "demo.localhost" \
  --admin_user admin \
  --admin_pass admin123 \
  --admin_email admin@demo.school 2>&1 || true

echo "==> [build] Registering production domain..."
python manage.py shell << 'PYEOF'
import os
try:
    from django.db import connection
    from clients.models import Tenant, Domain

    # Ensure the public tenant record exists — use raw SQL to bypass
    # auto_create_schema (the 'public' PostgreSQL schema already exists)
    # and to supply all NOT NULL columns that the model requires.
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO clients_tenant
                (schema_name, name, is_active, paid_until, created_at, updated_at,
                 contact_email, contact_name, contact_phone,
                 status, suspension_reason, max_storage_gb, max_students)
            VALUES
                ('public', 'Platform Public', true, '2099-01-01', NOW(), NOW(),
                 '', '', '',
                 'TRIAL', '', 100, 10000)
            ON CONFLICT (schema_name) DO NOTHING
        """)
        print(f"[domain] Public tenant insert (rows affected: {cursor.rowcount})")

    public_tenant = Tenant.objects.get(schema_name="public")
    print(f"[domain] Public tenant id={public_tenant.id}")

    replit_domains = os.environ.get("REPLIT_DOMAINS", "")
    print(f"[domain] REPLIT_DOMAINS='{replit_domains}'")
    for raw in replit_domains.split(","):
        domain_name = raw.strip()
        if not domain_name:
            continue
        obj, created = Domain.objects.get_or_create(
            domain=domain_name,
            defaults={"tenant": public_tenant, "is_primary": True},
        )
        print(f"[domain] {'Registered' if created else 'Already registered'}: {domain_name}")
except Exception as exc:
    import traceback
    print(f"[domain] WARNING: {exc}")
    traceback.print_exc()
PYEOF

echo "==> [build] Done."
