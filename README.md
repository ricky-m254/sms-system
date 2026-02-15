# SMS System

School Management System with a Django multi-tenant backend and a React (Vite) frontend.

## Structure

sms/
+-- sms_backend/
+-- sms_frontend/
+-- README.md
+-- .gitignore

## Prereqs

- Python 3.11+
- Node.js 18+
- PostgreSQL
- Pillow (for image uploads)

## Backend (sms_backend)

1) Create venv and install deps

python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

2) Configure env

Copy `.env.example` to `.env` and set values.
Note: current `sms_backend/config/settings.py` uses hardcoded values; wire env when ready.

3) Run

python manage.py migrate
python manage.py runserver

Media uploads are served at `/media/` in development (configured in settings + urls).

## Frontend (sms_frontend)

1) Install deps

npm install

2) Configure env

Copy `.env.example` to `.env` and set values.

3) Run

npm run dev

## Local tenancy

The backend expects tenant domains like `demo.localhost`.
Add entries to your hosts file if needed.

## Notes

- Do not commit `.env` files.
- `node_modules/`, `dist/`, `build/` are ignored by git.
