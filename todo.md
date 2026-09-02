# Incremental remediation plan

Цель: устранить production- и API-дефекты небольшими атомарными изменениями так,
чтобы каждый опубликованный инкремент проходил проверки и мог быть независимо
откачен.

## Правила выполнения

- Разработка ведётся от `dev`; изменения не пушатся напрямую в `main`.
- Один инкремент оформляется отдельным PR или squash-коммитом в формате
  Conventional Commits.
- Регрессионный тест для существующего дефекта коммитится вместе с исправлением,
  чтобы в истории не появлялась заведомо нерабочая версия.
- Если меняется API, TypeSpec редактируется первым, но контракт, сгенерированные
  артефакты, backend и frontend публикуются одним атомарным изменением.
- Обновления зависимостей не смешиваются с изменениями бизнес-логики.
- После каждого инкремента проверяются TypeSpec, generated artifacts, backend,
  frontend, dev E2E и, после его появления, production-container job.

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
  `release-please` завершились успешно. Последние проверки `dev` на `2bd388f`
  также успешны.

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

**Коммит:** `fix(deploy): make the production container serve SPA and API reliably`

- [ ] Развести внешний `${PORT}` nginx и внутренний порт Uvicorn.
- [ ] Перенести публичные API endpoints под единый `/api`-префикс.
- [ ] Атомарно обновить TypeSpec, OpenAPI, backend, frontend types и E2E.
- [ ] Заменить фоновый Uvicorn корректным управлением обоими процессами.
- [ ] Добавить отдельный CI-прогон собранного контейнера с `PORT=8080`.
- [ ] Проверять SPA, JSON API, `GET /api/event-types/{id}` и graceful stop.
- [ ] Перенести Railway healthcheck с `/` на API-health endpoint.

## Инкремент 3 — воспроизводимые зависимости

**Коммит:** `build(deps): pin reproducible backend and contract toolchains`

- [ ] Закрепить TypeSpec-пакеты вместо `latest`.
- [ ] Зафиксировать FastAPI, Pydantic, Uvicorn и транзитивные зависимости.
- [ ] Согласовать версию Node с Prism либо закрепить совместимый Prism.
- [ ] Добавить `engines` в npm-проекты.
- [ ] Проверять `npm run mock` в CI.

## Инкремент 4 — контрактный query-параметр `from`

**Коммит:** `fix(api): honor the contracted from query parameter`

- [ ] Назначить Python-переменной `from_` внешний alias `from` в обоих endpoints.
- [ ] Проверить фильтрацию slots и owner bookings.
- [ ] Проверить, что FastAPI OpenAPI публикует `from`, а не `from_`.

## Инкремент 5 — aware datetime и явные ошибки

**Коммит:** `fix(api): validate aware datetimes and declare error responses`

- [ ] Описать в TypeSpec явные 404, 409 и 422.
- [ ] Согласовать единый структурированный формат validation errors.
- [ ] Валидировать timezone у `startsAt`, `from` и `to` на входной границе.
- [ ] Перегенерировать OpenAPI и frontend types.
- [ ] Проверить, что timezone-less значения возвращают 422, а не 500.

## Инкремент 6 — начало списка слотов

**Коммит:** `fix(slots): round availability start up to the grid`

- [ ] Округлять нижнюю границу вверх к 30-минутной сетке.
- [ ] Гарантировать `slot.startsAt >= effectiveFrom`.
- [ ] Проверить граничные случаи `14:11:39` и `14:30:00`.
- [ ] Удалить обход с пропуском первого слота из Playwright-тестов.

## Инкремент 7 — серверная проверка сетки

**Коммит:** `fix(bookings): enforce the server-side slot grid`

- [ ] Нормализовать `startsAt` в UTC.
- [ ] Разрешать только минуты `00`/`30`, нулевые секунды и микросекунды.
- [ ] Проверять, что весь интервал помещается в booking window.
- [ ] Возвращать контрактный 422 для времени вне сетки.
- [ ] Сохранить отдельный 409 для занятого валидного интервала.

## Финальные обязательные проверки CI

- [ ] TypeSpec check/build.
- [ ] Проверка отсутствия diff у generated artifacts.
- [ ] Backend API tests.
- [ ] Frontend build.
- [ ] Dev Playwright.
- [ ] Cross-event-type Playwright.
- [ ] Production container на `PORT=8080`.
- [ ] Prism mock smoke.
- [ ] Graceful container stop.
