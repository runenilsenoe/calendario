// Run against a production build backed by a disposable database:
// Start the test server with ADMIN_IDENTIFIERS=admin-test@example.com,+4712345678
// TEST_BASE_URL=http://localhost:3017 node tests/admin-access.mjs
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

const anonymous = browser();
assert.equal(await anonymous("getMe"), null);
await assert.rejects(anonymous("fetchAdminOverview"), /tilgang/);

const values = {
  name: "Private test event",
  subtitle: null,
  start_date: "2026-11-10",
  end_date: "2026-11-11",
  location: null,
  logo_url: null,
  accent_color: "#C9A227",
};
const guest = browser();
await guest("createEvent", values, "POST");
assert.equal((await guest("getMe")).is_admin, false);
await assert.rejects(guest("fetchAdminOverview"), /tilgang/);

const regular = browser();
const suffix = Date.now();
const regularAccount = await regular(
  "signUp",
  { identifier: `regular-${suffix}@example.com`, password: "test-password-123" },
  "POST",
);
assert.equal(regularAccount.is_admin, false);
assert.equal((await regular("getMe")).is_admin, false);
await assert.rejects(regular("fetchAdminOverview"), /tilgang/);

const admin = browser();
const credentials = { identifier: "admin-test@example.com", password: "test-password-123" };
const account = await admin("signUp", credentials, "POST");
assert.equal(account.is_admin, true);
assert.equal((await admin("getMe")).is_admin, true);
const overview = await admin("fetchAdminOverview");
assert.ok(overview.stats.registered_users >= 2);
assert.ok(overview.stats.guests >= 1);
assert.ok(overview.stats.events >= 1);
assert.ok(overview.users.some((user) => user.id === regularAccount.id));
assert.ok(overview.users.filter((user) => user.is_guest).every((user) => user.identifier === null));
assert.ok(
  overview.events.some((event) => event.name === values.name && event.owner_identifier === null),
);
await admin("signOut", undefined, "POST");
await assert.rejects(admin("fetchAdminOverview"), /tilgang/);
assert.equal((await admin("signIn", credentials, "POST")).is_admin, true);
await admin("fetchAdminOverview");

const phoneAdmin = browser();
assert.equal(
  (
    await phoneAdmin(
      "signUp",
      { identifier: "+47 123 45 678", password: "test-password-123" },
      "POST",
    )
  ).is_admin,
  true,
);
assert.equal((await phoneAdmin("getMe")).is_admin, true);
await phoneAdmin("fetchAdminOverview");
console.log(
  "Admin email/phone access, overview, sign-in/out and rejection of anonymous, guest and regular accounts passed.",
);
