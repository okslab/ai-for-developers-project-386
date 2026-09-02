import assert from "node:assert/strict";

const baseUrl = (process.argv[2] ?? "http://127.0.0.1:8080").replace(/\/$/, "");

async function expectContentType(response, expected) {
  assert.equal(response.ok, true, `${response.url} returned ${response.status}`);
  assert.match(
    response.headers.get("content-type") ?? "",
    expected,
    `${response.url} returned an unexpected content type`,
  );
}

const homeResponse = await fetch(`${baseUrl}/`);
await expectContentType(homeResponse, /text\/html/);
assert.match(await homeResponse.text(), /<div id="root"><\/div>/);

const openApiResponse = await fetch(`${baseUrl}/api/openapi.json`);
await expectContentType(openApiResponse, /application\/json/);
const openApi = await openApiResponse.json();
assert.ok(
  Object.keys(openApi.paths ?? {}).some((path) =>
    /^\/api\/event-types\/\{[^}]+\}$/.test(path),
  ),
  "implementation OpenAPI does not expose the event-type detail route",
);

const createResponse = await fetch(`${baseUrl}/api/owner/event-types`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Production smoke",
    description: "Created by the production-container smoke test.",
    durationMinutes: 30,
  }),
});
await expectContentType(createResponse, /application\/json/);
assert.equal(createResponse.status, 201);
const created = await createResponse.json();
assert.equal(typeof created.id, "string");

const detailResponse = await fetch(`${baseUrl}/api/event-types/${created.id}`);
await expectContentType(detailResponse, /application\/json/);
const detail = await detailResponse.json();
assert.equal(detail.id, created.id);
assert.equal(detail.name, "Production smoke");

const deepLinkResponse = await fetch(`${baseUrl}/event-types/${created.id}`);
await expectContentType(deepLinkResponse, /text\/html/);
assert.match(await deepLinkResponse.text(), /<div id="root"><\/div>/);

console.log("Production container smoke checks passed.");
