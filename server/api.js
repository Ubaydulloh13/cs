import { migrations } from "./migrations.js";
import { token, digest, passwordHash, verifyPassword } from "./crypto.js";
import { DEFAULT_PROFILE, MAPS } from "../src/game/config.js";
import {
  PRIMARY_WEAPONS,
  SKINS,
  KNIVES,
  OUTFITS,
  OPTICS,
  CROSSHAIRS,
  catalogItem,
  skinKey,
  ownsWeaponSkin,
} from "../src/game/catalog.js";
import { normalizeInventory } from "../src/game/inventory.js";
const ready = new WeakMap();
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
const fail = (message, status = 400) => json({ error: message }, status);
const fields = {
  weapon: "weaponOwned",
  knife: "knifeOwned",
  outfit: "outfitOwned",
};
const publicProfile = (u) => ({
  ...DEFAULT_PROFILE,
  ...normalizeInventory(
    { ...DEFAULT_PROFILE, ...JSON.parse(u.profile) },
    u.role === "admin",
  ),
  id: u.id,
  username: u.username,
  role: u.role,
  coins: u.coins,
});
const q = (db, sql, ...values) => db.prepare(sql).bind(...values);
async function init(db) {
  if (!ready.has(db))
    ready.set(
      db,
      db.batch(migrations.map((sql) => db.prepare(sql))).catch((e) => {
        ready.delete(db);
        throw e;
      }),
    );
  await ready.get(db);
}
const cookie = (request, value, maxAge = 604800) =>
  `strikezone_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
async function session(request, db) {
  const raw = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)strikezone_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!raw) return null;
  return q(
    db,
    "SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?",
    await digest(raw),
    Date.now(),
  ).first();
}
async function rate(db, key, max = 12) {
  const now = Date.now();
  await q(
    db,
    "INSERT INTO rate_limits (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END",
    key,
    now + 60000,
    now,
    now,
  ).run();
  const row = await q(
    db,
    "SELECT count FROM rate_limits WHERE key=?",
    key,
  ).first();
  return row.count <= max;
}
async function loggedIn(request, db, u) {
  const raw = token();
  await q(
    db,
    "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)",
    await digest(raw),
    u.id,
    Date.now() + 604800000,
  ).run();
  return json({ profile: publicProfile(u) }, 200, {
    "Set-Cookie": cookie(request, raw),
  });
}
export async function handleApi(request, env = {}) {
  const db = env.DB;
  if (!db)
    return fail(
      "Account bazasi ulanmagan. Serverni qayta ishga tushiring.",
      503,
    );
  try {
    await init(db);
    const url = new URL(request.url),
      path = url.pathname.replace(/^\/api\//, ""),
      post = request.method === "POST";
    if (!["GET", "POST"].includes(request.method))
      return fail("Bu usul mavjud emas.", 405);
    let body = {};
    if (post) {
      if (request.headers.get("origin") !== url.origin)
        return fail("So‘rov manbasi mos kelmadi.", 403);
      if (!request.headers.get("content-type")?.includes("application/json"))
        return fail("JSON kerak.", 415);
      const raw = await request.text();
      if (raw.length > 16384) return fail("So‘rov juda katta.", 413);
      try {
        body = JSON.parse(raw);
      } catch {
        return fail("So‘rov noto‘g‘ri.");
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return fail("So‘rov noto‘g‘ri.");
    }
    if (post && ["login", "register"].includes(path)) {
      const username = String(body.username || "")
          .toLowerCase()
          .trim(),
        password = String(body.password || "");
      if (
        !/^[a-z0-9_]{3,20}$/.test(username) ||
        password.length < 10 ||
        password.length > 128
      )
        return fail("Login: 3–20 harf yoki raqam. Parol: kamida 10 belgi.");
      const ip = request.headers.get("CF-Connecting-IP") || "local";
      if (
        !(await rate(db, "auth-ip:" + ip, 50)) ||
        !(await rate(db, "auth:" + ip + ":" + username, 8))
      )
        return fail(
          "Ko‘p urinish bo‘ldi. Bir daqiqadan so‘ng urinib ko‘ring.",
          429,
        );
      let u = await q(
        db,
        "SELECT * FROM users WHERE username=?",
        username,
      ).first();
      if (path === "register") {
        if (["operator", "aperator", "admin"].includes(username))
          return fail("Bu login administrator uchun band.", 409);
        if (u) return fail("Bu login band.", 409);
        const id = crypto.randomUUID(),
          p = { ...DEFAULT_PROFILE, name: username };
        await q(
          db,
          "INSERT INTO users (id,username,password_hash,role,coins,profile,revision,created_at) VALUES (?,?,?,'player',1000,?,0,?)",
          id,
          username,
          await passwordHash(password),
          JSON.stringify(p),
          Date.now(),
        ).run();
        u = await q(db, "SELECT * FROM users WHERE id=?", id).first();
      } else {
        if (
          !u &&
          username === "operator" &&
          /^pbkdf2\$/.test(env.ADMIN_PASSWORD_HASH || "") &&
          (await verifyPassword(password, env.ADMIN_PASSWORD_HASH))
        ) {
          const p = {
            ...DEFAULT_PROFILE,
            name: "Operator",
            weaponOwned: PRIMARY_WEAPONS.map((w) => w.id),
            owned: SKINS.map((s) => s.id),
            knifeOwned: KNIVES.map((k) => k.id),
            outfitOwned: OUTFITS.map((o) => o.id),
          };
          await q(
            db,
            "INSERT OR IGNORE INTO users (id,username,password_hash,role,coins,profile,revision,created_at) VALUES (?,'operator',?,'admin',1000,?,0,?)",
            crypto.randomUUID(),
            env.ADMIN_PASSWORD_HASH,
            JSON.stringify(p),
            Date.now(),
          ).run();
          u = await q(
            db,
            "SELECT * FROM users WHERE username='operator'",
          ).first();
        }
        if (!u || !(await verifyPassword(password, u.password_hash)))
          return fail("Login yoki parol noto‘g‘ri.", 401);
      }
      return loggedIn(request, db, u);
    }
    const u = await session(request, db);
    if (path === "session" && !post)
      return json({ profile: u ? publicProfile(u) : null });
    if (!u) return fail("Accountga kiring.", 401);
    if (path === "logout" && post) {
      const raw = request.headers
        .get("cookie")
        ?.match(/strikezone_session=([a-f0-9]{64})/)?.[1];
      if (raw)
        await q(
          db,
          "DELETE FROM sessions WHERE token_hash=?",
          await digest(raw),
        ).run();
      return json({ profile: null }, 200, {
        "Set-Cookie": cookie(request, "", 0),
      });
    }
    const current = publicProfile(u);
    if (path === "profile" && post) {
      const p = normalizeInventory(
        { ...DEFAULT_PROFILE, ...JSON.parse(u.profile) },
        u.role === "admin",
      );
      for (const [key, owned] of Object.entries(fields)) {
        if (body[key] !== undefined) {
          if (!current[owned].includes(body[key]))
            return fail("Bu buyum hali sizniki emas.", 403);
          p[key] = body[key];
        }
      }
      if (body.skin !== undefined) {
        if (
          !SKINS.some((s) => s.id === body.skin) ||
          !ownsWeaponSkin(current, p.weapon, body.skin)
        )
          return fail("Bu skin tanlangan qurol uchun olinmagan.", 403);
        p.weaponSkins[p.weapon] = body.skin;
      }
      p.skin = p.weaponSkins[p.weapon] || "standard";
      if (body.knifeSkin !== undefined) {
        if (!p.knifeSkinOwned.includes(body.knifeSkin))
          return fail("Pichoq skini hali sizniki emas.", 403);
        p.knifeSkin = body.knifeSkin;
      }
      if (typeof body.name === "string")
        p.name = body.name.trim().slice(0, 18) || u.username;
      for (const [key, min, max] of [
        ["sensitivity", 0.3, 2.5],
        ["volume", 0, 1],
      ])
        if (Number.isFinite(body[key]))
          p[key] = Math.min(max, Math.max(min, body[key]));
      for (const [key, allowed] of [
        ["quality", ["high", "low"]],
        ["optic", OPTICS.map((o) => o.id)],
        ["crosshair", CROSSHAIRS],
        ["crosshairColor", ["#ccff83", "#ffffff", "#49ddff", "#ff789d"]],
      ])
        if (allowed.includes(body[key])) p[key] = body[key];
      const r = await q(
        db,
        "UPDATE users SET profile=?,revision=revision+1 WHERE id=? AND revision=?",
        JSON.stringify(p),
        u.id,
        u.revision,
      ).run();
      if (!r.meta.changes)
        return fail("Profil o‘zgardi. Qayta urinib ko‘ring.", 409);
    } else if (path === "purchase" && post) {
      const kind = body.kind === "knifeSkin" ? "skin" : body.kind;
      const item = catalogItem(kind, body.id);
      const scopedWeapon = body.weapon ?? current.weapon;
      const skinPurchase = body.kind === "skin";
      if (skinPurchase && !PRIMARY_WEAPONS.some((w) => w.id === scopedWeapon))
        return fail("Skin uchun asosiy qurol tanlang.");
      const owned = {
        weapon: "weaponOwned",
        skin: "skinOwned",
        knifeSkin: "knifeSkinOwned",
        outfit: "outfitOwned",
        knife: "knifeOwned",
      }[body.kind];
      if (!item || typeof owned !== "string") return fail("Buyum topilmadi.");
      if (skinPurchase && !current.weaponOwned.includes(scopedWeapon))
        return fail("Avval ushbu qurolni oling.", 403);
      const itemId = skinPurchase ? skinKey(scopedWeapon, item.id) : item.id;
      const alreadyOwned = skinPurchase
        ? ownsWeaponSkin(current, scopedWeapon, item.id)
        : current[owned].includes(itemId);
      if (!alreadyOwned) {
        const p = normalizeInventory(
          { ...DEFAULT_PROFILE, ...JSON.parse(u.profile) },
          u.role === "admin",
        );
        p[owned] = [...p[owned], itemId];
        const r = await q(
          db,
          "UPDATE users SET coins=coins-?,profile=?,revision=revision+1 WHERE id=? AND coins>=? AND revision=?",
          item.price,
          JSON.stringify(p),
          u.id,
          item.price,
          u.revision,
        ).run();
        if (!r.meta.changes)
          return fail(
            "Tangalar yetarli emas yoki profil yangilangan. Qayta urinib ko'ring.",
            409,
          );
        await q(
          db,
          "INSERT OR IGNORE INTO purchases (id,user_id,kind,item_id,price,created_at) VALUES (?,?,?,?,?,?)",
          crypto.randomUUID(),
          u.id,
          body.kind,
          itemId,
          item.price,
          Date.now(),
        ).run();
      }
    } else if (path === "admin/coins" && post) {
      if (u.role !== "admin") return fail("Faqat administrator uchun.", 403);
      const n = body.amount;
      if (!Number.isSafeInteger(n) || n < 1 || n > 1000000000)
        return fail("1 dan 1 milliardgacha kiriting.");
      await db.batch([
        q(
          db,
          "UPDATE users SET coins=coins+?,revision=revision+1 WHERE id=?",
          n,
          u.id,
        ),
        q(
          db,
          "INSERT INTO admin_audit (id,actor_id,amount,created_at) VALUES (?,?,?,?)",
          crypto.randomUUID(),
          u.id,
          n,
          Date.now(),
        ),
      ]);
    } else if (path === "password" && post) {
      if (
        typeof body.password !== "string" ||
        body.password.length < 10 ||
        body.password.length > 128
      )
        return fail("Yangi parol kamida 10 belgi bo‘lsin.");
      if (
        !(await verifyPassword(
          String(body.currentPassword || ""),
          u.password_hash,
        ))
      )
        return fail("Hozirgi parol noto‘g‘ri.", 403);
      await db.batch([
        q(
          db,
          "UPDATE users SET password_hash=? WHERE id=?",
          await passwordHash(body.password),
          u.id,
        ),
        q(db, "DELETE FROM sessions WHERE user_id=?", u.id),
      ]);
      return json({ profile: null }, 200, {
        "Set-Cookie": cookie(request, "", 0),
      });
    } else if (path === "match/start" && post) {
      const duration = [60, 180, 300, 600].includes(body.duration)
          ? body.duration
          : 180,
        id = crypto.randomUUID();
      await db.batch([
        q(
          db,
          "UPDATE match_tickets SET completed=1 WHERE user_id=? AND completed=0",
          u.id,
        ),
        q(
          db,
          "INSERT INTO match_tickets (id,user_id,issued_at,duration,completed) VALUES (?,?,?,?,0)",
          id,
          u.id,
          Date.now(),
          duration,
        ),
      ]);
      return json({ ticket: id });
    } else if (path === "match/complete" && post) {
      const t = await q(
        db,
        "SELECT * FROM match_tickets WHERE id=? AND user_id=? AND completed=0",
        String(body.ticket || ""),
        u.id,
      ).first();
      if (
        !t ||
        Date.now() - t.issued_at < Math.min(t.duration * 0.5, 60) * 1000 ||
        Date.now() - t.issued_at > 3600000
      )
        return fail("Jang natijasi tasdiqlanmadi.", 409);
      const r = body.result || {},
        kills = Math.max(0, Math.min(96, Math.floor(Number(r.kills) || 0))),
        deaths = Math.max(0, Math.min(96, Math.floor(Number(r.deaths) || 0))),
        win = r.win === true,
        coins = 30 + kills * 25 + (win ? 150 : 0),
        p = JSON.parse(u.profile);
      p.matches++;
      p.wins += win ? 1 : 0;
      p.kills += kills;
      p.deaths += deaths;
      p.history = [
        {
          id: t.id,
          map: Object.hasOwn(MAPS, r.map) ? r.map : "dust",
          size: Math.max(1, Math.min(6, Number(r.size) || 1)),
          kills,
          deaths,
          win,
          coins,
          draw: !!r.draw,
          score: Array.isArray(r.score)
            ? r.score
                .slice(0, 2)
                .map((n) => Math.max(0, Math.min(100, Number(n) || 0)))
            : [0, 0],
          accuracy: Math.max(0, Math.min(100, Number(r.accuracy) || 0)),
          date: new Date().toISOString(),
        },
        ...p.history,
      ].slice(0, 30);
      const result = await db.batch([
        q(
          db,
          "UPDATE users SET coins=coins+?,profile=?,revision=revision+1 WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM match_tickets WHERE id=? AND user_id=? AND completed=0)",
          coins,
          JSON.stringify(p),
          u.id,
          u.revision,
          t.id,
          u.id,
        ),
        q(
          db,
          "UPDATE match_tickets SET completed=1 WHERE id=? AND changes()>0",
          t.id,
        ),
      ]);
      if (!result[0].meta.changes)
        return fail("Natija avval saqlangan. Yangilang.", 409);
    } else if (path === "checkout" && post)
      return fail("To‘lov xizmati hali ulanmagan. Pul yechilmadi.", 503);
    else return fail("Sahifa topilmadi.", 404);
    return json({
      profile: publicProfile(
        await q(db, "SELECT * FROM users WHERE id=?", u.id).first(),
      ),
    });
  } catch (error) {
    console.error("API failure", error.name);
    return fail("Server xatosi. Qayta urinib ko‘ring.", 500);
  }
}
