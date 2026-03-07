#!/usr/bin/env bash
set -e

echo "Starting Backend API on localhost:8000..."
cd sms_backend && python manage.py runserver localhost:8000 &
BACKEND_PID=$!

echo "Starting Frontend on 0.0.0.0:5000..."
cd sms_frontend && npm run dev &
FRONTEND_PID=$!

echo "Both services running. Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
