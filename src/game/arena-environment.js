import * as T from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { mergeStatic } from "./models.js";
import { ARENA_BUILDINGS } from "./arena-map.js";

export function buildArena(scene, renderer, map) {
  const root = new T.Group(),
    textures = [],
    loader = new T.TextureLoader();
  scene.add(root);
  const texture = (name, kind) => {
    const t = loader.load(`/textures/${name}-${kind}.jpg`);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (kind === "color") t.colorSpace = T.SRGBColorSpace;
    textures.push(t);
    return t;
  };
  const pbr = (name, color, metalness = 0) =>
    new T.MeshStandardMaterial({
      color,
      map: texture(name, "color"),
      normalMap: texture(name, "normal"),
      roughnessMap: texture(name, "rough"),
      normalScale: new T.Vector2(0.65, 0.65),
      roughness: 0.9,
      metalness,
    });
  const grass = pbr("grass", "#b7baa5"),
    dirt = pbr("path", "#dad5c4"),
    metal = pbr("metal", "#7a9695", 0.35),
    blue = metal.clone();
  blue.color.set("#607b85");
  const roof = metal.clone();
  roof.color.set("#b7c0bd");
  const wood = pbr("timber", "#b7a48b"),
    concrete = pbr("concrete", "#d5d4c6"),
    stone = pbr("limestone", "#dedacf");
  const steel = new T.MeshStandardMaterial({
    color: "#65757a",
    metalness: 0.65,
    roughness: 0.6,
  });
  const dark = new T.MeshStandardMaterial({
    color: "#353b38",
    roughness: 0.83,
  });
  const add = (geometry, mat, x, y, z) => {
    const m = new T.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const uv = (geo, scale = 2.4) => {
    const p = geo.attributes.position,
      n = geo.attributes.normal,
      t = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const nx = Math.abs(n.getX(i)),
        ny = Math.abs(n.getY(i)),
        nz = Math.abs(n.getZ(i));
      t.setXY(
        i,
        (nx > ny && nx > nz ? p.getZ(i) : p.getX(i)) / scale,
        (ny > nx && ny > nz ? -p.getZ(i) : p.getY(i)) / scale,
      );
    }
    return geo;
  };
  const box = (w, h, d, x, y, z, mat = steel) =>
    add(uv(new T.BoxGeometry(w, h, d)), mat, x, y, z);
  const beam = (a, b, width = 0.12, mat = steel) => {
    const from = new T.Vector3(...a),
      to = new T.Vector3(...b),
      mid = from.clone().add(to).multiplyScalar(0.5),
      m = box(width, from.distanceTo(to), width, ...mid.toArray(), mat);
    m.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      to.sub(from).normalize(),
    );
    return m;
  };
  grass.color.set("#839578");
  const floor = box(150, 0.12, 150, 0, -0.07, 0, grass);
  uv(floor.geometry, 6);
  floor.castShadow = false;
  // Feathered edges let the worn path blend into grass instead of drawing
  // disconnected rectangular carpets. The paths do not affect collision.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d"),
    gradient = ctx.createLinearGradient(0, 0, 64, 0);
  gradient.addColorStop(0, "black");
  gradient.addColorStop(0.18, "white");
  gradient.addColorStop(0.82, "white");
  gradient.addColorStop(1, "black");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const edge = new T.CanvasTexture(canvas);
  textures.push(edge);
  const pathMat = dirt.clone();
  pathMat.alphaMap = edge;
  pathMat.transparent = true;
  pathMat.depthWrite = false;
  const paths = new T.Group();
  scene.add(paths);
  for (const [x, z, w, d, rotate] of [
    [-10.5, 0, 5, 44, 0],
    [10.5, 0, 5, 44, 0],
    [0, -10, 5, 48, 1],
    [0, 10, 5, 48, 1],
    [0, 0, 5, 43, 0],
  ]) {
    const geo = new T.PlaneGeometry(w, d);
    const mat = pathMat.clone();
    mat.map = dirt.map.clone();
    mat.normalMap = dirt.normalMap.clone();
    mat.roughnessMap = dirt.roughnessMap.clone();
    for (const t of [mat.map, mat.normalMap, mat.roughnessMap]) {
      t.repeat.set(w / 3, d / 3);
      textures.push(t);
    }
    const m = new T.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = (rotate * Math.PI) / 2;
    m.position.set(x, 0.009, z);
    m.receiveShadow = true;
    paths.add(m);
  }
  for (const b of map.boxes) {
    const mat = ["warehouse", "container", "cabin", "roof"].includes(b.kind)
      ? b.kind === "roof"
        ? roof
        : b.kind === "warehouse"
          ? blue
          : metal
      : b.kind === "crate"
        ? wood
        : b.kind === "logs"
          ? wood
          : concrete;
    if (b.kind === "logs") {
      // A closed backboard matches the full collision solid; there are no
      // misleading visible gaps that a shot could seemingly pass through.
      box(b.w, b.h, b.d, b.x, (b.y || 0) + b.h / 2, b.z, wood);
      for (let y = 0.2; y < b.h; y += 0.35) {
        const m = add(
          new T.CylinderGeometry(0.18, 0.2, b.d, 12),
          wood,
          b.x,
          0.18 + y,
          b.z,
        );
        m.rotation.x = Math.PI / 2;
      }
      for (const z of [-b.d / 2 + 0.4, b.d / 2 - 0.4])
        box(0.15, b.h + 0.15, 0.12, b.x - 0.4, b.h / 2, b.z + z, steel);
    } else {
      box(b.w, b.h, b.d, b.x, (b.y || 0) + b.h / 2, b.z, mat);
      if (b.kind === "boundary") {
        box(b.w + 0.08, 0.13, b.d + 0.08, b.x, b.h + 0.04, b.z, stone);
        if (b.w > b.d)
          for (let x = -b.w / 2; x <= b.w / 2; x += 3.2)
            box(0.3, b.h + 0.15, 0.32, b.x + x, b.h / 2, b.z, stone);
        else
          for (let z = -b.d / 2; z <= b.d / 2; z += 3.2)
            box(0.32, b.h + 0.15, 0.3, b.x, b.h / 2, b.z + z, stone);
      }
      if (b.kind === "crate")
        for (const h of [0.13, b.h - 0.13])
          box(b.w + 0.04, 0.1, b.d + 0.04, b.x, h, b.z, dark);
      if (["warehouse", "container", "cabin"].includes(b.kind)) {
        // Actual corrugation catches highlights at close range, texture supplies
        // the weathering. Thin ribs are merged with their wall material.
        if (b.w > b.d)
          for (let x = -b.w / 2 + 0.09; x < b.w / 2; x += 0.19)
            box(
              0.025,
              b.h,
              0.045,
              b.x + x,
              (b.y || 0) + b.h / 2,
              b.z + b.d / 2 + 0.014,
              mat,
            );
        else
          for (let z = -b.d / 2 + 0.09; z < b.d / 2; z += 0.19)
            box(
              0.045,
              b.h,
              0.025,
              b.x + b.w / 2 + 0.014,
              (b.y || 0) + b.h / 2,
              b.z + z,
              mat,
            );
      }
    }
  }
  for (const b of ARENA_BUILDINGS) {
    if (b.kind === "warehouse") {
      box(b.w, 0.05, b.d, b.x, 0.015, b.z, concrete);
      for (const sx of [-1, 1])
        for (const z of [-7.5, -3.8, 0, 3.8, 7.5]) {
          box(0.16, b.h, 0.16, sx * 8, b.h / 2, z, steel);
          beam([sx * 8, b.h, z], [0, b.h + 2.1, z], 0.13);
          beam([-8, b.h, z], [8, b.h, z], 0.1);
          beam([sx * 7.8, b.h, z], [sx * 4, b.h + 1, z], 0.08);
        }
      // Roof panels leave two long skylights over the playable interior.
      const angle = Math.atan2(2.1, 8);
      for (const side of [-1, 1])
        for (const [start, end] of [
          [0, 2.2],
          [3.2, 8.35],
        ]) {
          const mid = (start + end) / 2,
            m = box(
              (end - start) / Math.cos(angle),
              0.1,
              16.1,
              side * mid,
              b.h + 2.1 - mid * Math.tan(angle),
              0,
              roof,
            );
          m.rotation.z = -side * angle;
        }
      for (const side of [-1, 1])
        box(16.25, 0.14, 0.12, 0, b.h, side * 7.7, steel);
      // End roof fascia is a triangle, not a solid box extending to the ground.
      for (const side of [-1, 1]) {
        const shape = new T.Shape();
        shape.moveTo(-8, 0);
        shape.lineTo(8, 0);
        shape.lineTo(0, 2.1);
        shape.closePath();
        const geo = new T.ShapeGeometry(shape);
        const m = add(geo, blue, 0, b.h, side * 7.5);
        if (side < 0) m.rotation.y = Math.PI;
      }
    } else {
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          box(
            0.11,
            b.h + 0.1,
            0.11,
            b.x + (sx * b.w) / 2,
            b.h / 2,
            b.z + (sz * b.d) / 2,
            steel,
          );
      for (const side of [-1, 1])
        box(b.w + 0.15, 0.1, 0.1, b.x, b.h, b.z + (side * b.d) / 2, steel);
    }
  }
  // A distant treeline and low rolling hills frame the arena without extra
  // collision solids or thousands of individual leaf meshes.
  const hillMat = grass.clone();
  hillMat.color.set("#85977c");
  const heightAt = (x, z) => {
    const t = T.MathUtils.smoothstep(Math.hypot(x, z), 30, 70);
    return (
      -0.15 +
      t *
        (5 +
          Math.sin(x * 0.067) * 2.8 +
          Math.cos(z * 0.055) * 2.3 +
          Math.sin((x + z) * 0.032) * 2)
    );
  };
  const terrain = new T.PlaneGeometry(240, 240, 72, 72);
  terrain.rotateX(-Math.PI / 2);
  const positions = terrain.attributes.position;
  for (let i = 0; i < positions.count; i++)
    positions.setY(i, heightAt(positions.getX(i), positions.getZ(i)));
  terrain.computeVertexNormals();
  uv(terrain, 7);
  add(terrain, hillMat, 0, 0, 0).castShadow = false;
  const bark = new T.MeshStandardMaterial({ color: "#706958", roughness: 1 });
  // A cutout of small leaves and branching twigs keeps a natural silhouette
  // with just six triangles per tree, instead of solid polygonal canopies.
  const leafCanvas = document.createElement("canvas");
  leafCanvas.width = leafCanvas.height = 512;
  const leafCtx = leafCanvas.getContext("2d");
  let seed = 2187;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const branch = (x, y, length, angle, depth) => {
    const ex = x + Math.sin(angle) * length,
      ey = y - Math.cos(angle) * length;
    leafCtx.strokeStyle = depth > 1 ? "#655e47" : "#626249";
    leafCtx.lineWidth = Math.max(1, depth * 1.6);
    leafCtx.beginPath();
    leafCtx.moveTo(x, y);
    leafCtx.lineTo(ex, ey);
    leafCtx.stroke();
    if (depth > 0)
      for (const side of [-1, 1])
        branch(
          ex,
          ey,
          length * (0.62 + random() * 0.15),
          angle + side * (0.3 + random() * 0.43),
          depth - 1,
        );
    if (depth < 3)
      for (let j = 0; j < 80; j++) {
        const a = random() * Math.PI * 2,
          r = Math.sqrt(random()) * length * 0.8;
        leafCtx.fillStyle = [
          "#455c3b",
          "#62774a",
          "#768553",
          "#384f34",
          "#8b9660",
        ][Math.floor(random() * 5)];
        leafCtx.beginPath();
        leafCtx.ellipse(
          ex + Math.cos(a) * r,
          ey + Math.sin(a) * r * 0.7,
          2 + random() * 4,
          1 + random() * 2.5,
          a,
          0,
          Math.PI * 2,
        );
        leafCtx.fill();
      }
  };
  branch(256, 500, 118, 0, 5);
  const leafMap = new T.CanvasTexture(leafCanvas);
  leafMap.colorSpace = T.SRGBColorSpace;
  textures.push(leafMap);
  const leaves = new T.MeshStandardMaterial({
    map: leafMap,
    alphaTest: 0.45,
    side: T.DoubleSide,
    roughness: 1,
  });
  for (let i = 0; i < 30; i++) {
    const a = i * 2.399,
      r = 36 + (i % 5) * 6,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      h = 5 + (i % 4) * 0.7;
    const base = heightAt(x, z);
    add(new T.CylinderGeometry(0.05, 0.17, h, 7), bark, x, base + h / 2, z);
    for (let j = 0; j < 3; j++) {
      const m = add(
        new T.PlaneGeometry(5.4, 6.2),
        leaves,
        x,
        base + h - 0.4,
        z,
      );
      m.rotation.y = i * 0.79 + (j * Math.PI) / 3;
      m.castShadow = false;
    }
  }
  mergeStatic(root);
  let disposed = false,
    sky,
    env;
  new HDRLoader().load("/textures/daylight.hdr", (t) => {
    if (disposed) {
      t.dispose();
      return;
    }
    t.mapping = T.EquirectangularReflectionMapping;
    const pmrem = new T.PMREMGenerator(renderer);
    env = pmrem.fromEquirectangular(t);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.65;
    scene.background = t;
    scene.backgroundIntensity = 0.8;
    scene.backgroundRotation.y = 0.7;
    sky = t;
    pmrem.dispose();
  });
  return {
    dispose() {
      disposed = true;
      textures.forEach((t) => t.dispose());
      sky?.dispose();
      env?.dispose();
    },
  };
}
