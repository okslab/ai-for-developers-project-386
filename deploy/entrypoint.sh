#!/usr/bin/env bash
set -Eeuo pipefail

: "${PORT:=8000}"
: "${APP_PORT:=8001}"

envsubst '${PORT} ${APP_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "nginx -t:"
nginx -t

echo "starting uvicorn on 127.0.0.1:${APP_PORT}..."
uvicorn app.main:app --host 127.0.0.1 --port "${APP_PORT}" &
uvicorn_pid=$!

echo "starting nginx on PORT=${PORT}..."
nginx -g 'daemon off;' &
nginx_pid=$!

shutdown_requested=0

shutdown() {
    shutdown_requested=1
    trap - TERM INT
    kill -TERM "${nginx_pid}" "${uvicorn_pid}" 2>/dev/null || true
}

trap shutdown TERM INT

set +e
wait -n "${uvicorn_pid}" "${nginx_pid}"
first_status=$?
set -e

was_shutdown_requested=${shutdown_requested}
shutdown

set +e
wait "${nginx_pid}"
nginx_status=$?
wait "${uvicorn_pid}"
uvicorn_status=$?
set -e

if (( was_shutdown_requested == 1 )); then
    exit 0
fi

echo "a managed process exited unexpectedly (nginx=${nginx_status}, uvicorn=${uvicorn_status})" >&2
if (( first_status == 0 )); then
    exit 1
fi
exit "${first_status}"
