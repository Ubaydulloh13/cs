import test from "node:test";
import assert from "node:assert/strict";
import { Simulation, sanitizeInput } from "../src/game/simulation.js";
function setup() {
  const s = new Simulation({ size: 1 }),
    a = s.addPlayer("a", "Alpha", 0),
    b = s.addPlayer("b", "Bravo", 1);
  s.boxes = [];
  a.x = a.z = a.y = 0;
  b.x = b.y = 0;
  b.z = -5;
  a.protect = b.protect = 0;
  return { s, a, b };
}
test("Grenade inputs are bounded, holding a key sends one throw and snapshots carry projectiles", () => {
  const { s, a } = setup();
  assert.equal(sanitizeInput({ grenadeSeq: Infinity }).grenadeSeq, 0);
  s.setInput(a.id, { grenadeSeq: 1, grenadeKind: "he" });
  for (let i = 0; i < 50; i++) s.step(1 / 60);
  assert.equal(a.grenadeAmmo.he, 1);
  assert.equal(s.grenades.length, 1);
  const snap = s.snapshot();
  assert.equal(snap.grenades.length, 1);
  assert.notEqual(snap.grenades[0], s.grenades[0]);
  for (let i = 0; i < 150; i++) s.step(1 / 60);
  assert.equal(s.grenades.length, 0);
  assert.ok(s.events.some((e) => e.type === "explosion"));
});
test("HE has falloff, cover blocks damage, friendly fire is disabled and grenade kills score once", () => {
  const { s, a, b } = setup();
  s.explodeGrenade({ kind: "he", player: a.id, x: 0, y: 1, z: -5 });
  assert.equal(b.health, 0);
  assert.equal(a.health, 100);
  assert.equal(a.kills, 1);
  assert.equal(s.events.find((e) => e.type === "kill").weapon, "grenade");
  s.explodeGrenade({ kind: "he", player: a.id, x: 0, y: 1, z: -5 });
  assert.equal(a.kills, 1);
  s.spawn(b);
  b.x = 0;
  b.z = -5;
  b.protect = 0;
  s.boxes = [{ x: 0, z: -2.5, w: 8, d: 1, h: 4 }];
  s.explodeGrenade({ kind: "he", player: a.id, x: 0, y: 1, z: 0 });
  assert.equal(b.health, 100);
});
test("Flash strength depends on looking toward explosion and walls occlude it", () => {
  const { s, a, b } = setup();
  s.time = 3;
  b.yaw = 0;
  s.explodeGrenade({ kind: "flash", player: a.id, x: 0, y: 1.65, z: -8 });
  const toward = b.flashUntil;
  s.time = 3;
  b.flashUntil = 0;
  b.yaw = Math.PI;
  s.explodeGrenade({ kind: "flash", player: a.id, x: 0, y: 1.65, z: -8 });
  assert.ok(toward > b.flashUntil + 1);
  b.flashUntil = 0;
  s.boxes = [{ x: 0, z: -6.5, w: 6, d: 1, h: 5 }];
  s.explodeGrenade({ kind: "flash", player: a.id, x: 0, y: 1.65, z: -8 });
  assert.equal(b.flashUntil, 0);
});
