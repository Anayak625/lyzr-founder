#!/bin/bash
echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Starting Celery worker..."
celery -A lyzr_backend.celery worker -l info --pool=threads &

echo "Starting Daphne server (in foreground)..."
exec daphne -b 0.0.0.0 -p 8000 lyzr_backend.asgi:application
