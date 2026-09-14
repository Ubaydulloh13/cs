import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../server/local-db.js";
import { handleApi } from "../server/api.js";
import { passwordHash } from "../server/crypto.js";
function client(env) {
  let cookie = "";
  return {
    async call(path, body, origin = "http://game.test") {
      const response = await handleApi(
        new Request("http://game.test/api/" + path, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json", Origin: origin }),
            Cookie: cookie,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
        env,
      );
      const set = response.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
      return {
        status: response.status,
        data: await response.json(),
        cookie: set,
      };
    },
  };
}
const signup = (c) =>
  c.call("register", { username: "player_one", password: "LongPassword-123" });
test("Accounts register, login and persist equipment; coins and roles cannot be forged", async () => {
  const DB = openDatabase(),
    env = { DB };
  try {
    const c = client(env);
    assert.equal((await c.call("session")).data.profile, null);
    const r = await signup(c);
    assert.equal(r.status, 200);
    assert.equal(r.data.profile.coins, 1000);
    assert.match(r.cookie, /HttpOnly/);
    assert.match(r.cookie, /SameSite=Lax/);
    let p = await c.call("profile", {
      name: "Alpha",
      coins: 999999,
      role: "admin",
      optic: "holo",
      crosshair: "dot",
    });
    assert.equal(p.data.profile.role, "player");
    assert.equal(p.data.profile.coins, 1000);
    assert.equal(p.data.profile.crosshair, "dot");
    assert.equal(p.data.profile.optic, "holo");
    assert.equal((await c.call("profile", { skin: "glacier" })).status, 403);
    assert.equal((await c.call("admin/coins", { amount: 100 })).status, 403);
    assert.equal(
      (await c.call("profile", { name: "CSRF" }, "http://evil.test")).status,
      403,
    );
    assert.equal((await c.call("logout", {})).status, 200);
    assert.equal((await c.call("session")).data.profile, null);
    const other = client(env);
    assert.equal(
      (
        await other.call("login", {
          username: "player_one",
          password: "Wrong-Password",
        })
      ).status,
      401,
    );
    p = await other.call("login", {
      username: "player_one",
      password: "LongPassword-123",
    });
    assert.equal(p.data.profile.name, "Alpha");
    assert.equal(p.data.profile.crosshair, "dot");
    const row = await DB.prepare("SELECT * FROM users").first();
    assert.notEqual(row.password_hash, "LongPassword-123");
    assert.match(row.password_hash, /^pbkdf2\$/);
  } finally {
    DB.close();
  }
});
test("Shop charges server prices exactly once and rejects unaffordable items", async () => {
  const DB = openDatabase();
  try {
    const c = client({ DB });
    await signup(c);
    let r = await c.call("purchase", { kind: "weapon", id: "scar", price: 0 });
    assert.equal(r.status, 200);
    assert.equal(r.data.profile.coins, 100);
    assert.ok(r.data.profile.weaponOwned.includes("scar"));
    r = await c.call("purchase", { kind: "weapon", id: "scar" });
    assert.equal(r.data.profile.coins, 100);
    assert.equal(
      (await c.call("purchase", { kind: "skin", id: "glacier" })).status,
      409,
    );
    r = await c.call("profile", { weapon: "scar" });
    assert.equal(r.data.profile.weapon, "scar");
    assert.equal((await c.call("checkout", { amount: 1000 })).status, 503);
    assert.equal(
      (await c.call("purchase", { kind: "__proto__", id: "x" })).status,
      400,
    );
  } finally {
    DB.close();
  }
});
test("Operator login is reserved and only the private bootstrap password grants admin", async () => {
  const DB = openDatabase();
  try {
    const env = {
        DB,
        ADMIN_PASSWORD_HASH: await passwordHash("Owner-private-123"),
      },
      c = client(env);
    assert.equal(
      (
        await c.call("register", {
          username: "operator",
          password: "attacker-password",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await c.call("login", {
          username: "operator",
          password: "attacker-password",
        })
      ).status,
      401,
    );
    let r = await c.call("login", {
      username: "operator",
      password: "Owner-private-123",
    });
    assert.equal(r.data.profile.role, "admin");
    r = await c.call("admin/coins", { amount: 1000000 });
    assert.equal(r.data.profile.coins, 1001000);
    assert.equal((await c.call("admin/coins", { amount: -1 })).status, 400);
    assert.equal(
      (await DB.prepare("SELECT count(*) AS count FROM admin_audit").first())
        .count,
      1,
    );
    await c.call("password", {
      currentPassword: "Owner-private-123",
      password: "Changed-private-123",
    });
    assert.equal((await c.call("session")).data.profile, null);
    assert.equal(
      (
        await c.call("login", {
          username: "operator",
          password: "Owner-private-123",
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await c.call("login", {
          username: "operator",
          password: "Changed-private-123",
        })
      ).data.profile.role,
      "admin",
    );
  } finally {
    DB.close();
  }
});
test("Match rewards require a ticket, elapsed time and single completion", async () => {
  const DB = openDatabase();
  try {
    const c = client({ DB });
    await signup(c);
    const r = await c.call("match/start", { duration: 180 }),
      ticket = r.data.ticket,
      result = { kills: 4, deaths: 2, win: true, map: "harbor", size: 2 };
    assert.equal(
      (await c.call("match/complete", { ticket, result })).status,
      409,
    );
    await DB.prepare("UPDATE match_tickets SET issued_at=? WHERE id=?")
      .bind(Date.now() - 65000, ticket)
      .run();
    const reward = await c.call("match/complete", { ticket, result });
    assert.equal(reward.status, 200);
    assert.equal(reward.data.profile.coins, 1280);
    assert.equal(reward.data.profile.matches, 1);
    assert.equal(
      (await c.call("match/complete", { ticket, result })).status,
      409,
    );
    assert.equal((await c.call("session")).data.profile.coins, 1280);
  } finally {
    DB.close();
  }
});
