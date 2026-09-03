# Инкремент 1 — гарантия актуального Railway-деплоя

## Предпосылка

Инкремент 0 слит в `main`. Технической зависимости от календаря здесь нет, но задача
выполняется следующей, чтобы сохранить последовательную историю.

## Проблема

3 сентября 2026 года публичный Railway URL возвращал JSON по старому `/event-types`, но
возвращал HTML SPA по актуальному `/api/event-types`. При этом `origin/main` уже содержал
единый `/api` prefix. Главная страница продолжала отвечать 200, поэтому обычная проверка
доступности не обнаруживала stale deployment.

Текущий Railway healthcheck `/api/openapi.json` подтверждает, что какой-то API работает,
но не позволяет сопоставить запущенный контейнер с ожидаемым Git SHA. Для надёжной проверки
нужны обе части в одном инкременте:

1. приложение сообщает исходную ревизию;
2. внешний read-only smoke ожидает конкретную ревизию `main` и проверяет маршрутизацию.

## Цель

После merge и Railway deploy автоматически доказать, что публичный URL:

- доступен;
- обслуживает актуальную схему `/api` routes;
- запущен из ожидаемого commit ветки `main`;
- корректно разделяет JSON API и SPA fallback.

Инкремент должен быть сквозным: endpoint без потребляющей его проверки и проверка без
идентификатора ревизии не считаются завершённым результатом.

## Часть 1 — контрактный health endpoint

Контракт является источником истины, поэтому сначала изменить TypeSpec. Рекомендуемый
маршрут:

```http
GET /api/health
200 application/json
{
  "status": "ok",
  "revision": "<git-sha-or-unknown>"
}
```

Требования:

- добавить отдельную системную operation/tag, не относя endpoint к Guest или Owner;
- сделать `revision` обязательной строкой;
- локальный запуск без injected SHA возвращает явное `"unknown"`, а не падает;
- не возвращать environment, hostname, токены, connection strings или полный набор
  переменных процесса;
- после TypeSpec регенерировать `contract/openapi/openapi.yaml` и
  `frontend/src/api/generated/schema.d.ts`;
- не добавлять health-вызов в пользовательский интерфейс.

## Часть 2 — backend и идентификатор контейнера

1. Добавить минимальный router/module для health endpoint и подключить его под
   существующий `API_PREFIX`.
2. Читать ревизию из одной документированной runtime-переменной, например
   `APP_REVISION`.
3. В `Dockerfile` принять Git SHA как build argument и перенести его в runtime
   `APP_REVISION`. Для Railway использовать предоставляемую платформой Git commit
   variable; перед реализацией проверить её актуальное имя по документации Railway.
4. Локальная сборка без аргумента остаётся валидной и возвращает `unknown`.
5. В production-container CI передавать текущий SHA при `docker build` и после запуска
   сравнивать `/api/health.revision` с ожидаемым значением.
6. Перевести `railway.json` healthcheck с `/api/openapi.json` на `/api/health` только после
   появления покрытого тестами endpoint.

## Часть 3 — read-only public smoke

Создать отдельный скрипт, например `e2e/scripts/public-production-smoke.mjs`. Не запускать
текущий `production-smoke.mjs` напрямую против Railway: он выполняет `POST` и создаёт
данные, что неприемлемо для регулярной публичной проверки.

Интерфейс нового скрипта:

```text
node e2e/scripts/public-production-smoke.mjs <base-url> [expected-revision]
```

Минимальные проверки:

1. `GET /` → 200, `text/html`, присутствует React root;
2. `GET /api/health` → 200 JSON, `status=ok`;
3. при переданном expected revision — точное совпадение `revision`;
4. `GET /api/openapi.json` → JSON с актуальными `/api/...` paths;
5. `GET /api/event-types` → JSON-массив;
6. `GET /event-types/nonexistent-deployment-smoke` → HTML SPA, а не backend JSON;
7. заведомо отсутствующий `/api/...` → JSON/404, но не HTML index.

Скрипт не выполняет POST/PUT/PATCH/DELETE и не зависит от конкретных event types. Railway
использует in-memory store, состояние которого меняется при restart и ручных проверках.

## Часть 4 — GitHub Actions

Добавить отдельный workflow, не изменяя Hexlet-файлы. Предусмотреть:

- `workflow_dispatch` с необязательными `base_url` и `expected_revision` для ручной
  диагностики;
- запуск после push в `main` с ожиданием `${{ github.sha }}`;
- периодический `schedule` для контроля доступности и drift основной ветки;
- repository variable `PRODUCTION_BASE_URL` и документированный fallback на URL из
  `README.md`, чтобы workflow работал до настройки variable;
- общий timeout, например 10 минут;
- ограниченный polling, потому что GitHub push и Railway deploy стартуют асинхронно;
- ожидание именно нужной revision, а не первого HTTP 200;
- короткую диагностику последнего ответа после timeout;
- `concurrency`, если она нужна для отмены устаревшей проверки при следующем push.

Мгновенный mismatch со старым SHA не является окончательной ошибкой: workflow должен дать
Railway время завершить deploy. По истечении общего timeout mismatch становится ошибкой.

## Тесты

### Backend API tests

- `GET /api/health` возвращает 200 и ожидаемую структуру;
- значение читается из подменённого `APP_REVISION`;
- отсутствие переменной даёт `unknown`;
- OpenAPI содержит `/api/health` и схему ответа.

### Production-container smoke

- image собирается с тестовым SHA;
- `/api/health` отвечает JSON, а не SPA HTML;
- revision точно совпадает с переданным значением;
- существующие проверки создания типа встречи и SPA deep link остаются зелёными.

### Public smoke

- проходит против локального production-контейнера с правильным SHA;
- завершается ненулевым кодом при неверном expected revision;
- завершается ненулевым кодом, если API route возвращает HTML;
- не изменяет состояние приложения.

## Документация и внешняя настройка

Обновить `README.md` или добавить небольшой deployment runbook:

- где задаётся `PRODUCTION_BASE_URL`;
- что Railway должен следить за веткой `main` и собирать корневой `Dockerfile`;
- откуда контейнер получает revision;
- как вручную запустить public smoke workflow;
- как интерпретировать mismatch revision;
- почему HTTP 200 главной страницы недостаточно для проверки API.

Во время выполнения проверить настройки Railway и запустить redeploy актуального `main`,
если production всё ещё обслуживает legacy routes. Это внешняя операция: выполняющая сессия
должна получить явную авторизацию пользователя непосредственно перед redeploy. Не коммитить
platform tokens, project IDs с секретами или локальные CLI credentials.

## Локальная проверка

```bash
cd contract
npm ci
npm run check
npm run build

cd ../frontend
npm ci
npm run codegen
npm run build

cd ../backend
.venv/bin/pip install -r requirements-test.txt
.venv/bin/python -m unittest discover -s tests -v

cd ..
docker build --build-arg APP_REVISION=local-public-smoke \
  -t appointment-booking:public-smoke .
docker run --name appointment-booking-public-smoke \
  -e PORT=8080 -p 127.0.0.1:8080:8080 appointment-booking:public-smoke
node e2e/scripts/public-production-smoke.mjs \
  http://127.0.0.1:8080 local-public-smoke
docker stop appointment-booking-public-smoke
docker rm appointment-booking-public-smoke
```

Команды адаптировать к точному имени build argument, выбранному в реализации. Контейнер
останавливать и удалять также при падении smoke, чтобы локальные повторы оставались чистыми.

## Критерии приёмки

- `/api/health` описан в TypeSpec и сгенерированном OpenAPI;
- production image сообщает injected Git SHA без раскрытия чувствительных данных;
- Railway healthcheck использует новый endpoint;
- публичный smoke полностью read-only;
- smoke обнаруживает HTML вместо JSON и stale revision;
- workflow корректно ждёт асинхронный deploy и имеет конечный timeout;
- ручной запуск и диагностика документированы;
- после merge публичный URL сообщает SHA соответствующего `main` commit;
- `api-tests`, `e2e`, contract checks и оба `production-container` проходят.

## Границы задачи

Не менять календарную UI-логику, доступность слотов, booking window или occupancy rules.
Не добавлять полноценную систему мониторинга, уведомления сторонним сервисам или хранение
истории deploy — достаточно GitHub Actions и диагностируемого endpoint.

## Ветка и коммит

- рекомендуемая ветка: `codex/verify-public-deployment`;
- рекомендуемый коммит: `ci: verify the deployed main revision`.
