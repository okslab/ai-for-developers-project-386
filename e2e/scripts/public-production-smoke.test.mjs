import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(
  new URL("./public-production-smoke.mjs", import.meta.url),
);

async function createFixture({ htmlApiPath, revision = "expected-revision" } = {}) {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ method: request.method, url: request.url });

    if (request.url === "/" || request.url?.startsWith("/event-types/")) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end('<!doctype html><div id="root"></div>');
      return;
    }

    if (request.url === htmlApiPath) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end('<!doctype html><div id="root"></div>');
      return;
    }

    response.setHeader("content-type", "application/json");
    if (request.url === "/api/health") {
      response.end(JSON.stringify({ status: "ok", revision }));
      return;
    }
    if (request.url === "/api/openapi.json") {
      response.end(
        JSON.stringify({
          paths: {
            "/api/health": {},
            "/api/event-types": {},
          },
        }),
      );
      return;
    }
    if (request.url === "/api/event-types") {
      response.end("[]");
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ detail: "Not Found" }));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
    requests,
  };
}

async function runSmoke(baseUrl, expectedRevision) {
  return execFileAsync(process.execPath, [scriptPath, baseUrl, expectedRevision]);
}

test("passes without mutating public application state", async () => {
  const fixture = await createFixture();
  try {
    await runSmoke(fixture.baseUrl, "expected-revision");
    assert.ok(fixture.requests.length > 0);
    assert.deepEqual(
      new Set(fixture.requests.map(({ method }) => method)),
      new Set(["GET"]),
    );
  } finally {
    await fixture.close();
  }
});

test("fails when the deployed revision is stale", async () => {
  const fixture = await createFixture({ revision: "stale-revision" });
  try {
    await assert.rejects(
      runSmoke(fixture.baseUrl, "expected-revision"),
      /health revision does not match expected revision/,
    );
  } finally {
    await fixture.close();
  }
});

test("fails when an API route returns the SPA HTML", async () => {
  const fixture = await createFixture({ htmlApiPath: "/api/event-types" });
  try {
    await assert.rejects(
      runSmoke(fixture.baseUrl, "expected-revision"),
      /unexpected content type/,
    );
  } finally {
    await fixture.close();
  }
});
