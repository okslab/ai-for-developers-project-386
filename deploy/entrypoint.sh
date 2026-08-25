#!/bin/sh
set -e

envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "nginx -t:"
nginx -t

uvicorn app.main:app --host 127.0.0.1 --port 8080 &

echo "starting nginx on PORT=${PORT}..."
exec nginx -g 'daemon off;'
