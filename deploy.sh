#!/usr/bin/env bash

WORKSPACE="$(cd "$(dirname "$0")" && pwd)"

# ── 1. Start gunicorn immediately so port 3000 opens right away ──────────────
# HealthCheckMiddleware handles / and /health before any DB/tenant logic runs,
# so the health probe returns 200 even before the frontend build is ready.
echo "==> Starting gunicorn on port 3000..."
cd "$WORKSPACE/sms_backend"
gunicorn config.wsgi:application \
  --bind 0.0.0.0:3000 \
  --workers 3 \
  --timeout 120 &
GUNICORN_PID=$!

# ── 2. Run all setup tasks in the background ─────────────────────────────────
(
  cd "$WORKSPACE"

  echo "[setup] Building React frontend..."
  cd sms_frontend
  npm ci --prefer-offline 2>&1
  npm run build 2>&1
  cd "$WORKSPACE"

  echo "[setup] Copying frontend build to Django..."
  mkdir -p sms_backend/frontend_build
  cp -r sms_frontend/dist/. sms_backend/frontend_build/

  cd "$WORKSPACE/sms_backend"

  echo "[setup] Collecting static files..."
  python manage.py collectstatic --noinput 2>&1 || true

  echo "[setup] Faking all migrations (tables already exist)..."
  python manage.py migrate_schemas --shared --fake --noinput 2>&1 || true

  echo "[setup] Registering production domain in database..."
  python manage.py shell << 'PYEOF'
import os
try:
    from clients.models import Tenant, Domain

    # Ensure the public tenant record exists
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

  echo "[setup] All background setup complete."
) &

# ── 3. Keep the container alive until gunicorn exits ─────────────────────────
echo "==> Waiting for gunicorn (PID $GUNICORN_PID)..."
wait $GUNICORN_PID
