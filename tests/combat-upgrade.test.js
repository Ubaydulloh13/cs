import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Simulation, sanitizeInput } from "../src/game/simulation.js";
import { PRIMARY_WEAPONS, KNIVES, WEAPONS } from "../src/game/catalog.js";
import { makeGun, disposeGroup } from "../src/game/models.js";
test("All 24 primaries fire continuously exactly along camera center including ADS at elevation", () => {
  assert.equal(PRIMARY_WEAPONS.length, 24);
  for (const weapon of PRIMARY_WEAPONS) {
    const sim = new Simulation({ size: 1 });
    sim.boxes = [];
    const p = sim.addPlayer("a", "A", 0, false, weapon.id);
    p.x = p.z = p.y = 0;
    p.yaw = 0.42;
    p.pitch = 0.27;
    for (let n = 0; n < 4; n++) {
      p.cooldown = 0;
      sim.shoot(p, sanitizeInput({ aim: true }));
      const e = sim.events.at(-1),
        actual = new THREE.Vector3(...e.to)
          .sub(new THREE.Vector3(...e.from))
          .normalize(),
        camera = new THREE.PerspectiveCamera();
      camera.rotation.set(p.pitch, p.yaw, 0, "YXZ");
      const expected = camera.getWorldDirection(new THREE.Vector3());
      assert.ok(actual.distanceTo(expected) < 1e-8, weapon.name);
      assert.equal(p.pitch, 0.27);
    }
  }
});
test("AWP hits a crouching target, preserves scope direction and kills with one body shot", () => {
  const sim = new Simulation({ size: 1 });
  sim.boxes = [];
  const a = sim.addPlayer("a", "A", 0, false, "awp"),
    b = sim.addPlayer("b", "B", 1);
  a.x = b.x = 0;
  a.y = b.y = 0;
  a.z = 0;
  b.z = -20;
  a.pitch = Math.atan2(0.7 - 1.65, 20);
  b.crouch = true;
  b.protect = 0;
  sim.shoot(a);
  assert.equal(b.health, 0);
  assert.equal(a.ammo, 9);
});
test("Loadout locks main gun and knife has range, cooldown and endless uses", () => {
  const sim = new Simulation({ size: 1 });
  sim.boxes = [];
  const a = sim.addPlayer("a", "A", 0, false, "scar", "glacier", {
      knife: "karambit",
      knifeSkin: "glacier",
    }),
    b = sim.addPlayer("b", "B", 1);
  a.x = b.x = a.y = b.y = 0;
  a.z = 0;
  b.z = -4;
  b.protect = 0;
  sim.setInput("a", { weapon: "awp" });
  sim.step(0.02);
  assert.equal(a.weapon, "scar");
  sim.setInput("a", { slot: 3 });
  sim.step(0.02);
  assert.equal(a.weapon, "knife");
  a.cooldown = 0;
  sim.shoot(a);
  assert.equal(b.health, 100);
  b.z = -2;
  sim.shoot(a);
  assert.equal(b.health, 100);
  a.cooldown = 0;
  sim.shoot(a);
  assert.equal(b.health, 0);
  assert.equal(a.ammo, 1);
  const kill = sim.events.find((e) => e.type === "kill");
  assert.equal(kill.skin, "glacier");
  assert.equal(kill.knife, "karambit");
  sim.spawn(a);
  assert.equal(a.weapon, "scar");
});
test("Detailed weapon and knife meshes have finite geometry, and evolved skins change silhouette", () => {
  for (const w of Object.values(WEAPONS)) {
    const g = makeGun(w.id, "standard");
    const box = new THREE.Box3().setFromObject(g);
    assert.ok(Number.isFinite(box.min.x));
    assert.ok(box.getSize(new THREE.Vector3()).length() > 0.1);
    disposeGroup(g);
  }
  for (const k of KNIVES) {
    const g = makeGun("knife", "glacier", k.id);
    assert.equal(g.userData.knife, k.id);
    disposeGroup(g);
  }
  const base = makeGun("scar"),
    ice = makeGun("scar", "glacier");
  const count = (g) =>
    g.children.reduce(
      (n, o) => n + (o.geometry?.attributes.position.count || 0),
      0,
    );
  assert.ok(count(ice) > count(base));
  disposeGroup(base);
  disposeGroup(ice);
});
