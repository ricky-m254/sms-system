# Demo Seed Command

Seeds a demo tenant with sample data for frontend development.

## Command
```
python manage.py seed_demo
```

## Options
- `--schema_name` (default: `demo_school`)
- `--name` (default: `Demo School`)
- `--domain` (default: `demo.localhost`)
- `--admin_user` (default: `admin`)
- `--admin_pass` (default: `admin123`)
- `--admin_email` (default: `admin@demo.localhost`)

## What Gets Seeded
- Tenant + domain (public schema)
- Roles + modules
- Tenant super admin user
- Academics (year, term, class)
- Students + guardians + enrollments
- HR staff
- Finance (fee, invoice, payment, allocation, expense)
- Communication message
- Audit log record
