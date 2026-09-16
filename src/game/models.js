import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { WEAPONS, skinFor } from "./catalog.js";
import { detailedAK, detailedM4, getM4Textures } from "./weapon-assets.js";
import { addWeaponBody, addOptic, geometryTools } from "./weapon-geometry.js";
const textures = new Map();
function finish(s, weapon) {
  if (typeof document === "undefined") return null;
  const key = s.id + ":" + weapon.id;
  if (textures.has(key)) return textures.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = s.color;
  x.fillRect(0, 0, 256, 256);
  x.fillStyle = s.accent;
  for (let i = 0; i < 18; i++) {
    const seed = Array.from(weapon.id).reduce((n, c) => n + c.charCodeAt(0), 0);
    const a = (i * 73 + seed) % 256,
      b = (i * 127 + seed * 3) % 256;
    x.globalAlpha = s.id === "standard" ? 0.09 : 0.55;
    x.beginPath();
    if (s.pattern === "shards") {
      x.moveTo(a, b);
      x.lineTo(a + 40, b - 25);
      x.lineTo(a + 9, b + 80);
    } else if (s.pattern === "circuit") {
      x.fillRect(a, b, 3, 80);
      x.fillRect(a, b, 40, 3);
    } else if (s.pattern === "racing" || s.pattern === "tiger") {
      x.moveTo(a, b);
      x.lineTo(a + 25, b - 60);
      x.lineTo(a + 60, b - 75);
      x.lineTo(a + 15, b + 90);
    } else if (s.pattern === "hex" || s.pattern === "scales") {
      for (let j = 0; j < 6; j++) {
        const angle = (j * Math.PI) / 3;
        x.lineTo(a + Math.cos(angle) * 20, b + Math.sin(angle) * 20);
      }
      x.closePath();
    } else if (s.pattern === "wave") {
      x.strokeStyle = s.accent;
      x.lineWidth = 5;
      x.moveTo(0, b);
      x.bezierCurveTo(80, b - 60, 160, b + 60, 256, b);
      x.stroke();
    } else if (s.pattern === "stars") {
      x.arc(a, b, 2 + (i % 3), 0, Math.PI * 2);
    } else if (s.pattern === "engraved") {
      x.strokeStyle = s.accent;
      x.lineWidth = 1;
      x.arc(a, b, 12 + i, 0, Math.PI * 2);
      x.stroke();
    } else {
      x.ellipse(a, b, 24, 7, i * 0.8, 0, Math.PI * 2);
    }
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textures.set(key, t);
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
      map: finish(s, w),
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
  if (s.animated) {
    const time = { value: 0 };
    paint.userData.finishTime = time;
    paint.userData.finishTint = new THREE.Color(s.accent);
    paint.onBeforeCompile = (shader) => {
      shader.uniforms.uFinishTime = time;
      shader.uniforms.uFinishTint = { value: paint.userData.finishTint };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vFinishPosition;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvFinishPosition = position;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vFinishPosition;\nuniform float uFinishTime;\nuniform vec3 uFinishTint;",
        )
        .replace(
          "#include <color_fragment>",
          "#include <color_fragment>\nfloat finishPulse=pow(max(0.0,sin(vFinishPosition.z*28.0+vFinishPosition.y*18.0-uFinishTime*2.2)),12.0);\ndiffuseColor.rgb=mix(diffuseColor.rgb,uFinishTint,finishPulse*0.62);",
        )
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uFinishTint * finishPulse * 0.25;",
        );
    };
    paint.customProgramCacheKey = () => "animated-finish-v1";
  }
  g.userData.animatedMaterials = s.animated ? [paint, accent] : [];
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
  const palette = { paint, steel, rubber, accent };
  const imported = w.id === "ak" ? detailedAK() : null;
  const m4 = ["m4", "hk416"].includes(w.id) ? detailedM4() : null;
  if (m4) {
    const maps = getM4Textures();
    const original = new THREE.MeshStandardMaterial({
      ...maps,
      metalness: 0.56,
      roughness: 0.7,
      normalScale: new THREE.Vector2(0.55, 0.55),
    });
    for (const part of m4) {
      const painted =
        s.id !== "standard" &&
        ["Base", "Stock", "Magazine", "Barrel"].includes(part.name);
      const mesh = add(part.geometry, painted ? paint : original, 0, 0, 0);
      if (w.id === "hk416" && part.name === "Barrel") mesh.scale.z = 0.91;
    }
    if (w.id === "hk416")
      for (let n = 0; n < 9; n++)
        box(0.074, 0.006, 0.012, 0, 0.067, -0.17 - n * 0.025, steel);
    addOptic(g, optic, palette, 0.005);
  } else if (imported) {
    add(imported, paint, 0, 0, 0);
    addOptic(g, optic, palette, -0.025);
  } else if (w.family === "knife") {
    const { plate, curve } = geometryTools(g, palette);
    const curved = ["karambit", "talon"].includes(knifeId);
    // Knives are palm sized: a 12 cm grip, slender bevel and an index-finger ring.
    plate(
      [
        [-0.067, 0.018],
        [0.045, 0.02],
        [0.06, 0.006],
        [0.043, -0.025],
        [-0.063, -0.026],
      ],
      0.024,
      0,
      -0.01,
      0,
      rubber,
    );
    for (let n = 0; n < 4; n++)
      box(0.027, 0.005, 0.006, 0, 0.012, -0.025 + n * 0.023, accent);
    if (curved) {
      const ring = add(
        new THREE.TorusGeometry(0.021, 0.0045, 12, 36),
        steel,
        0,
        0.0,
        0.088,
      );
      ring.rotation.y = Math.PI / 2;
      const shape = new THREE.Shape();
      shape.moveTo(0.046, 0.014);
      shape.bezierCurveTo(0.13, 0.045, 0.18, -0.018, 0.17, -0.098);
      shape.bezierCurveTo(0.16, -0.056, 0.125, -0.048, 0.104, -0.048);
      shape.bezierCurveTo(0.07, -0.043, 0.064, -0.023, 0.046, -0.017);
      const blade = new THREE.ExtrudeGeometry(shape, {
        depth: 0.006,
        bevelEnabled: true,
        bevelSize: 0.002,
        bevelThickness: 0.001,
        bevelSegments: 3,
        curveSegments: 32,
      });
      blade.rotateY(Math.PI / 2);
      add(blade, paint, -0.003, -0.008, 0);
      curve(
        [
          [0, 0.016, -0.05],
          [0, 0.025, -0.092],
          [0, 0.005, -0.137],
          [0, -0.023, -0.158],
        ],
        0.0015,
        steel,
      );
    } else {
      const length = knifeId === "kukri" ? 0.23 : knifeId === "m9" ? 0.2 : 0.16;
      plate(
        [
          [0.045, 0.021],
          [length * 0.8, knifeId === "kukri" ? 0.035 : 0.019],
          [length, 0],
          [length * 0.75, -0.02],
          [0.05, -0.021],
        ],
        0.005,
        0,
        -0.005,
        0,
        paint,
      );
      box(0.06, 0.006, 0.012, 0, -0.005, -0.041, steel);
      if (knifeId === "butterfly") {
        const h = box(0.014, 0.027, 0.12, 0.025, -0.006, 0.027, accent);
        h.rotation.x = 0.18;
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
    addWeaponBody(g, w.id, palette);
    addOptic(
      g,
      optic,
      palette,
      ["famas", "g36", "p90"].includes(w.id) ? 0.07 : 0,
    );
  }
  if (s.evolution) {
    for (let n = 0; n < 5; n++) {
      const geo =
        s.evolution === "ice"
          ? new THREE.ConeGeometry(
              0.009 + (n % 3) * 0.003,
              0.023 + (n % 2) * 0.008,
              5,
            )
          : new THREE.ConeGeometry(0.009, 0.026, 12);
      const crystal = add(
        geo,
        accent,
        (n % 2 ? 1 : -1) * 0.057,
        -0.018,
        -0.29 + n * 0.047,
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
export function updateGunAnimation(g, time) {
  for (const material of g.userData.animatedMaterials || []) {
    if (material.userData.finishTime) material.userData.finishTime.value = time;
    else
      material.emissiveIntensity =
        0.15 + 0.18 * (0.5 + 0.5 * Math.sin(time * 2.2));
  }
}
