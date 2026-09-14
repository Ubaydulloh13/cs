import test from "node:test";
import assert from "node:assert/strict";
import {
  Simulation,
  blocked,
  movePlayer,
  rayBox,
  sanitizeInput,
} from "../src/game/simulation.js";
import { MAPS, WEAPONS } from "../src/game/config.js";
const tick = (s, seconds) => {
  for (let i = 0; i < seconds * 60; i++) s.step(1 / 60);
};
function duel() {
  const s = new Simulation({ size: 1 });
  const a = s.addPlayer("a", "Alpha", 0),
    b = s.addPlayer("b", "Bravo", 1);
  s.boxes = [];
  a.x = b.x = 0;
  a.z = 0;
  b.z = -10;
  a.protect = b.protect = 0;
  return { s, a, b };
}
test("All requested team sizes contain balanced teams and valid spawn points", () => {
  for (const map of Object.keys(MAPS))
    for (let size = 1; size <= 6; size++) {
      const s = new Simulation({ size, map });
      s.addPlayer("local", "Operator");
      s.fillBots();
      assert.equal(s.players.length, size * 2);
      for (const team of [0, 1])
        assert.equal(s.players.filter((p) => p.team === team).length, size);
      for (const p of s.players)
        assert.equal(blocked(p.x, p.z, s.boxes), false);
    }
});
test("Movement is collision constrained and diagonal speed is normalized", () => {
  const s = new Simulation({ size: 1 });
  const p = s.addPlayer("a", "A");
  p.x = 0;
  p.z = 0;
  const wall = [{ x: 1, z: 0, w: 0.5, d: 10, h: 4 }];
  for (let i = 0; i < 60; i++)
    movePlayer(p, sanitizeInput({ mx: 1 }), 1 / 60, wall);
  assert.ok(p.x < 0.4);
  p.x = 0;
  p.z = 0;
  movePlayer(p, sanitizeInput({ mx: 1, mz: 1 }), 1, []);
  assert.ok(Math.abs(Math.hypot(p.x, p.z) - 4.8) < 0.001);
});
test("Jump applies gravity, crouch slows movement, and invalid inputs are bounded", () => {
  const s = new Simulation({ size: 1 }),
    p = s.addPlayer("a", "A");
  p.x = p.z = 0;
  for (let i = 0; i < 10; i++)
    movePlayer(p, sanitizeInput({ jump: true }), 1 / 60, []);
  assert.ok(p.y > 0.7);
  for (let i = 0; i < 120; i++) movePlayer(p, sanitizeInput({}), 1 / 60, []);
  assert.equal(p.y, 0);
  movePlayer(p, sanitizeInput({ crouch: true, mz: 1 }), 1, []);
  assert.equal(p.crouch, true);
  assert.ok(Math.abs(p.z + 2.3) < 0.001);
  const input = sanitizeInput({
    mx: Infinity,
    mz: 9,
    yaw: NaN,
    pitch: 100,
    weapon: "bad",
  });
  assert.equal(input.mx, 0);
  assert.equal(input.mz, 1);
  assert.equal(input.yaw, 0);
  assert.equal(input.pitch, 1.45);
  assert.equal(input.weapon, null);
});
test("Shooting registers hits, ammo, kills, team scores, and respawn", () => {
  const { s, a, b } = duel();
  s.setInput("a", { yaw: 0, pitch: 0, fire: true, aim: true });
  tick(s, 0.5);
  assert.equal(b.health, 0);
  assert.equal(a.kills, 1);
  assert.equal(b.deaths, 1);
  assert.equal(s.score[0], 1);
  assert.ok(a.ammo < 30);
  s.setInput("a", {});
  tick(s, 3.1);
  assert.equal(b.health, 100);
  assert.equal(b.ammo, 30);
  assert.ok(b.protect > s.time);
});
test("Bullets cannot pass through walls or hit teammates", () => {
  const { s, a, b } = duel();
  s.boxes = [{ x: 0, z: -5, w: 6, d: 1, h: 4 }];
  s.setInput("a", { fire: true, aim: true });
  tick(s, 1);
  assert.equal(b.health, 100);
  assert.ok(a.ammo < 30);
  s.boxes = [];
  b.team = 0;
  tick(s, 1);
  assert.equal(b.health, 100);
});
test("Spawn protection and weapon fire cooldown are enforced", () => {
  const { s, a, b } = duel();
  b.protect = 10;
  s.setInput("a", { fire: true, aim: true });
  tick(s, 1);
  assert.equal(b.health, 100);
  assert.ok(a.shots <= Math.ceil(1 / WEAPONS.ak.rate));
  assert.ok(a.shots > 4);
});
test("Manual reload transfers reserve ammunition without firing during reload", () => {
  const { s, a } = duel();
  a.ammo = 5;
  const reserve = a.reserve;
  s.setInput("a", { reload: true, fire: true });
  tick(s, 0.5);
  assert.equal(a.ammo, 5);
  assert.equal(a.shots, 0);
  s.setInput("a", {});
  tick(s, 2);
  assert.equal(a.ammo, 30);
  assert.equal(a.reserve, reserve - 25);
  assert.equal(a.reloading, 0);
});
test("Match ends on score target and timer, freezes results, snapshots are detached", () => {
  const { s, a } = duel();
  s.target = 1;
  s.setInput("a", { fire: true, aim: true });
  tick(s, 1);
  assert.equal(s.over, true);
  const time = s.time;
  tick(s, 10);
  assert.equal(s.time, time);
  assert.equal(a.kills, 1);
  const snap = s.snapshot();
  snap.players[0].health = 5;
  assert.notEqual(a.health, 5);
  const timed = new Simulation({ duration: 0.1 });
  tick(timed, 1);
  assert.equal(timed.over, true);
  assert.equal(timed.remaining, 0);
});
test("Ray slabs handle parallel rays and distinguish foreground blockers", () => {
  assert.equal(rayBox([0, 1, 0], [0, 0, -1], [-1, 0, -5], [1, 2, -4]), 4);
  assert.equal(
    rayBox([3, 1, 0], [0, 0, -1], [-1, 0, -5], [1, 2, -4]),
    Infinity,
  );
});
test("Switching weapons preserves ammunition and ignores malformed network inputs", () => {
  const { s, a } = duel();
  a.ammo = 3;
  a.reserve = 7;
  s.setInput("a", { slot: 2 });
  tick(s, 0.1);
  assert.equal(a.weapon, "pistol");
  s.setInput("a", { weapon: "ak" });
  tick(s, 0.1);
  assert.equal(a.weapon, "ak");
  assert.equal(a.ammo, 3);
  assert.equal(a.reserve, 7);
  s.setInput("a", null);
  s.step(1 / 60);
  s.setInput("a", { weapon: "constructor" });
  s.step(1 / 60);
  assert.equal(a.weapon, "ak");
});
test("Bots navigate both arenas and fight within a full 6v6 match", () => {
  for (const map of Object.keys(MAPS)) {
    const s = new Simulation({ size: 6, map, duration: 80 });
    s.fillBots();
    const path = s.path(0, 20, 0, -20);
    assert.ok(path.length > 10);
    for (const n of path) assert.equal(blocked(n.x, n.z, s.boxes, 0.6), false);
    tick(s, 80.1);
    assert.ok(
      s.score[0] + s.score[1] > 5,
      `bots must fight on ${map}: ${s.score}`,
    );
    assert.equal(s.over, true);
    for (const p of s.players) {
      assert.ok(p.health >= 0 && p.health <= 100);
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z));
      assert.ok(!blocked(p.x, p.z, s.boxes, 0.3, p.y), `${p.name} inside wall`);
      assert.ok(p.ammo >= 0 && p.ammo <= WEAPONS[p.weapon].magazine);
    }
  }
});
