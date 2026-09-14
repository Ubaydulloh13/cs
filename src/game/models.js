import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { WEAPONS, skinFor } from "./catalog.js";
const textures = new Map();
function finish(s) {
  if (typeof document === "undefined") return null;
  if (textures.has(s.id)) return textures.get(s.id);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = s.color;
  x.fillRect(0, 0, 256, 256);
  x.fillStyle = s.accent;
  for (let i = 0; i < 18; i++) {
    const a = (i * 73) % 256,
      b = (i * 127) % 256;
    x.globalAlpha = s.id === "standard" ? 0.09 : 0.55;
    x.beginPath();
    if (s.evolution === "ice") {
      x.moveTo(a, b);
      x.lineTo(a + 40, b - 25);
      x.lineTo(a + 9, b + 80);
    } else if (s.evolution === "cyber") {
      x.fillRect(a, b, 3, 80);
      x.fillRect(a, b, 40, 3);
    } else {
      x.ellipse(a, b, 24, 7, i * 0.8, 0, Math.PI * 2);
    }
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textures.set(s.id, t);
  return t;
}
export function disposeGroup(g) {
  g.traverse((o) => {
    o.geometry?.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
      m?.dispose(),
    );
  });
}
export function mergeStatic(group) {
  const sets = new Map();
  for (const m of [...group.children]) {
    if (!m.isMesh || m.isSkinnedMesh || Array.isArray(m.material)) continue;
    m.updateMatrix();
    const geo = (
      m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
    ).applyMatrix4(m.matrix);
    const list = sets.get(m.material) || [];
    list.push(geo);
    sets.set(m.material, list);
    group.remove(m);
    m.geometry.dispose();
  }
  for (const [mat, geos] of sets) {
    const geom = mergeGeometries(geos, false);
    if (geom) {
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    geos.forEach((g) => g.dispose());
  }
}
export function makeGun(
  id,
  skinId = "standard",
  knifeId = "combat",
  optic = "red-dot",
) {
  const w = WEAPONS[id] || WEAPONS.ak,
    s = skinFor(skinId),
    g = new THREE.Group();
  g.userData = { weapon: w.id, skin: s.id, knife: knifeId, optic };
  const steel = new THREE.MeshStandardMaterial({
      color: "#292f34",
      metalness: 0.86,
      roughness: 0.32,
    }),
    rubber = new THREE.MeshStandardMaterial({
      color: "#1d2226",
      roughness: 0.87,
    }),
    paint = new THREE.MeshStandardMaterial({
      color: s.evolution === "ice" ? "#d7f3ff" : "#ffffff",
      map: finish(s),
      metalness: s.id === "gold" ? 0.9 : 0.48,
      roughness: s.evolution === "ice" ? 0.15 : 0.36,
    }),
    accent = new THREE.MeshStandardMaterial({
      color: s.accent,
      metalness: 0.7,
      roughness: 0.23,
      emissive: s.evolution ? s.accent : "#000",
      emissiveIntensity: s.evolution ? 0.2 : 0,
    });
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const box = (a, b, c, x, y, z, m = paint) =>
    add(
      new RoundedBoxGeometry(a, b, c, 2, Math.min(a, b, c) * 0.18),
      m,
      x,
      y,
      z,
    );
  const tube = (r, len, x, y, z, m = steel) => {
    const p = add(new THREE.CylinderGeometry(r, r, len, 20), m, x, y, z);
    p.rotation.x = Math.PI / 2;
    return p;
  };
  const profile = (points, depth, x, y, z, mat = paint) => {
    const sh = new THREE.Shape();
    points.forEach(([a, b], i) => (i ? sh.lineTo(a, b) : sh.moveTo(a, b)));
    sh.closePath();
    const geom = new THREE.ExtrudeGeometry(sh, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
      steps: 1,
    });
    geom.rotateY(Math.PI / 2);
    return add(geom, mat, x - depth / 2, y, z);
  };
  if (w.family === "knife") {
    const curved = ["karambit", "talon"].includes(knifeId);
    const grip = box(0.07, 0.075, 0.25, 0, 0, 0.13, rubber);
    grip.rotation.x = -0.14;
    for (let n = 0; n < 5; n++)
      tube(0.044, 0.012, 0, -0.008, 0.03 + n * 0.043, steel);
    if (curved) {
      const ring = add(
        new THREE.TorusGeometry(0.067, 0.016, 12, 32),
        accent,
        0,
        0.012,
        0.32,
      );
      ring.rotation.y = Math.PI / 2;
      profile(
        [
          [0, 0],
          [0.09, 0.06],
          [0.22, 0.01],
          [0.31, -0.1],
          [0.32, -0.23],
          [0.27, -0.34],
          [0.25, -0.15],
          [0.17, -0.07],
          [0.04, -0.07],
        ],
        0.018,
        0,
        0,
        0,
        paint,
      );
    } else {
      const kukri = knifeId === "kukri";
      profile(
        [
          [0, 0.035],
          [0.32, kukri ? 0.09 : 0.035],
          [0.48, kukri ? 0.03 : 0],
          [0.35, -0.055],
          [0.12, kukri ? -0.09 : -0.025],
          [0, -0.025],
        ],
        0.018,
        0,
        0,
        0,
        paint,
      );
      box(0.13, 0.035, 0.025, 0, 0, -0.005, steel);
      if (knifeId === "butterfly") {
        const h = box(0.045, 0.055, 0.28, 0.08, 0, 0.05, accent);
        h.rotation.x = 1.2;
      }
    }
  } else if (w.family === "pistol") {
    box(0.075, 0.075, 0.27, 0, 0.04, -0.02);
    box(0.071, 0.065, 0.19, 0, -0.012, 0.01, steel);
    const h = box(0.07, 0.17, 0.09, 0, -0.12, 0.06, rubber);
    h.rotation.x = -0.22;
    tube(0.014, 0.29, 0, 0.04, -0.04);
    box(0.012, 0.02, 0.018, 0, 0.088, -0.14, accent);
    const guard = add(
      new THREE.TorusGeometry(0.046, 0.008, 8, 20),
      steel,
      0,
      -0.07,
      -0.05,
    );
    guard.rotation.y = Math.PI / 2;
  } else {
    const bull = w.family === "bullpup",
      ak = w.family === "ak",
      scar = w.family === "scar",
      sniper = w.family === "sniper",
      smg = w.family === "smg",
      lmg = w.family === "lmg";
    const length = sniper ? 0.85 : smg ? 0.47 : 0.66;
    profile(
      [
        [-0.21, 0.045],
        [0.28, 0.045],
        [0.32, -0.02],
        [0.22, -0.08],
        [-0.18, -0.065],
      ],
      0.085,
      0,
      0,
      0.06,
    );
    box(0.095, 0.095, length * 0.5, 0, 0.014, -0.29);
    tube(0.019, length * 0.57, 0, 0.01, -length * 0.7);
    tube(0.029, 0.085, 0, 0.01, -length * 0.99);
    const grip = box(0.07, 0.17, 0.095, 0, -0.145, bull ? -0.11 : 0.07, rubber);
    grip.rotation.x = -0.23;
    profile(
      [
        [-0.16, 0.055],
        [0.07, 0.055],
        [0.16, -0.04],
        [0.14, -0.12],
        [-0.14, -0.105],
      ],
      0.07,
      0,
      -0.01,
      0.47,
      bull ? paint : rubber,
    );
    tube(0.025, 0.16, 0, 0, 0.29);
    box(0.09, 0.17, 0.03, 0, -0.04, 0.64, rubber);
    if (lmg) box(0.18, 0.22, 0.19, 0, -0.17, -0.08, paint);
    else if (ak) {
      profile(
        [
          [0, 0],
          [0.085, 0],
          [0.08, -0.13],
          [0.05, -0.23],
          [-0.01, -0.28],
          [-0.055, -0.255],
          [-0.02, -0.14],
        ],
        0.06,
        0,
        -0.05,
        -0.13,
        paint,
      );
    } else {
      const mag = box(
        0.066,
        smg ? 0.2 : 0.21,
        0.1,
        0,
        -0.16,
        bull ? 0.23 : -0.12,
        paint,
      );
      mag.rotation.x = scar ? -0.1 : 0.08;
    }
    for (let n = 0; n < 8; n++) {
      box(0.105, 0.014, 0.022, 0, 0.074, -0.43 + n * 0.045, steel);
      box(0.004, 0.027, 0.022, 0.049, 0.018, -0.44 + n * 0.033, rubber);
    }
    for (let side of [-1, 1]) {
      for (let n = 0; n < 3; n++) {
        const screw = add(
          new THREE.CylinderGeometry(0.008, 0.008, 0.006, 12),
          steel,
          side * 0.05,
          -0.014,
          0.02 - n * 0.075,
        );
        screw.rotation.z = Math.PI / 2;
      }
    }
    const guard = add(
      new THREE.TorusGeometry(0.054, 0.008, 8, 24),
      steel,
      0,
      -0.086,
      0.013,
    );
    guard.rotation.y = Math.PI / 2;
    box(0.11, 0.013, 0.022, 0.015, 0.008, 0.035, accent);
    tube(0.01, 0.07, 0.055, -0.01, -0.03);
    if (sniper || optic === "acog" || optic === "scope") {
      tube(0.043, sniper ? 0.3 : 0.19, 0, 0.155, -0.07);
      tube(0.058, 0.06, 0, 0.155, -0.22);
      tube(0.05, 0.036, 0, 0.155, 0.08);
      box(0.04, 0.07, 0.05, 0, 0.098, -0.05, steel);
      const glass = new THREE.MeshStandardMaterial({
        color: "#4da6a4",
        metalness: 0.45,
        roughness: 0.06,
      });
      tube(0.043, 0.004, 0, 0.155, 0.102, glass);
    } else {
      box(0.07, 0.025, 0.11, 0, 0.091, -0.04, steel);
      box(0.015, 0.07, 0.075, -0.038, 0.135, -0.04, steel);
      box(0.015, 0.07, 0.075, 0.038, 0.135, -0.04, steel);
      box(0.087, 0.015, 0.075, 0, 0.17, -0.04, steel);
    }
    if (lmg)
      for (const side of [-1, 1]) {
        const leg = tube(0.012, 0.28, side * 0.08, -0.13, -0.52);
        leg.rotation.set(0.35, 0, side * 0.3);
      }
  }
  if (s.evolution) {
    for (let n = 0; n < 7; n++) {
      const geo =
        s.evolution === "ice"
          ? new THREE.ConeGeometry(
              0.025 + (n % 3) * 0.01,
              0.11 + (n % 2) * 0.05,
              5,
            )
          : new THREE.ConeGeometry(0.03, 0.095, 8);
      const crystal = add(
        geo,
        accent,
        (n % 2 ? 1 : -1) * 0.057,
        0.065,
        -0.37 + n * 0.065,
      );
      crystal.rotation.z = (n % 2 ? 1 : -1) * 0.6;
      if (w.family === "knife") crystal.scale.setScalar(0.55);
    }
    if (s.evolution === "dragon") {
      profile(
        [
          [0, 0],
          [0.12, 0.05],
          [0.19, 0.02],
          [0.16, -0.04],
          [0.02, -0.04],
        ],
        0.12,
        0,
        0.06,
        -0.46,
        accent,
      );
    }
    if (s.evolution === "cyber") {
      box(0.012, 0.13, 0.23, 0.065, -0.01, -0.23, accent);
      box(0.012, 0.13, 0.23, -0.065, -0.01, -0.23, accent);
    }
  }
  mergeStatic(g);
  return g;
}
