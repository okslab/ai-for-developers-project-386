### Hexlet tests and linter status:
[![Actions Status](https://github.com/okslab/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/okslab/ai-for-developers-project-386/actions)

## Deployed application

Public link: https://ai-for-developers-project-386-production-483e.up.railway.app

The app runs in a single Docker container (see `Dockerfile`) that serves the React SPA
and the FastAPI backend on the port from the `PORT` environment variable. Deployed on
Railway.

## Production deployment verification

Railway must deploy the repository's `main` branch with the root `Dockerfile`. Railway
provides `RAILWAY_GIT_COMMIT_SHA` to Docker builds; the Dockerfile copies that build
argument into the runtime-only `APP_REVISION` variable. `GET /api/health` therefore
returns the exact source revision of the running container. A local image built without
that argument remains valid and reports `unknown`. Railway's GitHub source deployment is
the only production writer; the release workflow reuses the read-only smoke instead of
uploading a second, revision-less build through Railway CLI.

The `public-production-smoke` GitHub Actions workflow runs after every push to `main` and
on a six-hour schedule. Configure the repository Actions variable
`PRODUCTION_BASE_URL` under **Settings → Secrets and variables → Actions → Variables**.
Until it is configured, the workflow uses the public link above.

The workflow waits for Railway's asynchronous deployment to report the triggering
`main` SHA, then performs read-only checks of the SPA, health endpoint, OpenAPI document,
event-type list, SPA deep-link fallback, and API 404 routing. It never creates or changes
application data. A revision mismatch after the polling timeout means Railway is still
serving an older commit, is tracking the wrong branch or service, or did not build the
root Dockerfile with Railway's Git metadata.

To diagnose a deployment manually, open **Actions → public-production-smoke → Run
workflow**. `base_url` overrides the repository variable. `expected_revision` is
optional: provide a full Git SHA to check one exact deployment, or leave it empty to run
the read-only availability and routing checks without waiting for a revision.

The same smoke can be run locally:

```bash
docker build --build-arg RAILWAY_GIT_COMMIT_SHA=local-smoke \
  --tag appointment-booking:public-smoke .
docker run --rm --name appointment-booking-public-smoke \
  --env PORT=8080 --publish 127.0.0.1:8080:8080 \
  appointment-booking:public-smoke
node e2e/scripts/public-production-smoke.mjs \
  http://127.0.0.1:8080 local-smoke
```

An HTTP 200 from `/` is not sufficient evidence of a healthy deployment: nginx can
serve the SPA while `/api/...` routes point to an outdated or unavailable backend. The
health revision and routing checks distinguish those cases.
