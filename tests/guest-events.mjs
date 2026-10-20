// Run against a production build backed by a disposable database:
// TEST_BASE_URL=http://localhost:3017 node tests/guest-events.mjs
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fromCrossJSON, toJSONAsync } from "seroval";
import { defaultSerovalPlugins } from "@tanstack/router-core";

const base = process.env.TEST_BASE_URL;
assert.ok(base, "Set TEST_BASE_URL to a test server with a disposable database");
const buildDir = new URL("../.output/server/_ssr/", import.meta.url);
const apiFile = (await readdir(buildDir)).find((name) => /^api-.*\.mjs$/.test(name));
assert.ok(apiFile, "Run npm run build first");
const source = await readFile(new URL(apiFile, buildDir), "utf8");
const ids = Object.fromEntries(
  [...source.matchAll(/id: "([a-f0-9]+)",\s*name: "([^"]+)"/g)].map((m) => [m[2], m[1]]),
);

function browser() {
  let cookie = "";
  return async (name, data, method = "GET") => {
    assert.ok(ids[name], `Missing server function ${name}`);
    const payload = JSON.stringify(await toJSONAsync({ data }));
    const url = new URL(`/_serverFn/${ids[name]}`, base);
    if (method === "GET") url.searchParams.set("payload", payload);
    const response = await fetch(url, {
      method,
      headers: {
        origin: base,
        cookie,
        accept: "application/json",
        "content-type": "application/json",
        "x-tsr-serverFn": "true",
      },
      body: method === "POST" ? payload : undefined,
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    assert.equal(response.status, 200, `${name}: ${await response.clone().text()}`);
    const result = fromCrossJSON(await response.json(), {
      refs: new Map(),
      plugins: defaultSerovalPlugins,
    });
    if (result.error) throw result.error;
    return result.result;
  };
}

const owner = browser();
const stranger = browser();
const values = {
  name: "Guest calendar",
  subtitle: null,
  start_date: "2026-10-20",
  end_date: "2026-10-21",
  location: null,
  logo_url: null,
  accent_color: "#C9A227",
};
assert.equal(await owner("getMe"), null);
assert.deepEqual(await owner("fetchEvents"), []);
const event = await owner("createEvent", values, "POST");
const guest = await owner("getMe");
assert.equal(guest.is_guest, true);
assert.equal(event.user_id, guest.id);
assert.equal((await owner("fetchEvents")).length, 1);
assert.equal((await owner("fetchCategories", event.id)).length, 4);
await owner("updateEvent", { id: event.id, values: { ...values, name: "Edited" } }, "POST");
assert.equal((await owner("fetchEvent", event.id)).name, "Edited");
await owner(
  "saveElement",
  {
    eventId: event.id,
    id: null,
    values: {
      category_id: null,
      title: "Guest activity",
      start_datetime: "2026-10-20T10:00:00Z",
      end_datetime: "2026-10-20T11:00:00Z",
      location: null,
      subtitle: null,
      notes: null,
    },
  },
  "POST",
);
assert.equal((await owner("fetchElements", event.id)).length, 1);
assert.deepEqual(await stranger("fetchEvents"), []);
await assert.rejects(stranger("fetchEvent", event.id), /access/);
await stranger("createEvent", { ...values, name: "Other browser" }, "POST");
await assert.rejects(stranger("updateEvent", { id: event.id, values }, "POST"), /access/);
await assert.rejects(
  stranger("setEventPublic", { eventId: event.id, isPublic: true }, "POST"),
  /access/,
);
await owner("setEventPublic", { eventId: event.id, isPublic: true }, "POST");
assert.equal((await stranger("fetchEventBySlug", event.public_slug)).id, event.id);
await assert.rejects(stranger("updateEvent", { id: event.id, values }, "POST"), /access/);

const credentials = {
  identifier: `guest-test-${Date.now()}@example.com`,
  password: "test-password-123",
};
const account = await owner("signUp", credentials, "POST");
assert.equal(account.is_guest, false);
assert.equal((await owner("fetchEvent", event.id)).user_id, account.id);
assert.equal((await owner("fetchElements", event.id)).length, 1);
await owner("signOut", undefined, "POST");
assert.equal(await owner("getMe"), null);
assert.deepEqual(await owner("fetchEvents"), []);
const nextEvent = await owner("createEvent", { ...values, name: "Before sign-in" }, "POST");
await assert.rejects(owner("signIn", { ...credentials, password: "incorrect" }, "POST"), /Wrong/);
assert.equal((await owner("fetchEvent", nextEvent.id)).id, nextEvent.id);
await owner("signIn", credentials, "POST");
assert.equal((await owner("fetchEvent", nextEvent.id)).user_id, account.id);
assert.equal((await owner("fetchEvents")).length, 2);
console.log(
  "Guest creation, editing, categories, program elements, access isolation, public sharing, signup and sign-in transfer passed.",
);
