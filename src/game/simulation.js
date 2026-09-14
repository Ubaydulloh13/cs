import { MAPS, WEAPONS } from "./config.js";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const finite = (v, f = 0) => (Number.isFinite(v) ? v : f);
export function sanitizeInput(i = {}) {
  if (!i || typeof i !== "object") i = {};
  return {
    slot: [1, 2, 3].includes(i.slot) ? i.slot : null,
    mx: clamp(finite(i.mx), -1, 1),
    mz: clamp(finite(i.mz), -1, 1),
    yaw: finite(i.yaw),
    pitch: clamp(finite(i.pitch), -1.45, 1.45),
    jump: !!i.jump,
    crouch: !!i.crouch,
    sprint: !!i.sprint,
    fire: !!i.fire,
    aim: !!i.aim,
    reload: !!i.reload,
    weapon: Object.hasOwn(WEAPONS, i.weapon) ? i.weapon : null,
  };
}
export function rayBox(origin, dir, min, max) {
  let lo = 0,
    hi = 120;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dir[i]) < 1e-8) {
      if (origin[i] < min[i] || origin[i] > max[i]) return Infinity;
      continue;
    }
    let a = (min[i] - origin[i]) / dir[i],
      b = (max[i] - origin[i]) / dir[i];
    if (a > b) [a, b] = [b, a];
    lo = Math.max(lo, a);
    hi = Math.min(hi, b);
    if (lo > hi) return Infinity;
  }
  return lo;
}
export function blocked(x, z, boxes, r = 0.36, y = 0) {
  return boxes.some(
    (b) =>
      y < b.h &&
      x + r > b.x - b.w / 2 &&
      x - r < b.x + b.w / 2 &&
      z + r > b.z - b.d / 2 &&
      z - r < b.z + b.d / 2,
  );
}
export function wallDistance(origin, dir, boxes) {
  let best = 120;
  for (const b of boxes)
    best = Math.min(
      best,
      rayBox(
        origin,
        dir,
        [b.x - b.w / 2, 0, b.z - b.d / 2],
        [b.x + b.w / 2, b.h, b.z + b.d / 2],
      ),
    );
  return best;
}
export function movePlayer(p, i, dt, boxes) {
  p.yaw = i.yaw;
  p.pitch = i.pitch;
  p.crouch = i.crouch;
  p.aim = i.aim;
  p.sprint = i.sprint && !i.aim && !i.crouch;
  const speed = i.crouch ? 2.3 : i.aim ? 2.8 : i.sprint ? 7.2 : 4.8;
  const len = Math.max(1, Math.hypot(i.mx, i.mz));
  const dx =
    ((Math.cos(i.yaw) * i.mx - Math.sin(i.yaw) * i.mz) * speed * dt) / len;
  const dz =
    ((-Math.sin(i.yaw) * i.mx - Math.cos(i.yaw) * i.mz) * speed * dt) / len;
  const nx = clamp(p.x + dx, -24.1, 24.1),
    nz = clamp(p.z + dz, -22.1, 22.1);
  if (!blocked(nx, p.z, boxes, 0.36, p.y)) p.x = nx;
  if (!blocked(p.x, nz, boxes, 0.36, p.y)) p.z = nz;
  if (i.jump && !p.jumpHeld && (p.y === 0 || p.vy === 0)) p.vy = 6.8;
  p.jumpHeld = i.jump;
  p.vy -= 18 * dt;
  let next = p.y + p.vy * dt;
  if (next <= 0) {
    next = 0;
    p.vy = 0;
  }
  if (blocked(p.x, p.z, boxes, 0.35, next) && next < p.y) {
    const support = boxes
      .filter(
        (b) =>
          Math.abs(p.x - b.x) < b.w / 2 + 0.35 &&
          Math.abs(p.z - b.z) < b.d / 2 + 0.35 &&
          b.h <= p.y + 0.1,
      )
      .reduce((a, b) => Math.max(a, b.h), 0);
    next = Math.max(next, support);
    p.vy = 0;
  }
  p.y = next;
  p.moving = Math.hypot(dx, dz) > 0.002;
}
const botNames = [
  "Viper",
  "Ghost",
  "Raven",
  "Falcon",
  "Spectre",
  "Wolf",
  "Blaze",
  "Shadow",
  "Echo",
  "Storm",
  "Atlas",
];
export class Simulation {
  constructor(config = {}) {
    this.config = {
      size: 5,
      map: "dust",
      difficulty: "normal",
      duration: 180,
      ...config,
    };
    this.config.size = clamp(Math.floor(finite(this.config.size, 5)), 1, 6);
    if (!MAPS[this.config.map]) this.config.map = "dust";
    this.boxes = MAPS[this.config.map].boxes;
    this.players = [];
    this.inputs = {};
    this.time = 0;
    this.remaining = this.config.duration;
    this.score = [0, 0];
    this.events = [];
    this.serial = 0;
    this.target = Math.max(15, this.config.size * 8);
    this.over = false;
    this.botState = {};
    this.loadouts = {};
    this.nav = this.buildNav();
  }
  addPlayer(
    id,
    name,
    team = 0,
    bot = false,
    weapon = "ak",
    skin = "standard",
    cosmetics = {},
  ) {
    const p = {
      id,
      name: String(name || "Operator").slice(0, 18),
      team: team === 1 ? 1 : 0,
      bot,
      weapon: Object.hasOwn(WEAPONS, weapon) ? weapon : "ak",
      skin,
      primary: WEAPONS[weapon]?.slot === 1 ? weapon : "ak",
      outfit: cosmetics.outfit || "vanguard",
      knife: cosmetics.knife || "combat",
      knifeSkin: cosmetics.knifeSkin || "standard",
      kills: 0,
      deaths: 0,
      hits: 0,
      shots: 0,
      ammo: 0,
      reloading: 0,
      cooldown: 0,
      health: 100,
      x: 0,
      y: 0,
      z: 0,
      vy: 0,
      yaw: 0,
      pitch: 0,
      crouch: false,
      aim: false,
      jumpHeld: false,
      spawnAt: 0,
      protect: 0,
    };
    this.players.push(p);
    this.spawn(p);
    return p;
  }
  fillBots() {
    for (let team = 0; team < 2; team++) {
      while (
        this.players.filter((p) => p.team === team).length < this.config.size
      ) {
        const n = this.players.length;
        this.addPlayer(
          "bot-" + n,
          botNames[n % botNames.length],
          team,
          true,
          ["ak", "m4", "mp5"][n % 3],
          "standard",
        );
      }
    }
  }
  spawn(p) {
    this.loadouts[p.id] = {};
    const same = this.players.filter((q) => q.team === p.team);
    let index = Math.max(0, same.indexOf(p));
    p.x = (index - (this.config.size - 1) / 2) * 3;
    p.z = p.team === 0 ? 20 : -20;
    p.y = 0;
    p.vy = 0;
    p.yaw = p.team === 0 ? 0 : Math.PI;
    p.pitch = 0;
    p.health = 100;
    p.weapon = p.primary;
    p.ammo = WEAPONS[p.weapon].magazine;
    p.reserve = WEAPONS[p.weapon].magazine * 5;
    p.reloading = 0;
    p.protect = this.time + 2;
    p.spawnAt = 0;
    p.crouch = false;
    p.jumpHeld = false;
    delete this.botState[p.id];
    delete this.inputs[p.id];
  }
  setInput(id, input) {
    this.inputs[id] = sanitizeInput(input);
  }
  event(e) {
    this.events.push({ ...e, id: ++this.serial, time: this.time });
    if (this.events.length > 70) this.events.shift();
  }
  shoot(p) {
    const w = WEAPONS[p.weapon];
    if (p.cooldown > 0 || p.reloading > 0 || p.ammo <= 0) return;
    if (p.weapon !== "knife") p.ammo--;
    p.shots++;
    p.cooldown = w.rate;
    const yaw = p.yaw,
      pitch = p.pitch;
    const origin = [p.x, p.y + (p.crouch ? 1.03 : 1.65), p.z];
    const dir = [
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    ];
    let distance = Math.min(
        w.range || 120,
        wallDistance(origin, dir, this.boxes),
      ),
      victim = null,
      head = false;
    for (const q of this.players) {
      if (q.id === p.id || q.health <= 0) continue;
      const h = q.crouch ? 1.25 : 1.85;
      const d = rayBox(
        origin,
        dir,
        [q.x - 0.36, q.y, q.z - 0.36],
        [q.x + 0.36, q.y + h, q.z + 0.36],
      );
      if (d < distance) {
        distance = d;
        victim = q;
        head = origin[1] + dir[1] * d > q.y + h - 0.35;
      }
    }
    const end = origin.map((v, n) => v + dir[n] * Math.min(distance, 85));
    this.event({
      type: p.weapon === "knife" ? "slash" : "shot",
      player: p.id,
      from: origin,
      to: end,
      weapon: p.weapon,
    });
    if (victim && victim.team !== p.team && this.time >= victim.protect) {
      const dmg = Math.round(w.damage * (head ? 2.2 : 1));
      victim.health = Math.max(0, victim.health - dmg);
      p.hits++;
      this.event({
        type: "hit",
        player: p.id,
        victim: victim.id,
        head,
        damage: dmg,
      });
      if (victim.health === 0) {
        victim.deaths++;
        p.kills++;
        this.score[p.team]++;
        victim.spawnAt = this.time + 3;
        this.event({
          type: "kill",
          player: p.id,
          name: p.name,
          victim: victim.id,
          victimName: victim.name,
          skin: p.weapon === "knife" ? p.knifeSkin : p.skin,
          knife: p.knife,
          team: p.team,
          head,
          weapon: p.weapon,
        });
        if (this.score[p.team] >= this.target) this.finish();
      }
    }
  }
  buildNav() {
    const nodes = [];
    for (let z = -20; z <= 20; z += 2)
      for (let x = -22; x <= 22; x += 2)
        if (!blocked(x, z, this.boxes, 0.7)) nodes.push({ x, z, edges: [] });
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i],
          b = nodes[j];
        if (
          Math.hypot(a.x - b.x, a.z - b.z) < 2.9 &&
          !blocked((a.x + b.x) / 2, (a.z + b.z) / 2, this.boxes, 0.65)
        ) {
          a.edges.push(j);
          b.edges.push(i);
        }
      }
    return nodes;
  }
  path(x, z, tx, tz) {
    const nodes = this.nav;
    const nearest = (px, pz) =>
      nodes.reduce(
        (best, n, i) =>
          Math.hypot(n.x - px, n.z - pz) <
          Math.hypot(nodes[best].x - px, nodes[best].z - pz)
            ? i
            : best,
        0,
      );
    const start = nearest(x, z),
      end = nearest(tx, tz),
      queue = [start],
      prev = new Map([[start, -1]]);
    for (let at = 0; at < queue.length; at++) {
      const n = queue[at];
      if (n === end) break;
      for (const e of nodes[n].edges)
        if (!prev.has(e)) {
          prev.set(e, n);
          queue.push(e);
        }
    }
    if (!prev.has(end)) return [];
    const route = [];
    for (let n = end; n !== start && n !== -1; n = prev.get(n))
      route.unshift(nodes[n]);
    return route;
  }
  botInput(p, dt) {
    let b = this.botState[p.id];
    if (!b)
      b = this.botState[p.id] = {
        nextPath: 0,
        path: [],
        nextAim: 0,
        aimError: 0,
        seen: 0,
      };
    const enemies = this.players.filter(
      (q) => q.team !== p.team && q.health > 0,
    );
    const q = enemies.sort(
      (a, c) =>
        Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z),
    )[0];
    if (!q) return sanitizeInput({ yaw: p.yaw });
    const dx = q.x - p.x,
      dz = q.z - p.z,
      dist = Math.hypot(dx, dz);
    const oy = p.y + 1.65,
      ty = q.y + (q.crouch ? 0.8 : 1.25),
      dy = ty - oy;
    const length = Math.hypot(dx, dy, dz),
      dir = [dx / length, dy / length, dz / length];
    const visible =
      wallDistance([p.x, oy, p.z], dir, this.boxes) > length - 0.4;
    const difficulty = this.config.difficulty;
    const error =
      difficulty === "easy" ? 0.13 : difficulty === "hard" ? 0.015 : 0.055;
    if (this.time > b.nextAim) {
      b.nextAim = this.time + 0.3;
      b.aimError = (Math.random() - 0.5) * error;
    }
    let yaw = Math.atan2(-dx, -dz) + b.aimError,
      pitch = Math.atan2(dy, dist) + b.aimError * 0.5;
    let mx = 0,
      mz = 0;
    if (!visible || dist > 19) {
      b.seen = 0;
      if (this.time > b.nextPath) {
        b.path = this.path(p.x, p.z, q.x, q.z);
        b.nextPath = this.time + 1.2;
      }
      while (
        b.path.length &&
        Math.hypot(b.path[0].x - p.x, b.path[0].z - p.z) < 0.7
      )
        b.path.shift();
      if (b.path.length) {
        const n = b.path[0];
        if (!visible) {
          yaw = Math.atan2(p.x - n.x, p.z - n.z);
          pitch = 0;
          mz = 0.78;
        } else {
          const wx = n.x - p.x,
            wz = n.z - p.z,
            mag = Math.hypot(wx, wz);
          mx = ((Math.cos(yaw) * wx - Math.sin(yaw) * wz) / mag) * 0.8;
          mz = ((-Math.sin(yaw) * wx - Math.cos(yaw) * wz) / mag) * 0.8;
        }
      }
    } else {
      b.seen += dt;
      mx = Math.sin(this.time * 1.5 + this.players.indexOf(p)) * 0.5;
      mz = dist < 6 ? -0.4 : 0;
    }
    const delta = ((yaw - p.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return sanitizeInput({
      mx,
      mz,
      yaw: p.yaw + clamp(delta, -dt * 5, dt * 5),
      pitch,
      aim: visible,
      fire:
        visible &&
        Math.abs(delta) < 0.12 &&
        b.seen >
          (difficulty === "easy" ? 1.1 : difficulty === "hard" ? 0.15 : 0.5),
      reload: p.ammo === 0,
    });
  }
  step(dt) {
    if (this.over) return;
    dt = clamp(finite(dt), 0, 0.05);
    this.time += dt;
    this.remaining = Math.max(0, this.config.duration - this.time);
    if (this.remaining <= 0) {
      this.finish();
      return;
    }
    for (const p of this.players) {
      if (this.over) break;
      if (p.health <= 0) {
        if (this.time >= p.spawnAt) this.spawn(p);
        continue;
      }
      const i = p.bot
        ? this.botInput(p, dt)
        : this.inputs[p.id] || sanitizeInput({ yaw: p.yaw, pitch: p.pitch });
      const requested = i.slot
        ? [p.primary, "pistol", "knife"][i.slot - 1]
        : i.weapon;
      if (
        [p.primary, "pistol", "knife"].includes(requested) &&
        requested !== p.weapon
      ) {
        this.loadouts[p.id][p.weapon] = { ammo: p.ammo, reserve: p.reserve };
        p.weapon = requested;
        const saved = this.loadouts[p.id][requested];
        p.ammo = saved ? saved.ammo : WEAPONS[requested].magazine;
        p.reserve = saved ? saved.reserve : WEAPONS[requested].magazine * 5;
        p.reloading = 0;
        p.cooldown = Math.max(p.cooldown, 0.6);
      }
      p.cooldown = Math.max(0, p.cooldown - dt);
      if (p.reloading > 0) {
        p.reloading -= dt;
        if (p.reloading <= 0) {
          const n = Math.min(WEAPONS[p.weapon].magazine - p.ammo, p.reserve);
          p.ammo += n;
          p.reserve -= n;
          p.reloading = 0;
        }
      }
      movePlayer(p, i, dt, this.boxes);
      if (
        (i.reload || (i.fire && p.ammo === 0)) &&
        p.ammo < WEAPONS[p.weapon].magazine &&
        p.reserve > 0 &&
        p.reloading <= 0
      ) {
        p.reloading = WEAPONS[p.weapon].reload;
        this.event({ type: "reload", player: p.id });
      }
      if (i.fire) this.shoot(p, i);
      if (p.bot && p.reserve <= 0) p.reserve = 90;
    }
  }
  finish() {
    if (this.over) return;
    this.over = true;
    this.event({
      type: "end",
      winner:
        this.score[0] === this.score[1]
          ? -1
          : this.score[0] > this.score[1]
            ? 0
            : 1,
    });
  }
  view() {
    return {
      players: this.players,
      time: this.time,
      remaining: this.remaining,
      score: this.score,
      target: this.target,
      over: this.over,
      events: this.events,
      config: this.config,
    };
  }
  snapshot(since = 0) {
    return {
      players: this.players.map((p) =>
        Object.fromEntries(
          Object.entries(p).map(([key, value]) => [
            key,
            typeof value === "number"
              ? Math.round(value * 10000) / 10000
              : value,
          ]),
        ),
      ),
      time: this.time,
      remaining: this.remaining,
      score: [...this.score],
      target: this.target,
      over: this.over,
      events: this.events.filter((e) => e.id > since).slice(-40),
      config: this.config,
    };
  }
}
