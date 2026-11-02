# Smart Crop

Smart Crop is a Django application that classifies plant leaf images with a
TensorFlow Lite model. It includes a REST API, browser frontend, user
registration/login, and per-user prediction history.

## Architecture

- Django and Django REST Framework provide the backend and API.
- PostgreSQL stores users, uploaded image records, and predictions.
- Supabase PostgreSQL or Railway PostgreSQL can be used as the database.
- Uploaded files are stored locally in `media/`.
- `ml_model/plant_disease_model.tflite` performs inference.
- `Frontend/` contains the static browser application.

## Local setup

Use Python 3.10 or 3.11 because the pinned TensorFlow version supports those
versions most reliably.

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create a PostgreSQL database named `smart_crop`, then create a `.env` file in
the repository root:

```env
SECRET_KEY=replace-this-with-a-long-random-value
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

# Use either DATABASE_URL or the individual PostgreSQL variables.
DATABASE_URL=postgresql://postgres:password@localhost:5432/smart_crop

# Optional during local development. Leave blank if Google login is unused.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

CORS_ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
CSRF_TRUSTED_ORIGINS=
```

Apply migrations and create an administrator:

```powershell
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The backend runs at `http://127.0.0.1:8000`.

The deployment health endpoint is `http://127.0.0.1:8000/health/`.

To run the static frontend in a second terminal:

```powershell
cd Frontend
python -m http.server 5500
```

Open `http://127.0.0.1:5500/index.html`. The frontend uses
`http://127.0.0.1:8000` by default. To use another backend, define
`window.SMART_CROP_API_URL` before `script.js` loads.

## API

All image endpoints require the JWT access token returned by login.

| Method | URL | Purpose |
|---|---|---|
| POST | `/api/auth/register/` | Register a user |
| POST | `/api/auth/login/` | Obtain access and refresh tokens |
| POST | `/api/auth/refresh/` | Refresh an access token |
| POST | `/detection/api/predict/` | Upload an image and run prediction |
| GET | `/detection/api/images/` | List the current user's images |
| GET/PATCH/DELETE | `/detection/api/images/<id>/` | Manage one owned image |

Prediction requests use multipart form data with a file field named `image`.

## Supabase or Railway deployment

Create a PostgreSQL database in Supabase or Railway and copy its connection
string into `DATABASE_URL`. Do not commit the `.env` file.

Configure these production variables in the backend service:

```env
SECRET_KEY=<strong-random-secret>
DEBUG=False
ALLOWED_HOSTS=<backend-domain>
DATABASE_URL=<supabase-or-railway-postgresql-url>
CORS_ALLOWED_ORIGINS=https://<frontend-domain>
CSRF_TRUSTED_ORIGINS=https://<frontend-domain>
```

The repository includes `render.yaml` as a Render service blueprint. Replace
the placeholder frontend API URL in `Frontend/script.js` with the actual
Render service URL after creating the service.

### Render checklist

1. Push the repository to GitHub and create a Render **Blueprint** from it.
2. Set `DATABASE_URL` to a Supabase, Railway, or Render PostgreSQL URL.
3. Set `ALLOWED_HOSTS` to the Render hostname, without `https://`.
4. Set `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to the deployed
   frontend origin, without a trailing slash.
5. Confirm the service health check returns `{"status": "ok"}` at `/health/`.
6. Create an administrator from the Render Shell with
   `python manage.py createsuperuser`.
7. Test registration, login, and prediction before sharing the application.

The current upload backend uses local `media/` storage. Render web services
have ephemeral storage, so uploaded images can be lost after a redeploy.
Use a Render Persistent Disk or integrate Supabase Storage before treating
uploaded images as permanent production data.

Deploy the backend using:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn smart_crop.wsgi:application
```

The backend service must expose port `8000` or use the platform-provided
`PORT` variable. For Railway, use:

```bash
gunicorn smart_crop.wsgi:application --bind 0.0.0.0:$PORT
```

For platforms that do not provide `$PORT`, use:

```bash
gunicorn smart_crop.wsgi:application --bind 0.0.0.0:8000
```

The included GitHub Actions workflow can deploy `Frontend/` to GitHub Pages.
Before deploying it, set the API URL in the frontend to the public backend
domain and add that domain to `CORS_ALLOWED_ORIGINS`.

## Training a new model

Training code is in `ml_model_training/train_model.py`. The PlantVillage
dataset is required for training and should not be included in the production
runtime. After training, use `convert_to_tflite.py` and place the generated
model at `ml_model/plant_disease_model.tflite`.
