# Stage 1: build the frontend SPA
FROM node:24.18.0 AS frontend

WORKDIR /app

COPY frontend/.npmrc frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN VITE_API_BASE_URL=/ npm run build

# Stage 2: runtime — nginx serves the SPA and proxies API paths to uvicorn
FROM python:3.12.11-slim AS runtime

ARG RAILWAY_GIT_COMMIT_SHA=unknown

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    APP_PORT=8001 \
    APP_REVISION=${RAILWAY_GIT_COMMIT_SHA}

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash nginx gettext-base tini \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

COPY --from=frontend /app/dist /usr/share/nginx/html

COPY deploy/nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/entrypoint.sh"]
