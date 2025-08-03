set -e

echo "Applying database migrations..."
python manage.py migrate --noinput

# while the service was down.
echo "Cleaning up old Celery Beat schedule..."
rm -f celerybeat-schedule

echo "Starting Celery worker in the background..."
celery -A lyzr_backend.celery worker -l info --pool=threads &

echo "Starting Celery Beat scheduler in the background..."
celery -A lyzr_backend.celery beat -l info &

echo "Starting Daphne server (in foreground)..."
exec daphne -b 0.0.0.0 -p 8000 lyzr_backend.asgi:application