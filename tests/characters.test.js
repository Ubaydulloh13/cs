import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { buildOperator } from "../src/game/characters.js";

// Exercise the actual shipped skeleton and animations without a WebGL context.
// Only image materials are removed; skin weights, nodes and clips are unchanged.
globalThis.ProgressEvent ??= class {
  constructor(type, data) { Object.assign(this, { type }, data); }
};
const bytes = await readFile(new URL("../public/models/soldier.glb", import.meta.url));
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const binaryStart = 20 + jsonLength;
gltf.buffers[0].uri = "data:application/octet-stream;base64," + bytes.subarray(binaryStart + 8).toString("base64");
gltf.materials = [{ name: "test" }];
for (const mesh of gltf.meshes)
  for (const primitive of mesh.primitives) primitive.material = 0;
delete gltf.images;
delete gltf.textures;
delete gltf.samplers;
const asset = await new GLTFLoader().parseAsync(JSON.stringify(gltf), "");
function bounds(actor) {
  actor.g.updateMatrixWorld(true);
  actor.model.traverse((o) => o.skeleton?.update());
  return new THREE.Box3().setFromObject(actor.model, true);
}
test("actual operator remains human sized and at floor through movement/crouch transitions", () => {
  const actor = buildOperator(asset);
  for (const pose of [
    {}, { moving: true }, { moving: true, sprint: true }, { crouch: true },
    { crouch: true, moving: true }, {},
  ]) {
    for (let frame = 0; frame < 90; frame++) {
      actor.update(1 / 30, pose);
      if (frame % 10) continue;
      const b = bounds(actor);
      const size = b.getSize(new THREE.Vector3());
      assert.ok(size.y > (pose.crouch ? 0.85 : 1.25), `height too short: ${size.y}`);
      assert.ok(size.y < (pose.crouch ? 1.2 : 1.8), `height too large: ${size.y}`);
      assert.ok(b.min.y > -0.12 && b.min.y < 0.18, `floating feet: ${b.min.y}`);
      assert.ok(size.x < 1.2 && size.z < 1.25, `body stretches outside player envelope: ${size.toArray()}`);
    }
  }
  actor.dispose();
});
test("each clone owns its pose and materials; moving one does not move another", () => {
  const first = buildOperator(asset);
  const second = buildOperator(asset, "frost");
  const oldSecond = bounds(second).clone();
  first.g.position.set(8, 2, -9);
  for (let n = 0; n < 150; n++) first.update(1 / 30, { moving: true });
  assert.ok(bounds(second).min.distanceTo(oldSecond.min) < 0.00001);
  first.dispose();
  second.update(0.01, {});
  assert.ok(bounds(second).getSize(new THREE.Vector3()).y < 1.8);
  second.dispose();
});
