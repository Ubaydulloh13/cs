import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
let akGeometry, pending;
export function parseAK(text) {
  const model = new OBJLoader().parse(text),
    geometry = model.children.find((o) => o.isMesh).geometry.clone();
  geometry.translate(-2.44368, -0.8, 0);
  geometry.scale(0.105, 0.105, 0.105);
  const positions = geometry.attributes.position,
    uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    uv[i * 2] = positions.getZ(i) * 2.4 + 0.5;
    uv[i * 2 + 1] = positions.getY(i) * 3.5 + 0.5;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.computeBoundingBox();
  return geometry;
}
export function loadWeaponAssets() {
  if (akGeometry) return Promise.resolve();
  if (!pending)
    pending = fetch("/models/ak47.obj")
      .then((r) => {
        if (!r.ok) throw Error("AK model did not load");
        return r.text();
      })
      .then((text) => {
        akGeometry = parseAK(text);
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  return pending;
}
export const detailedAK = () => akGeometry?.clone() || null;
