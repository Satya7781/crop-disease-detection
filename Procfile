web: python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn smart_crop.wsgi:application --bind 0.0.0.0:$PORT
