#!/bin/bash
echo "Applying database migrations..."
python manage.py migrate --noinput
echo "Starting Daphne server..."
daphne -b 0.0.0.0 -p 8000 lyzr_backend.asgi:application &

echo "Starting Celery worker..."
celery -A lyzr_backend.celery worker -l info --pool=threads &

wait
