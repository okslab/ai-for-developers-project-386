# Инкремент 2 — проверка публичного Railway-деплоя

## Предпосылка

Инкремент 1 слит и развёрнут хотя бы один раз. Публичный `/api/health` возвращает Git SHA.
Без этого нельзя надёжно отличить актуальный deploy от старого исправного контейнера.

## Цель

Добавить read-only smoke-проверку публичного приложения, которая обнаруживает:

- недоступный Railway deployment;
- старую схему маршрутов без `/api` prefix;
- SPA HTML вместо JSON на API-маршруте;
- контейнер, собранный не из ожидаемого commit `main`;
- сломанную SPA fallback-навигацию.

## Smoke script

Создать отдельный скрипт, например `e2e/scripts/public-production-smoke.mjs`. Не использовать
текущий `production-smoke.mjs` без переработки: он выполняет `POST` и создаёт данные, что
неприемлемо для регулярной проверки публичного in-memory приложения.

Скрипт принимает:

```text
node e2e/scripts/public-production-smoke.mjs <base-url> [expected-revision]
```

Минимальные read-only проверки:

1. `GET /` → 200, `text/html`, присутствует React root;
2. `GET /api/health` → 200 JSON, `status=ok`;
3. при переданном expected revision — точное совпадение `revision`;
4. `GET /api/openapi.json` → JSON, содержит актуальные `/api/...` paths;
5. `GET /api/event-types` → JSON-массив;
6. `GET /event-types/nonexistent-deployment-smoke` → HTML SPA, а не backend JSON;
7. запрос заведомо отсутствующего `/api/...` → JSON-ошибка/404, но не HTML index.

Не выполнять POST/PUT/PATCH/DELETE и не полагаться на наличие конкретного event type:
Railway использует in-memory store, состояние которого меняется при restart и ручных тестах.

## GitHub Actions

Добавить отдельный workflow, не изменяя Hexlet-файлы. Рекомендуемые запуски:

- `workflow_dispatch` с необязательными inputs `base_url` и `expected_revision` для ручной
  диагностики;
- после push в `main` — проверка ожидаемого `${{ github.sha }}` с ограниченным polling,
  поскольку Railway разворачивает контейнер асинхронно;
- периодический `schedule` как мониторинг доступности и drift основной ветки.

Публичный URL брать из repository variable `PRODUCTION_BASE_URL`; допустим документированный
fallback на URL из `README.md`, чтобы workflow работал до настройки variable. Не использовать
secrets для публичного URL.

Polling должен:

- иметь общий timeout, например 10 минут;
- ждать именно нужную revision, а не просто HTTP 200;
- печатать короткую диагностику последнего ответа;
- завершаться ошибкой после timeout;
- не создавать параллельный бесконечный workflow (использовать `timeout-minutes` и при
  необходимости `concurrency`).

Учитывать, что push в `main` и Railway webhook могут стартовать одновременно. Мгновенная
ошибка при виде предыдущего SHA будет ложным падением, поэтому требуется ожидание.

## Документация

Обновить `README.md` или добавить небольшой deployment runbook:

- где задаётся `PRODUCTION_BASE_URL`;
- что Railway должен следить за веткой `main` и собирать корневой `Dockerfile`;
- как вручную запустить public smoke workflow;
- как интерпретировать mismatch revision;
- как безопасно выполнить redeploy ожидаемого commit без изменения данных в GitHub;
- почему HTTP 200 главной страницы недостаточно для проверки API.

Во время выполнения этого инкремента проверить настройки Railway и запустить redeploy
актуального `main`, если production всё ещё обслуживает legacy routes. Это внешняя операция,
поэтому перед ней требуется явная авторизация пользователя в выполняющей сессии. В репозиторий
не коммитить platform tokens, project IDs с секретами или локальные CLI credentials.

## Локальные тесты

Скрипт должен тестироваться против локального production-контейнера из инкремента 1:

```bash
docker build --build-arg APP_REVISION=local-public-smoke -t appointment-booking:public-smoke .
docker run --name appointment-booking-public-smoke \
  -e PORT=8080 -p 127.0.0.1:8080:8080 appointment-booking:public-smoke
node e2e/scripts/public-production-smoke.mjs \
  http://127.0.0.1:8080 local-public-smoke
docker stop appointment-booking-public-smoke
docker rm appointment-booking-public-smoke
```

Также проверить негативный случай: неверный expected revision обязан завершать скрипт
ненулевым кодом. Команды адаптировать к точному имени build argument из инкремента 1.

## Критерии приёмки

- публичная проверка полностью read-only;
- она обнаруживает HTML вместо JSON на API routes;
- она обнаруживает stale revision даже при полностью рабочей главной странице;
- workflow корректно ждёт асинхронный Railway deploy и имеет конечный timeout;
- ручной и автоматический способы запуска документированы;
- после merge публичный URL сообщает SHA соответствующего `main` commit;
- обычные `api-tests`, `e2e` и `production-container` остаются зелёными.

## Ветка и коммит

- рекомендуемая ветка: `codex/verify-public-deployment`;
- рекомендуемый коммит: `ci: verify the public production deployment`.
