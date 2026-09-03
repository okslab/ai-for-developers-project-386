import assert from "node:assert/strict";

const baseUrl = (process.argv[2] ?? "http://127.0.0.1:8080").replace(/\/$/, "");
const expectedRevision = process.argv[3];

async function expectResponse(response, { contentType, status = 200 }) {
  assert.equal(
    response.status,
    status,
    `${response.url} returned ${response.status}; expected ${status}`,
  );
  assert.match(
    response.headers.get("content-type") ?? "",
    contentType,
    `${response.url} returned an unexpected content type`,
  );
}

const homeResponse = await fetch(`${baseUrl}/`);
await expectResponse(homeResponse, { contentType: /text\/html/i });
assert.match(await homeResponse.text(), /<div id=["']root["']><\/div>/);

const healthResponse = await fetch(`${baseUrl}/api/health`);
await expectResponse(healthResponse, { contentType: /application\/json/i });
const health = await healthResponse.json();
assert.equal(health.status, "ok", "health status is not ok");
assert.equal(typeof health.revision, "string", "health revision is not a string");
if (expectedRevision !== undefined) {
  assert.equal(
    health.revision,
    expectedRevision,
    `health revision does not match expected revision ${expectedRevision}`,
  );
}

const openApiResponse = await fetch(`${baseUrl}/api/openapi.json`);
await expectResponse(openApiResponse, { contentType: /application\/json/i });
const openApi = await openApiResponse.json();
const openApiPaths = Object.keys(openApi.paths ?? {});
assert.ok(openApiPaths.includes("/api/health"), "OpenAPI does not expose /api/health");
assert.ok(
  openApiPaths.includes("/api/event-types"),
  "OpenAPI does not expose /api/event-types",
);
assert.ok(
  openApiPaths.every((path) => path.startsWith("/api/")),
  "OpenAPI exposes a route outside the current /api namespace",
);

const eventTypesResponse = await fetch(`${baseUrl}/api/event-types`);
await expectResponse(eventTypesResponse, { contentType: /application\/json/i });
assert.ok(
  Array.isArray(await eventTypesResponse.json()),
  "/api/event-types did not return a JSON array",
);

const deepLinkResponse = await fetch(
  `${baseUrl}/event-types/nonexistent-deployment-smoke`,
);
await expectResponse(deepLinkResponse, { contentType: /text\/html/i });
assert.match(await deepLinkResponse.text(), /<div id=["']root["']><\/div>/);

const missingApiResponse = await fetch(
  `${baseUrl}/api/nonexistent-deployment-smoke`,
);
await expectResponse(missingApiResponse, {
  contentType: /application\/json/i,
  status: 404,
});
await missingApiResponse.json();

console.log(
  `Public production smoke checks passed (revision: ${health.revision}).`,
);
