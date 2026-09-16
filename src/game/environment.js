import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { mergeStatic } from "./models.js";

// All surfaces use metre-scaled UVs. Sharing materials allows the static
// architecture to batch into a few dozen draws instead of thousands of props.
export function buildEnvironment(scene, renderer, map, mapId) {
  const root = new THREE.Group();
  root.name = "architecture";
  scene.add(root);
  const textures = [],
    loader = new THREE.TextureLoader();
  const load = (name, channel) => {
    const texture = loader.load(`/textures/${name}-${channel}.jpg`);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (channel === "color") texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    return texture;
  };
  const pbr = (name, color = "#ffffff", scale = 1) =>
    new THREE.MeshStandardMaterial({
      color,
      map: load(name, "color"),
      normalMap: load(name, "normal"),
      roughnessMap: load(name, "rough"),
      roughness: 1,
      normalScale: new THREE.Vector2(scale, scale),
    });
  const stone = pbr("limestone", "#eeeae2", 0.85);
  const masonry = pbr("masonry", "#ede9df", 0.7);
  const plaster = pbr("stucco", "#eee8da", 0.5);
  const wood = pbr("timber", "#c6b199", 0.55);
  const roof = pbr("tiles", "#c5a899", 0.8);
  const cobble = pbr("cobble", "#ede8dc", 0.95);
  const green = wood.clone();
  green.color.set("#727e63");
  const blue = wood.clone();
  blue.color.set("#647b81");
  const oak = wood.clone();
  oak.color.set("#90806a");
  const iron = new THREE.MeshStandardMaterial({
    color: "#383d3c",
    metalness: 0.7,
    roughness: 0.7,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: "#243535",
    metalness: 0.25,
    roughness: 0.22,
  });
  const pale = plaster.clone();
  pale.color.set("#d7d3c4");
  const ochre = plaster.clone();
  ochre.color.set("#cfb37e");
  const terracotta = new THREE.MeshStandardMaterial({
    color: "#936b50",
    roughness: 0.92,
  });
  const surfaces = [plaster, pale, ochre, masonry];

  const uvMetres = (geometry, period = 2.4) => {
    const p = geometry.attributes.position,
      n = geometry.attributes.normal,
      uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const nx = Math.abs(n.getX(i)),
        ny = Math.abs(n.getY(i)),
        nz = Math.abs(n.getZ(i));
      const u = nx > nz && nx > ny ? p.getZ(i) : p.getX(i);
      const v = ny > nx && ny > nz ? -p.getZ(i) : p.getY(i);
      uv.setXY(i, u / period, v / period);
    }
    return geometry;
  };
  const mesh = (geometry, mat, x, y, z, parent = root) => {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (w, h, d, x, y, z, mat, parent = root, bevel = 0) =>
    mesh(
      uvMetres(
        bevel && w > 1 && d > 1 && h > 0.2
          ? new RoundedBoxGeometry(
              w,
              h,
              d,
              1,
              Math.min(bevel, w / 3, h / 3, d / 3),
            )
          : new THREE.BoxGeometry(w, h, d),
      ),
      mat,
      x,
      y,
      z,
      parent,
    );
  const rod = (r, h, x, y, z, mat, parent = root) =>
    mesh(new THREE.CylinderGeometry(r, r, h, 10), mat, x, y, z, parent);
  const front = (x, z, angle = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = angle;
    root.add(g);
    return g;
  };
  const cap = (w, d, x, y, z, parent = root) => {
    box(w + 0.16, 0.14, d + 0.16, x, y, z, stone, parent, 0.025);
    box(w + 0.28, 0.09, d + 0.28, x, y + 0.1, z, stone, parent, 0.02);
  };
  function windowAt(g, x, y, shutter = green, balcony = false) {
    box(0.88, 1.4, 0.055, x, y, 0.035, glass, g);
    for (const side of [-1, 1]) {
      box(0.13, 1.66, 0.16, x + side * 0.53, y, 0.09, stone, g, 0.018);
      const leaf = new THREE.Group();
      leaf.position.set(x + side * 0.61, y, 0.15);
      leaf.rotation.y = side * 0.2;
      g.add(leaf);
      box(0.46, 1.37, 0.065, side * 0.22, 0, 0, shutter, leaf, 0.014);
      for (let i = 0; i < 11; i++)
        box(
          0.4,
          0.046,
          0.035,
          side * 0.22,
          -0.58 + i * 0.111,
          0.052,
          shutter,
          leaf,
        );
      for (const h of [-0.42, 0.42])
        box(0.43, 0.048, 0.015, side * 0.22, h, 0.08, iron, leaf);
    }
    box(1.2, 0.13, 0.22, x, y + 0.8, 0.07, stone, g, 0.02);
    box(1.27, 0.13, 0.35, x, y - 0.76, 0.1, stone, g, 0.018);
    box(0.042, 1.38, 0.06, x, y, 0.08, oak, g);
    box(0.86, 0.04, 0.06, x, y + 0.12, 0.08, oak, g);
    if (balcony) {
      box(1.6, 0.14, 0.65, x, y - 0.87, 0.27, stone, g, 0.02);
      for (let i = 0; i < 9; i++)
        rod(0.012, 0.78, x - 0.69 + i * 0.173, y - 0.36, 0.57, iron, g);
      box(1.48, 0.036, 0.035, x, y + 0.04, 0.57, iron, g);
      for (const side of [-1, 1])
        box(0.035, 0.035, 0.49, x + side * 0.72, y + 0.04, 0.32, iron, g);
    }
  }
  function doorAt(g, x, width = 1.65) {
    const r = width / 2,
      spring = 1.75;
    const outline = new THREE.Shape();
    outline.moveTo(-r, 0.04);
    outline.lineTo(r, 0.04);
    outline.lineTo(r, spring);
    outline.absarc(0, spring, r, 0, Math.PI, false);
    outline.lineTo(-r, 0.04);
    const geom = new THREE.ExtrudeGeometry(outline, {
      depth: 0.065,
      bevelEnabled: false,
      curveSegments: 18,
    });
    uvMetres(geom, 2);
    mesh(geom, oak, x, 0, 0.06, g);
    for (const side of [-1, 1])
      for (let j = 0; j < 5; j++)
        box(
          0.24,
          0.33,
          0.2,
          x + side * (r + 0.14),
          0.2 + j * 0.35,
          0.11,
          stone,
          g,
          0.025,
        );
    for (let j = 0; j < 13; j++) {
      const a = ((j + 0.5) * Math.PI) / 13;
      const block = box(
        0.22,
        0.28,
        0.23,
        x + Math.cos(a) * (r + 0.13),
        spring + Math.sin(a) * (r + 0.13),
        0.12,
        stone,
        g,
        0.024,
      );
      block.rotation.z = a - Math.PI / 2;
    }
    for (let j = 1; j < 8; j++)
      box(
        0.013,
        spring,
        0.018,
        x - r + (j * width) / 8,
        spring / 2,
        0.132,
        iron,
        g,
      );
    for (const y of [0.45, 1.25])
      box(width - 0.06, 0.065, 0.025, x, y, 0.142, iron, g);
    const handle = mesh(
      new THREE.TorusGeometry(0.06, 0.014, 6, 14),
      iron,
      x + 0.13,
      1,
      0.18,
      g,
    );
    handle.rotation.x = 0.12;
    box(width + 0.45, 0.09, 0.4, x, 0.045, 0.14, stone, g, 0.02);
  }
  function pitchedRoof(w, d, h, g) {
    const rise = Math.min(1.65, w * 0.27),
      angle = Math.atan2(rise, w / 2 + 0.3);
    for (const side of [-1, 1]) {
      const panel = box(
        Math.hypot(w / 2 + 0.3, rise),
        0.13,
        d + 0.75,
        side * (w / 4 + 0.15),
        h + rise / 2,
        0,
        roof,
        g,
      );
      panel.rotation.z = -side * angle;
    }
    const triangle = new THREE.Shape();
    triangle.moveTo(-w / 2, h);
    triangle.lineTo(w / 2, h);
    triangle.lineTo(0, h + rise);
    triangle.closePath();
    const geo = new THREE.ShapeGeometry(triangle);
    uvMetres(geo);
    for (const side of [-1, 1]) {
      const m = mesh(geo.clone(), plaster, 0, 0, side * (d / 2 + 0.003), g);
      if (side < 0) m.rotation.y = Math.PI;
    }
    for (let z = -d / 2 - 0.35; z < d / 2 + 0.35; z += 0.34) {
      const ridge = mesh(
        new THREE.CylinderGeometry(0.13, 0.14, 0.37, 8, 1, true, 0, Math.PI),
        roof,
        0,
        h + rise + 0.06,
        z,
        g,
      );
      ridge.rotation.x = Math.PI / 2;
    }
    // Projecting rafters and a real shadow below the eaves break the box silhouette.
    for (const side of [-1, 1]) {
      box(0.16, 0.14, d + 0.7, side * (w / 2 + 0.22), h - 0.05, 0, wood, g);
      for (let z = -d / 2; z <= d / 2; z += 0.62)
        box(0.42, 0.12, 0.11, side * (w / 2), h - 0.13, z, wood, g);
    }
  }
  function house(
    x,
    z,
    w,
    d,
    h,
    variant = 0,
    orientation = 0,
    perimeter = false,
  ) {
    const g = front(x, z, orientation),
      surface = surfaces[variant % surfaces.length];
    box(w, h, d, 0, h / 2, 0, surface, g);
    box(w + 0.035, 0.62, d + 0.035, 0, 0.31, 0, masonry, g);
    // Dressed corner stones remain distinct from the plaster.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        for (let y = 0.22; y < h; y += 0.43)
          box(
            0.34,
            0.39,
            0.25,
            sx * (w / 2 - 0.14),
            y,
            sz * (d / 2 + 0.025),
            stone,
            g,
            0.018,
          );
    for (const side of [-1, 1]) {
      const facade = new THREE.Group();
      facade.position.z = side * (d / 2 + 0.01);
      if (side < 0) facade.rotation.y = Math.PI;
      g.add(facade);
      if (w >= 3) doorAt(facade, -w * 0.22, Math.min(1.6, w * 0.3));
      if (h > 4)
        for (let x = -w / 2 + 1.2; x < w / 2 - 0.5; x += 2.45)
          windowAt(
            facade,
            x,
            h - 1.5,
            variant % 2 ? blue : green,
            variant % 3 === 0,
          );
      if (w > 5 && h > 6) windowAt(facade, w / 2 - 1.5, 2.2, green, false);
    }
    pitchedRoof(w, d, h, g);
    if (perimeter || variant % 2 === 0) {
      box(0.55, 1.35, 0.65, w * 0.26, h + 0.8, -d * 0.24, masonry, g);
      cap(0.57, 0.67, w * 0.26, h + 1.47, -d * 0.24, g);
      const pipe = rod(
        0.045,
        h - 0.1,
        w / 2 + 0.09,
        (h - 0.1) / 2,
        d / 2 - 0.15,
        iron,
        g,
      );
      pipe.castShadow = false;
    }
    return g;
  }
  function barrel(x, z, y = 0, parent = root, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);
    const points = [];
    for (let j = 0; j <= 12; j++) {
      const t = j / 12;
      points.push(
        new THREE.Vector2(0.34 + 0.075 * Math.sin(t * Math.PI), t * 1.05),
      );
    }
    mesh(new THREE.LatheGeometry(points, 28), wood, 0, 0, 0, g);
    for (const h of [0.055, 0.2, 0.84, 0.995]) {
      const r = 0.342 + 0.075 * Math.sin((h / 1.05) * Math.PI);
      mesh(
        new THREE.CylinderGeometry(r + 0.008, r + 0.008, 0.055, 28, 1, true),
        iron,
        0,
        h,
        0,
        g,
      );
    }
    mesh(
      new THREE.CylinderGeometry(0.337, 0.337, 0.025, 28),
      wood,
      0,
      1.045,
      0,
      g,
    );
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI * 2) / 20,
        points = Array.from({ length: 7 }, (_, j) => {
          const y = (j * 1.05) / 6,
            r = 0.343 + 0.075 * Math.sin((j * Math.PI) / 6);
          return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        });
      mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          6,
          0.003,
          3,
          false,
        ),
        oak,
        0,
        0,
        0,
        g,
      );
    }
    return g;
  }
  function crate(b) {
    box(b.w, b.h, b.d, b.x, b.h / 2, b.z, wood, root, 0.025);
    for (const y of [0.13, b.h - 0.13])
      box(b.w + 0.05, 0.13, b.d + 0.05, b.x, y, b.z, oak, root, 0.01);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        box(
          0.13,
          b.h,
          0.13,
          b.x + sx * (b.w / 2 - 0.03),
          b.h / 2,
          b.z + sz * (b.d / 2 - 0.03),
          oak,
        );
    for (const sz of [-1, 1]) {
      const diagonal = box(
        Math.hypot(b.w - 0.2, b.h - 0.3),
        0.1,
        0.06,
        b.x,
        b.h / 2,
        b.z + sz * (b.d / 2 + 0.035),
        oak,
      );
      diagonal.rotation.z = Math.atan2(b.h - 0.3, b.w - 0.2);
    }
  }

  const ground = mesh(
    uvMetres(new THREE.BoxGeometry(150, 0.12, 150), 2.4),
    cobble,
    0,
    -0.065,
    0,
  );
  ground.castShadow = false;
  const mediterranean = ["dust", "courtyard", "outpost"].includes(mapId);
  for (const [i, b] of map.boxes.entries()) {
    if (i < 4) {
      // The existing collision boundary becomes a continuous row of houses.
      const length = b.w > b.d ? b.w : b.d,
        count = Math.ceil(length / 7),
        step = length / count;
      const angle =
        b.w > b.d
          ? b.z > 0
            ? Math.PI
            : 0
          : b.x > 0
            ? -Math.PI / 2
            : Math.PI / 2;
      const line = front(b.x, b.z, angle);
      for (let n = 0; n < count; n++) {
        const local = new THREE.Vector3(
          -length / 2 + step * (n + 0.5),
          0,
          -2.7,
        ).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        house(
          b.x + local.x,
          b.z + local.z,
          step + 0.02,
          6,
          6 + (n % 3) * 0.55,
          (n + i) % 4,
          angle,
          true,
        );
      }
      root.remove(line);
    } else if (b.kind === "crate") crate(b);
    else if (b.h >= 2.7 && mediterranean) house(b.x, b.z, b.w, b.d, b.h, i % 4);
    else {
      box(b.w, b.h, b.d, b.x, b.h / 2, b.z, masonry, root, 0.055);
      cap(b.w, b.d, b.x, b.h, b.z);
      if (b.h > 2) {
        const face = front(b.x, b.z + b.d / 2 + 0.01);
        doorAt(face, 0, Math.min(1.6, b.w - 0.5));
      }
    }
  }
  // Skyline remains outside the playable collision boundary.
  for (let n = 0; n < 5; n++)
    for (const side of [-1, 1])
      house(
        -29 + n * 14,
        side * 37,
        7 + (n % 3),
        8,
        7 + (n % 3) * 1.3,
        n,
        side > 0 ? Math.PI : 0,
        true,
      );
  for (const [x, z] of [
    [-22, -16],
    [21, 17],
    [-18, 20],
    [18, -20],
    [-4, 2],
    [4, -2],
  ]) {
    // Keep decorative barrels against existing solid cover, away from lanes.
    barrel(x, z);
    barrel(x + 0.82, z + 0.06, 0, root, 0.85);
  }
  // Real fine geometry on low walls: uneven coping stones, not a perfectly
  // rectangular bright rim. Batching makes these effectively free draw calls.
  for (const b of map.boxes.filter(
    (b, i) => i > 3 && b.kind === "concrete" && b.h < 2.7,
  )) {
    for (let x = -b.w / 2 + 0.25; x < b.w / 2; x += 0.48)
      box(0.46, 0.11, b.d + 0.08, b.x + x, b.h + 0.17, b.z, stone, root, 0.035);
  }
  // Roof-to-roof service wires, curved rather than rigid straight lines.
  for (const z of [-17, 15])
    for (const offset of [0, 0.12]) {
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-24, 6.5, z + offset),
        new THREE.Vector3(0, 5.6, z + offset),
        new THREE.Vector3(24, 6.7, z + offset),
      ]);
      mesh(new THREE.TubeGeometry(path, 20, 0.012, 4, false), iron, 0, 0, 0);
    }
  // Terracotta pots with thin leaves introduce an organic outline at facades.
  const foliage = new THREE.MeshStandardMaterial({
    color: "#687449",
    roughness: 1,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1,
      x = side * 23.7,
      z = -19 + Math.floor(i / 2) * 5.3;
    mesh(
      new THREE.CylinderGeometry(0.24, 0.16, 0.38, 16),
      terracotta,
      x,
      0.19,
      z,
    );
    for (let j = 0; j < 13; j++) {
      const a = j * 2.399,
        stem = new THREE.Vector3(
          Math.cos(a) * 0.3,
          0.5 + (j % 4) * 0.14,
          Math.sin(a) * 0.3,
        );
      const leaf = mesh(
        new THREE.SphereGeometry(1, 6, 4),
        foliage,
        x + stem.x,
        stem.y,
        z + stem.z,
      );
      leaf.scale.set(0.06, 0.22, 0.018);
      leaf.rotation.set(j, 0, a);
    }
  }

  // Flatten once; merge by shared material, retaining metre-scale UVs.
  root.updateMatrixWorld(true);
  const flat = new THREE.Group();
  root.traverse((o) => {
    if (o.isMesh) {
      const m = new THREE.Mesh(o.geometry, o.material);
      m.applyMatrix4(o.matrixWorld);
      flat.add(m);
    }
  });
  scene.remove(root);
  scene.add(flat);
  mergeStatic(flat);
  let disposed = false,
    sky = null,
    environment = null;
  if (mapId !== "station") {
    new HDRLoader().load("/textures/daylight.hdr", (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(renderer);
      environment = pmrem.fromEquirectangular(texture);
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.65;
      scene.background = texture;
      scene.backgroundIntensity = 0.8;
      scene.backgroundBlurriness = 0.015;
      scene.backgroundRotation.y = 0.7;
      scene.environmentRotation.y = 0.7;
      sky = texture;
      pmrem.dispose();
    });
  }
  return {
    dispose() {
      disposed = true;
      sky?.dispose();
      environment?.dispose();
      textures.forEach((t) => t.dispose());
    },
  };
}
