import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { parseAK } from "../src/game/weapon-assets.js";
import { SKINS } from "../src/game/catalog.js";
import {
  makeGun,
  updateGunAnimation,
  disposeGroup,
} from "../src/game/models.js";
test("The shipped detailed AK model has real weapon dimensions and UVs", async () => {
  const text = await readFile(
    new URL("../public/models/ak47.obj", import.meta.url),
    "utf8",
  );
  const geometry = parseAK(text);
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  assert.ok(size.z > 0.9 && size.z < 1);
  assert.ok(size.x < 0.1 && size.y < 0.3);
  assert.ok(geometry.attributes.position.count > 50000);
  assert.equal(
    geometry.attributes.uv.count,
    geometry.attributes.position.count,
  );
  geometry.dispose();
});
test("Finish catalog has ten static, ten animated and ten animated broadcast skins; shader clock advances", () => {
  for (const tier of ["static", "animated", "broadcast"])
    assert.equal(SKINS.filter((s) => s.tier === tier).length, 10);
  const g = makeGun("m4", "plasma");
  updateGunAnimation(g, 4.2);
  const paint = g.userData.animatedMaterials.find((m) => m.userData.finishTime);
  assert.equal(paint.userData.finishTime.value, 4.2);
  const source = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  };
  paint.onBeforeCompile(source);
  assert.ok(source.fragmentShader.includes("finishPulse"));
  assert.ok(source.uniforms.uFinishTime);
  disposeGroup(g);
});
