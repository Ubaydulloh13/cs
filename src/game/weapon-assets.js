import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
let akGeometry, m4Model, pending;
const m4Textures = {};
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
  if (akGeometry && m4Model) return Promise.resolve();
  if (!pending)
    pending = Promise.all([
      fetch("/models/ak47.obj")
        .then((r) => {
          if (!r.ok) throw Error("AK model did not load");
          return r.text();
        })
        .then((text) => {
          akGeometry = parseAK(text);
        }),
      fetch("/models/m4a1.glb")
        .then((r) => {
          if (!r.ok) throw Error("M4 model did not load");
          return r.arrayBuffer();
        })
        .then((data) => new GLTFLoader().parseAsync(data, ""))
        .then((asset) => {
          m4Model = asset.scene;
        }),
    ]).catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}
export const detailedAK = () => akGeometry?.clone() || null;
export const detailedM4 = () => {
  if (!m4Model) return null;
  const parts=[];
  m4Model.traverse(o=>{if(o.isMesh)parts.push({name:o.name,geometry:o.geometry.clone()});});
  return parts;
};
export function getM4Textures() {
  if (typeof document === "undefined") return {};
  if (!m4Textures.map) {
    const loader = new THREE.TextureLoader();
    m4Textures.map = loader.load("/textures/m4-Base_Color.jpg");
    m4Textures.map.colorSpace = THREE.SRGBColorSpace;
    m4Textures.normalMap = loader.load("/textures/m4-Normal.jpg");
    m4Textures.roughnessMap = loader.load("/textures/m4-Roughness.jpg");
  }
  return m4Textures;
}
