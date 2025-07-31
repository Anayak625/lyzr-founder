#!/bin/bash
echo "Applying database migrations..."
python manage.py migrate --noinput
echo "Starting Daphne server..."
daphne -b 0.0.0.0 -p 8000 greaby_project.asgi:application &

echo "Starting Celery worker..."
celery -A greaby_project worker -l info --pool=threads &

wait
