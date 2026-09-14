import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { ensureAdminCredentials } from "../scripts/create-admin.mjs";
import {
  checkNodeVersion,
  missingDependencies,
} from "../scripts/start-dev.mjs";
import { verifyPassword } from "../server/crypto.js";

async function fixture(t) {
  const base = resolve(tmpdir());
  const root = await mkdtemp(join(base, "strikezone-startup-"));
  t.after(async () => {
    assert.ok(resolve(root).startsWith(base + sep));
    assert.ok(root.includes("strikezone-startup-"));
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

test("startup rejects Node versions that cannot run the bundled local database", () => {
  for (const version of ["18.20.0", "20.19.0", "22.12.0", "invalid"])
    assert.throws(
      () => checkNodeVersion(version),
      /Install Node.js 22.13 or newer/,
    );
  for (const version of ["22.13.0", "22.18.0", "24.0.0"])
    assert.doesNotThrow(() => checkNodeVersion(version));
});

test("first startup generates a private operator password and stores only its hash as server secret", async (t) => {
  const root = await fixture(t);
  const setup = await ensureAdminCredentials(root);
  assert.equal(setup.created, true);
  const login = await readFile(setup.loginPath, "utf8");
  assert.match(login, /^Login: operator\n/);
  const password = login.match(/Password: (.+)/)[1];
  assert.ok(password.length >= 20);
  assert.equal(
    await verifyPassword(password, setup.secrets.ADMIN_PASSWORD_HASH),
    true,
  );
  assert.equal(JSON.stringify(setup.secrets).includes(password), false);
});

test("later startups preserve the operator password and stored bootstrap hash", async (t) => {
  const root = await fixture(t);
  const first = await ensureAdminCredentials(root);
  const original = await readFile(first.loginPath, "utf8");
  const second = await ensureAdminCredentials(root);
  assert.equal(second.created, false);
  assert.deepEqual(second.secrets, first.secrets);
  assert.equal(await readFile(second.loginPath, "utf8"), original);
});

test("a damaged existing secret file is reported without silently replacing credentials", async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, ".private"));
  const path = join(root, ".private", "server-secrets.json");
  const invalid = JSON.stringify({ ADMIN_PASSWORD_HASH: "bad-hash" });
  await writeFile(path, invalid);
  await assert.rejects(
    ensureAdminCredentials(root),
    /invalid ADMIN_PASSWORD_HASH/,
  );
  assert.equal(await readFile(path, "utf8"), invalid);
});

test("startup detects missing direct packages before importing Vite", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      dependencies: { "strikezone-definitely-absent-package": "1.0.0" },
    }),
  );
  assert.deepEqual(await missingDependencies(root), [
    "strikezone-definitely-absent-package",
  ]);
});

test("installed project dependencies pass startup checks", async () => {
  assert.deepEqual(await missingDependencies(), []);
});
