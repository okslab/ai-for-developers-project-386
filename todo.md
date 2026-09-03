# Incremental remediation plan

Цель: устранить production- и API-дефекты небольшими атомарными изменениями так,
чтобы каждый опубликованный инкремент проходил проверки и мог быть независимо
откачен.

## Правила выполнения

- Каждый инкремент начинается от актуального `main` в отдельной feature-ветке;
  `dev` больше не используется ни как основание, ни как целевая ветка.
- Изменения интегрируются только через pull request с base `main`; прямые коммиты
  и push в `main` запрещены.
- Один инкремент оформляется отдельным PR или squash-коммитом в формате
  Conventional Commits.
- Регрессионный тест для существующего дефекта коммитится вместе с исправлением,
  чтобы в истории не появлялась заведомо нерабочая версия.
- Если меняется API, TypeSpec редактируется первым, но контракт, сгенерированные
  артефакты, backend и frontend публикуются одним атомарным изменением.
- Обновления зависимостей не смешиваются с изменениями бизнес-логики.
- После каждого инкремента проверяются TypeSpec, generated artifacts, backend,
  frontend, локальный E2E-прогон Vite + Uvicorn и, после его появления,
  production-container job.

## Инкремент 0 — исходная точка

- **Статус:** завершён 2026-09-02; production-container baseline заблокирован
  выключенным Docker daemon, ограничение зафиксировано.
- [x] Зафиксировать текущую ветку и состояние worktree.
- [x] Выполнить `contract`: `npm ci`, `npm run check`, `npm run build`.
- [x] Убедиться, что генерация OpenAPI не оставила незапланированный diff.
- [x] Выполнить `frontend`: `npm ci`, `npm run build`.
- [x] Установить backend-зависимости в локальное venv.
- [x] Выполнить четыре существующих Playwright-сценария.
- [x] Проверить доступность Docker daemon для production baseline.
- [x] Проверить актуальные результаты GitHub Actions для текущего HEAD.
- [x] Зафиксировать результаты baseline ниже.

### Текущее состояние baseline

- Ветка на момент начала проверки: `main`, синхронизирована с `origin/main`.
- До начала работы присутствовал только пользовательский untracked-файл
  `opencode.jsonc`; он не относится к проекту и не изменяется.
- `contract/node_modules`, `frontend/node_modules`, `e2e/node_modules` и
  `backend/.venv` отсутствовали; зависимости установлены только как локальное
  тестовое окружение и игнорируются Git.
- Docker CLI доступен (`24.0.6`), но Docker daemon не запущен, поэтому локальный
  production-container baseline пока недоступен.
- Локальный `python3` указывал на неподдерживаемый Python 3.9.19; backend venv
  был явно создан на Python 3.12.11.
- Из-за плавающего `requirements.txt` Python 3.12 разрешил FastAPI 0.141.1,
  Uvicorn 0.52.4 и Pydantic 2.13.5. Ошибочный первый venv на Python 3.9 успел
  разрешить другие версии, в частности FastAPI 0.128.8 и Uvicorn 0.39.0, что
  подтверждает проблему воспроизводимости зависимостей.
- Локальный Node.js: 26.8.1; npm: 11.19.0. TypeSpec установлен в версии 1.15.0,
  Prism — 5.16.0, Vite — 8.2.2.
- `npm ci` frontend сообщил о 7 известных уязвимостях (6 moderate, 1 high) и
  нескольких deprecated-пакетах. Автоматический `npm audit fix --force` не
  выполнялся, чтобы не вносить несогласованные изменения зависимостей.
- `npm run check` и `npm run build` в `contract` прошли; генерация не изменила
  `contract/openapi/openapi.yaml`.
- `npm run build` во `frontend` прошёл; generated frontend types не изменились.
- Playwright: S1, S2, S3 и S4 прошли, итог `4 passed (6.5s)`.
- Для HEAD `16c70ed` последние удалённые `hexlet-check`, `e2e` и
  `release-please` завершились успешно.

## Инкремент 1 — конфликт между разными типами

**Коммит:** `test(e2e): cover cross-event-type booking conflicts`

- **Статус:** завершён 2026-09-02 в ветке
  `codex/cross-event-type-conflict-test`.
- [x] Создать два типа встреч с разной длительностью.
- [x] Забронировать интервал первого типа.
- [x] Проверить 409 для пересекающегося интервала второго типа.
- [x] Проверить исчезновение занятого интервала из slots второго типа.
- [x] Исправить описание изоляции сценариев в `e2e/SCENARIOS.md`.
- [x] Выполнить полный Playwright-набор: `5 passed (7.8s)`.

## Инкремент 2 — рабочий production-контейнер

**Коммит:** `fix(api)!: isolate production API routes`

- **Статус:** завершён 2026-09-02 в ветке
  `codex/production-container-api`.
- [x] Развести внешний `${PORT}` nginx и внутренний порт Uvicorn.
- [x] Перенести публичные API endpoints под единый `/api`-префикс.
- [x] Атомарно обновить TypeSpec, OpenAPI, backend, frontend types и E2E.
- [x] Заменить фоновый Uvicorn на `tini` и launcher с передачей сигналов.
- [x] Добавить отдельный CI-прогон собранного контейнера с `PORT=8080`.
- [x] Проверять SPA, JSON API, `GET /api/event-types/{id}` и graceful stop.
- [x] Перенести Railway healthcheck с `/` на `/api/openapi.json`.
- [x] Выполнить локальный dev Playwright-набор: `5 passed (8.1s)`.
- [x] Собрать production-образ и выполнить smoke-проверку на `PORT=8080`.
- [x] Выполнить Playwright против production-контейнера: `5 passed (5.0s)`.
- [x] Подтвердить graceful stop: exit code `0`, Uvicorn сообщил
  `Application shutdown complete`, конфликта портов нет.

## Инкремент 3 — воспроизводимые зависимости

**Коммит:** `build(deps): pin reproducible backend and contract toolchains`

- **Статус:** завершён 2026-09-02 в ветке
  `codex/reproducible-toolchains`.
- [x] Закрепить TypeSpec-пакеты на версии 1.15.0 вместо `latest`.
- [x] Зафиксировать FastAPI 0.141.1, Pydantic 2.13.5, Uvicorn 0.52.4 и
  полный набор транзитивных runtime-зависимостей.
- [x] Закрепить Node 24.18.0 и Python 3.12.11 в локальных toolchain-файлах,
  CI и production Dockerfile.
- [x] Закрепить Prism CLI 5.16.0 и согласовать `@types/node` с Node 24.
- [x] Добавить `engines` во все npm-проекты и включить `engine-strict`.
- [x] Проверять реальный запуск и HTTP-ответ `npm run mock` в CI.
- [x] Выполнить TypeSpec check/build, frontend build и `pip check`.
- [x] Выполнить локальный dev Playwright-набор: `5 passed (7.7s)`.
- [x] Собрать production-образ без `EBADENGINE` и выполнить smoke-проверку.
- [x] Выполнить Playwright против production-контейнера: `5 passed (5.2s)`.
- [x] Подтвердить graceful stop production-контейнера с exit code `0`.

## Инкремент 4 — контрактный query-параметр `from`

**Коммит:** `fix(api): honor the contracted from query parameter`

- **Статус:** завершён 2026-09-03 в ветке
  `codex/contracted-from-query`.
- [x] Назначить Python-переменной `from_` внешний alias `from` в обоих endpoints.
- [x] Проверить фильтрацию slots и owner bookings.
- [x] Проверить, что FastAPI OpenAPI публикует `from`, а не `from_`.
- [x] Выполнить TypeSpec check/build и frontend production build.
- [x] Выполнить локальный dev Playwright-набор: `7 passed (6.2s)`.
- [x] Собрать production-образ и выполнить smoke-проверку на `PORT=8080`.
- [x] Выполнить Playwright против production-контейнера: `7 passed (4.6s)`.
- [x] Подтвердить graceful stop production-контейнера с exit code `0`.

## Инкремент 5 — aware datetime и явные ошибки

**Коммит:** `fix(api): validate aware datetimes and declare error responses`

- **Статус:** завершён 2026-09-03 в ветке
  `codex/aware-datetime-errors`.
- [x] Описать в TypeSpec явные 404, 409 и 422.
- [x] Согласовать единый структурированный формат validation errors.
- [x] Валидировать timezone у `startsAt`, `from` и `to` на входной границе.
- [x] Перегенерировать OpenAPI и frontend types.
- [x] Проверить, что timezone-less значения возвращают 422, а не 500.
- [x] Проверить явные error responses в FastAPI OpenAPI.
- [x] Выполнить TypeSpec check/build и frontend codegen/build.
- [x] Выполнить локальный dev Playwright-набор: `9 passed (6.3s)`.
- [x] Собрать production-образ и выполнить smoke-проверку на `PORT=8080`.
- [x] Выполнить Playwright против production-контейнера: `9 passed (4.4s)`.
- [x] Подтвердить graceful stop production-контейнера с exit code `0`.

## Инкремент 6 — начало списка слотов

**Коммит:** `fix(slots): round availability start up to the grid`

- **Статус:** завершён 2026-09-03, интегрирован в `main` через PR #13.
- [x] Округлять нижнюю границу вверх к 30-минутной сетке.
- [x] Гарантировать `slot.startsAt >= effectiveFrom`.
- [x] Проверить граничные случаи `14:11:39` и `14:30:00`.
- [x] Удалить обход с пропуском первого слота из Playwright-тестов.
- [x] Выполнить TypeSpec check/build и frontend codegen/build.
- [x] Выполнить локальный dev Playwright-набор: `10 passed (7.7s)`.
- [x] Подтвердить успешные `hexlet-check`, `e2e` и `production-container` на `main`.

## Инкремент 7 — серверная проверка сетки

**Коммит:** `fix(bookings): enforce the server-side slot grid`

- **Статус:** завершён 2026-09-03 в ветке `codex/enforce-booking-grid`.
- [x] Нормализовать `startsAt` в UTC.
- [x] Разрешать только минуты `00`/`30`, нулевые секунды и микросекунды.
- [x] Проверять, что весь интервал помещается в booking window.
- [x] Возвращать контрактный 422 для времени вне сетки.
- [x] Сохранить отдельный 409 для занятого валидного интервала.
- [x] Обновить TypeSpec и `spec.md`, перегенерировать OpenAPI и frontend types.
- [x] Выполнить TypeSpec check/build, frontend build и `pip check`.
- [x] Выполнить локальный dev Playwright-набор: `11 passed (7.7s)`.
- [x] Собрать production-образ и выполнить smoke-проверку на `PORT=8080`.
- [x] Выполнить Playwright против production-контейнера: `11 passed (5.5s)`.
- [x] Подтвердить graceful stop: exit code `0`, `OOMKilled=false`, Uvicorn сообщил
  `Application shutdown complete`.

## Финальные обязательные проверки CI

- [x] TypeSpec check/build.
- [x] Проверка воспроизводимой генерации OpenAPI и frontend types.
- [ ] Backend API tests.
- [x] Frontend build.
- [x] Dev Playwright.
- [x] Cross-event-type Playwright.
- [x] Production container на `PORT=8080`.
- [x] Prism mock smoke.
- [x] Graceful container stop.
