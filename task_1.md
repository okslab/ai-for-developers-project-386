# Инкремент 1 — идентификация запущенной ревизии

## Предпосылка

Инкремент 0 слит в `main`. Технической зависимости от календаря здесь нет, но задача
выполняется следующей, чтобы сохранить последовательную историю. Этот инкремент создаёт
машиночитаемый способ определить, какой commit реально запущен в контейнере.

## Проблема

3 сентября 2026 года публичный Railway URL возвращал JSON по старому `/event-types`, но
возвращал HTML SPA по актуальному `/api/event-types`. При этом `origin/main` уже содержал
единый `/api` prefix. По главной странице и HTTP 200 нельзя понять, что production устарел.

Текущий Railway healthcheck `/api/openapi.json` проверяет жизнеспособность API, но не
сопоставляет контейнер с ожидаемым Git SHA.

## Цель

Добавить контрактный read-only endpoint, который подтверждает готовность приложения и
возвращает идентификатор исходной ревизии контейнера.

## Контракт

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

Добавить отдельную системную operation/tag, а не относить endpoint к Guest или Owner.
Поле `revision` обязательно; локальный запуск без injected SHA возвращает явное
`"unknown"`, а не падает. Не раскрывать environment, hostname, токены или полный набор
переменных процесса.

После изменения:

- регенерировать `contract/openapi/openapi.yaml`;
- регенерировать `frontend/src/api/generated/schema.d.ts`;
- не добавлять health-вызов в пользовательский UI.

## Backend и контейнер

1. Добавить минимальный router/module для health endpoint и подключить его под `API_PREFIX`.
2. Читать ревизию из одной документированной переменной, например `APP_REVISION`.
3. В `Dockerfile` принять Git SHA как build argument и перенести его в runtime
   `APP_REVISION`. Для Railway использовать предоставляемую платформой Git commit variable;
   перед реализацией сверить актуальное имя с документацией Railway.
4. Локальная сборка без аргумента должна оставаться валидной и возвращать `unknown`.
5. В production-container CI передавать текущий commit SHA при `docker build`, после запуска
   сравнивать `/api/health.revision` с ожидаемым SHA.
6. Перевести `railway.json` healthcheck с `/api/openapi.json` на `/api/health` только после
   того, как endpoint покрыт тестами и реально доступен в production image.

## Тесты

Backend API tests:

- `GET /api/health` возвращает 200 и структурированный JSON;
- значение берётся из подменённого `APP_REVISION`;
- отсутствие переменной даёт `unknown`;
- OpenAPI содержит `/api/health` и схему ответа.

Production-container smoke:

- image собирается с тестовым/текущим SHA;
- endpoint отвечает JSON, а не SPA HTML;
- revision точно совпадает с переданным значением.

Contract checks должны подтвердить отсутствие предупреждений, а frontend codegen не должен
оставлять незакоммиченный diff.

## Проверка

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
docker build --build-arg APP_REVISION=local-test-sha -t appointment-booking:health .
docker run --rm -e PORT=8080 -p 127.0.0.1:8080:8080 appointment-booking:health
```

Последнюю команду запускать в отдельном терминале и проверить
`http://127.0.0.1:8080/api/health`. Точное имя build argument должно совпадать с выбранной
реализацией и CI.

## Критерии приёмки

- endpoint описан в TypeSpec и сгенерированном OpenAPI;
- локальный и production-контейнер возвращают одинаковую структуру;
- production image сообщает injected revision;
- health endpoint не содержит чувствительных данных;
- Railway healthcheck использует endpoint готовности;
- все существующие CI-проверки проходят.

## Ветка и коммит

- рекомендуемая ветка: `codex/expose-deployment-revision`;
- рекомендуемый коммит: `feat(api): expose deployment revision health check`.
