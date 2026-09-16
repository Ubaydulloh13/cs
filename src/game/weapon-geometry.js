import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Visual proportions only. Each named weapon has a separate silhouette, furniture
// and magazine arrangement, rather than a shared generic rifle stretched to fit.
export const WEAPON_FORMS = {
  ak: { type: "ak", front: 0.49, back: 0.34, wood: true },
  ak12: { type: "ak", front: 0.51, back: 0.32, rail: true },
  an94: { type: "ak", front: 0.55, back: 0.34, rail: true, offset: true },
  asval: { type: "ak", front: 0.54, back: 0.29, suppressed: true, wire: true },
  galil: { type: "ak", front: 0.48, back: 0.33, rail: true, folding: true },
  m4: { type: "ar", front: 0.53, back: 0.32, rail: true },
  hk416: { type: "ar", front: 0.5, back: 0.34, rail: true, heavy: true },
  acr: { type: "scar", front: 0.48, back: 0.32, rail: true },
  scar: { type: "scar", front: 0.5, back: 0.34, rail: true },
  scarh: { type: "scar", front: 0.55, back: 0.36, rail: true, heavy: true },
  g36: { type: "g36", front: 0.46, back: 0.32, carry: true, folding: true },
  sg553: { type: "g36", front: 0.43, back: 0.3, rail: true, wire: true },
  aug: { type: "aug", front: 0.48, back: 0.27, carry: true },
  famas: { type: "famas", front: 0.45, back: 0.3, carry: true },
  tavor: { type: "tavor", front: 0.41, back: 0.28, rail: true },
  p90: { type: "p90", front: 0.28, back: 0.27 },
  mp5: { type: "mp5", front: 0.36, back: 0.29, wire: true },
  ump45: { type: "ump", front: 0.32, back: 0.29, rail: true, folding: true },
  vector: { type: "vector", front: 0.25, back: 0.27, rail: true },
  mp7: { type: "mp7", front: 0.24, back: 0.24, rail: true, wire: true },
  bizon: { type: "bizon", front: 0.39, back: 0.3, wire: true },
  awp: { type: "awp", front: 0.69, back: 0.34 },
  svd: { type: "svd", front: 0.7, back: 0.34, wood: true },
  m249: { type: "lmg", front: 0.63, back: 0.35, rail: true },
};

export function geometryTools(group, palette) {
  const add = (geometry, material, x = 0, y = 0, z = 0) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const box = (w, h, d, x, y, z, mat = palette.paint, r = 0.12) =>
    add(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * r),
      mat,
      x,
      y,
      z,
    );
  const tube = (r, len, x, y, z, mat = palette.steel, r2 = r) => {
    const m = add(new T.CylinderGeometry(r, r2, len, 32, 1), mat, x, y, z);
    m.rotation.x = Math.PI / 2;
    return m;
  };
  // Contour points are [forward, height]; thickness is across the body.
  const plate = (
    points,
    width,
    x = 0,
    y = 0,
    z = 0,
    mat = palette.paint,
    holes = [],
  ) => {
    const shape = new T.Shape(points.map((p) => new T.Vector2(...p)));
    for (const hole of holes)
      shape.holes.push(new T.Path(hole.map((p) => new T.Vector2(...p))));
    const geo = new T.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: true,
      bevelThickness: 0.0025,
      bevelSize: 0.003,
      bevelSegments: 3,
      curveSegments: 18,
      steps: 1,
    });
    geo.rotateY(Math.PI / 2);
    return add(geo, mat, x - width / 2, y, z);
  };
  const curve = (points, r, mat = palette.steel) =>
    add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        24,
        r,
        8,
        false,
      ),
      mat,
    );
  const sphere = (x, y, z, sx, sy, sz, mat) => {
    const m = add(new T.SphereGeometry(1, 24, 16), mat, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  return { add, box, tube, plate, curve, sphere };
}

export function addWeaponBody(group, id, palette) {
  const f = WEAPON_FORMS[id];
  if (!f) throw Error("Missing weapon form " + id);
  group.userData.form = f.type;
  const { paint, steel, rubber, accent } = palette;
  const { box, tube, plate, curve } = geometryTools(group, palette);
  const mag = (z = -0.1, h = 0.23, width = 0.063, curved = false) => {
    plate(
      [
        [0, 0],
        [0.078, 0],
        [0.077, -h * 0.4],
        [curved ? 0.11 : 0.087, -h * 0.78],
        [curved ? 0.16 : 0.09, -h],
        [curved ? 0.084 : 0.008, -h - 0.004],
        [curved ? 0.02 : 0.005, -h * 0.6],
      ],
      width,
      0,
      -0.04,
      z,
      paint,
    );
    for (const side of [-1, 1])
      for (let n = 0; n < 3; n++) {
        const rib = box(
          0.002,
          h * 0.65,
          0.006,
          side * (width / 2 + 0.004),
          -0.09 - h * 0.35,
          z - 0.018 - n * 0.022,
          steel,
        );
        rib.rotation.x = curved ? -0.18 : 0;
      }
    box(width + 0.005, 0.018, 0.09, 0, -h - 0.04, z - 0.04, rubber);
  };
  const grip = (z = 0.06, y = -0.03) => {
    plate(
      [
        [0, 0],
        [0.065, 0.004],
        [0.063, -0.075],
        [0.043, -0.17],
        [-0.013, -0.17],
        [-0.028, -0.15],
      ],
      0.059,
      0,
      y,
      z,
      rubber,
    );
    for (let n = 0; n < 6; n++)
      box(0.061, 0.004, 0.048, 0, y - 0.056 - n * 0.015, z - 0.019, steel);
  };
  const stock = (kind = f.wire ? "wire" : f.folding ? "folding" : "solid") => {
    if (kind === "wire") {
      for (const side of [-1, 1])
        curve(
          [
            [side * 0.023, 0, 0.12],
            [side * 0.033, -0.015, f.back - 0.03],
            [side * 0.027, -0.12, f.back],
          ],
          0.009,
          steel,
        );
      box(0.064, 0.15, 0.025, 0, -0.06, f.back, rubber);
    } else if (kind === "folding") {
      plate(
        [
          [-f.back, 0.01],
          [-0.15, 0.026],
          [-0.12, -0.03],
          [-f.back + 0.025, -0.13],
          [-f.back, -0.13],
        ],
        0.055,
        0,
        0,
        0,
        rubber,
        [
          [
            [-f.back + 0.04, -0.022],
            [-0.17, -0.016],
            [-f.back + 0.047, -0.086],
          ],
        ],
      );
      tube(0.026, 0.04, 0, -0.01, 0.13, steel);
      box(0.069, 0.16, 0.028, 0, -0.055, f.back, rubber);
    } else {
      tube(0.026, 0.16, 0, 0, 0.16, steel);
      plate(
        [
          [-f.back, 0.045],
          [-0.2, 0.045],
          [-0.16, 0.018],
          [-0.17, -0.046],
          [-f.back + 0.025, -0.145],
          [-f.back, -0.14],
        ],
        0.071,
        0,
        0,
        0,
        f.wood ? paint : rubber,
      );
      box(0.08, 0.18, 0.028, 0, -0.05, f.back, rubber);
      box(0.078, 0.022, 0.1, 0, 0.04, f.back - 0.07, rubber);
      box(0.077, 0.017, 0.036, 0, -0.077, f.back - 0.09, steel);
    }
  };
  const receiver = () => {
    plate(
      [
        [-0.13, 0.045],
        [0.19, 0.047],
        [0.22, 0.005],
        [0.2, -0.067],
        [0.11, -0.085],
        [-0.1, -0.072],
        [-0.14, -0.035],
      ],
      0.069,
    );
    box(0.067, 0.033, 0.25, 0, 0.058, -0.01, steel);
    grip();
    mag();
    stock();
  };
  const handguard = (len = 0.23, round = false) => {
    if (round) {
      tube(0.043, len, 0, 0.008, -0.2 - len / 2, paint, 0.031);
    } else
      plate(
        [
          [0.17, 0.047],
          [0.17 + len, 0.038],
          [0.18 + len, -0.046],
          [0.2, -0.063],
          [0.17, -0.024],
        ],
        0.079,
      );
    for (const side of [-1, 1])
      for (let n = 0; n < Math.floor(len / 0.027); n++)
        box(
          0.004,
          0.013,
          0.017,
          side * 0.043,
          0.023,
          -0.192 - n * 0.027,
          rubber,
          0.4,
        );
    for (let n = 0; n < 6; n++)
      box(0.075, 0.003, 0.005, 0, -0.043, -0.2 - n * 0.032, steel);
  };
  if (["ak", "bizon", "svd"].includes(f.type)) {
    tube(0.038, 0.28, 0, 0.021, 0.012, steel);
    box(0.071, 0.064, 0.28, 0, -0.018, -0.016, paint);
    grip();
    if (f.type === "bizon") {
      tube(0.048, 0.3, 0, -0.093, -0.16, paint);
      for (let n = 0; n < 5; n++)
        tube(0.049, 0.008, 0, -0.093, -0.28 + n * 0.065, steel);
      stock();
      handguard(0.13, true);
    } else if (f.type === "svd") {
      mag(-0.1, 0.14, 0.058);
      handguard(0.36, true);
      plate(
        [
          [-0.34, 0.04],
          [-0.12, 0.03],
          [-0.07, -0.11],
          [-0.14, -0.14],
          [-0.3, -0.14],
          [-0.34, -0.17],
        ],
        0.061,
        0,
        0,
        0,
        paint,
        [
          [
            [-0.28, -0.015],
            [-0.17, -0.014],
            [-0.13, -0.085],
            [-0.28, -0.1],
          ],
        ],
      );
    } else {
      mag(-0.085, 0.24, 0.06, true);
      stock();
      handguard(f.suppressed ? 0.16 : 0.19, true);
    }
    tube(0.012, 0.27, 0.043, 0.035, -0.07, steel);
    const bolt = tube(0.012, 0.043, 0.059, 0.014, 0.015, steel);
    bolt.rotation.z = Math.PI / 2;
    if (f.offset) box(0.016, 0.045, 0.25, 0.045, -0.007, -0.1, steel);
  } else if (f.type === "mp5") {
    tube(0.034, 0.3, 0, 0.019, -0.055, steel);
    box(0.06, 0.051, 0.2, 0, -0.029, 0.015, paint);
    handguard(0.12, true);
    grip();
    mag(-0.09, 0.19, 0.041, true);
    stock("wire");
    tube(0.011, 0.27, -0.025, 0.061, -0.14, steel);
    const lever = box(0.044, 0.016, 0.026, -0.027, 0.062, -0.2, rubber);
    lever.rotation.z = -0.18;
    tube(0.036, 0.022, 0, 0.022, -0.33, steel);
  } else if (["aug", "famas", "tavor"].includes(f.type)) {
    const aug = f.type === "aug",
      famas = f.type === "famas";
    plate(
      [
        [-f.back, 0.048],
        [0.17, 0.055],
        [0.25, 0.018],
        [0.26, -0.04],
        [0.12, -0.07],
        [0.05, -0.1],
        [0.02, -0.19],
        [-0.06, -0.2],
        [-0.1, -0.087],
        [-f.back, -0.135],
      ],
      0.082,
      0,
      0,
      0,
      paint,
    );
    mag(0.17, 0.17, 0.057);
    box(0.09, 0.19, 0.027, 0, -0.042, f.back, rubber);
    if (aug) {
      curve(
        [
          [0, -0.04, -0.16],
          [0, -0.145, -0.18],
          [0, -0.19, -0.09],
          [0, -0.16, -0.025],
        ],
        0.012,
        paint,
      );
      const fore = box(0.044, 0.14, 0.057, 0, -0.092, -0.24, rubber, 0.35);
      fore.rotation.x = -0.1;
      tube(0.017, 0.31, 0, 0.025, -0.33, steel);
    } else {
      grip(-0.025);
      handguard(famas ? 0.08 : 0.11);
      if (famas) {
        for (const side of [-1, 1])
          box(0.012, 0.055, 0.27, side * 0.041, 0.086, -0.02, steel);
        box(0.094, 0.022, 0.33, 0, 0.12, -0.005, steel);
      }
    }
    box(0.003, 0.028, 0.091, 0.044, 0.012, 0.07, steel);
    tube(0.012, 0.05, -0.043, 0.035, -0.12, steel);
  } else if (f.type === "p90") {
    plate(
      [
        [-0.27, 0.04],
        [0.17, 0.035],
        [0.24, -0.025],
        [0.22, -0.095],
        [0.15, -0.13],
        [0.1, -0.185],
        [-0.02, -0.19],
        [-0.08, -0.13],
        [-0.26, -0.13],
      ],
      0.105,
      0,
      0,
      0,
      paint,
      [
        [
          [0.055, -0.067],
          [0.14, -0.062],
          [0.125, -0.126],
          [0.055, -0.143],
        ],
      ],
    );
    box(0.095, 0.033, 0.38, 0, 0.065, -0.001, accent, 0.35);
    for (let n = 0; n < 15; n++)
      box(0.076, 0.011, 0.004, 0, 0.084, -0.17 + n * 0.022, steel);
    box(0.12, 0.15, 0.03, 0, -0.056, 0.265, rubber);
    tube(0.018, 0.11, 0, 0.0, -0.245, steel);
    for (const side of [-1, 1])
      box(0.012, 0.055, 0.18, side * 0.035, 0.117, -0.06, steel);
    box(0.087, 0.017, 0.19, 0, 0.143, -0.06, steel);
  } else if (f.type === "vector") {
    plate(
      [
        [-0.13, 0.045],
        [0.18, 0.045],
        [0.19, -0.045],
        [0.13, -0.065],
        [0.11, -0.21],
        [-0.01, -0.24],
        [-0.045, -0.17],
        [-0.06, -0.046],
        [-0.13, -0.035],
      ],
      0.084,
    );
    grip(0.1);
    mag(-0.005, 0.25, 0.044);
    stock("folding");
    tube(0.026, 0.17, 0, 0.009, -0.2, steel);
    box(0.016, 0.13, 0.069, 0.048, -0.095, -0.055, steel);
  } else if (f.type === "mp7") {
    plate(
      [
        [-0.11, 0.047],
        [0.17, 0.05],
        [0.2, 0.025],
        [0.19, -0.037],
        [0.035, -0.061],
        [-0.11, -0.031],
      ],
      0.062,
    );
    grip(0.04);
    mag(0.015, 0.14, 0.043);
    stock("wire");
    tube(0.016, 0.1, 0, 0.012, -0.19);
    const fore = box(0.036, 0.098, 0.054, 0, -0.093, -0.125, rubber);
    fore.rotation.x = -0.07;
  } else if (f.type === "awp") {
    tube(0.031, 0.31, 0, 0.026, -0.002, steel);
    plate(
      [
        [-0.33, 0.035],
        [0.26, 0.013],
        [0.28, -0.034],
        [0.04, -0.08],
        [-0.006, -0.21],
        [-0.067, -0.21],
        [-0.115, -0.07],
        [-0.29, -0.055],
        [-0.33, -0.14],
      ],
      0.082,
      0,
      -0.01,
      0,
      paint,
      [
        [
          [-0.12, -0.04],
          [-0.075, -0.041],
          [-0.04, -0.13],
          [-0.09, -0.105],
        ],
      ],
    );
    mag(-0.07, 0.095, 0.062);
    box(0.09, 0.17, 0.027, 0, -0.045, 0.335, rubber);
    curve(
      [
        [0.017, 0.04, 0.08],
        [0.069, 0.03, 0.08],
        [0.065, -0.038, 0.09],
      ],
      0.009,
      steel,
    );
    for (const side of [-1, 1])
      curve(
        [
          [side * 0.025, -0.015, -0.32],
          [side * 0.088, -0.22, -0.36],
        ],
        0.01,
        steel,
      );
  } else if (f.type === "lmg") {
    plate(
      [
        [-0.16, 0.068],
        [0.19, 0.066],
        [0.22, 0.01],
        [0.15, -0.078],
        [-0.14, -0.08],
      ],
      0.095,
    );
    box(0.095, 0.024, 0.32, 0, 0.077, -0.006, steel);
    grip(0.095);
    stock();
    handguard(0.19);
    box(0.17, 0.2, 0.18, 0, -0.18, -0.08, rubber);
    for (let n = 0; n < 9; n++)
      tube(0.005, 0.039, 0.05 + n * 0.01, -0.033, -0.084, accent);
    curve(
      [
        [0, 0.025, -0.19],
        [0, 0.13, -0.18],
        [0, 0.14, -0.075],
        [0, 0.08, -0.04],
      ],
      0.014,
      rubber,
    );
    for (const side of [-1, 1])
      curve(
        [
          [side * 0.021, -0.02, -0.45],
          [side * 0.12, -0.24, -0.49],
        ],
        0.011,
        steel,
      );
  } else {
    receiver();
    handguard(f.type === "ump" ? 0.1 : f.type === "g36" ? 0.17 : 0.23);
    if (f.type === "scar") {
      plate(
        [
          [-0.13, 0.065],
          [0.37, 0.065],
          [0.4, 0.028],
          [0.37, -0.026],
          [-0.13, -0.034],
        ],
        0.083,
      );
      box(0.005, 0.019, 0.14, 0.046, 0.02, 0.005, steel);
      for (let n = 0; n < 4; n++)
        box(0.004, 0.013, 0.025, -0.046, 0.008, -0.17 - n * 0.04, rubber);
    }
    if (f.type === "g36") {
      for (const side of [-1, 1])
        box(0.011, 0.046, 0.23, side * 0.035, 0.094, -0.024, steel);
      box(0.09, 0.017, 0.28, 0, 0.119, -0.015, steel);
      for (let n = 0; n < 4; n++)
        box(0.014, 0.002, 0.054, 0, 0.055, -0.18 - n * 0.039, rubber);
    }
  }
  // Barrel, crown and front sights remain slender and physically separate.
  if (!["p90", "mp7", "vector"].includes(f.type)) {
    const suppressor = f.suppressed;
    tube(
      suppressor ? 0.032 : 0.015,
      f.front - 0.23,
      0,
      0.024,
      -(0.23 + f.front) / 2,
      steel,
    );
    tube(
      suppressor ? 0.034 : 0.023,
      suppressor ? 0.24 : 0.045,
      0,
      0.024,
      -f.front + 0.008,
      steel,
    );
    tube(
      suppressor ? 0.026 : 0.012,
      0.002,
      0,
      0.024,
      -f.front - (suppressor ? 0.112 : 0.016),
      rubber,
    );
    if (!suppressor && f.type !== "awp") {
      plate(
        [
          [-0.012, 0],
          [0.012, 0],
          [0.024, 0.07],
          [0.014, 0.077],
          [-0.014, 0.077],
          [-0.024, 0.07],
        ],
        0.014,
        0,
        0.025,
        -f.front + 0.075,
        steel,
      );
      box(0.007, 0.033, 0.009, 0, 0.093, -f.front + 0.075, steel);
    }
  }
  if (f.rail) {
    for (let n = 0; n < 13; n++)
      box(0.067, 0.007, 0.01, 0, 0.084, 0.08 - n * 0.028, steel);
  }
  if (!["p90", "vector", "aug", "famas", "tavor", "mp7"].includes(f.type)) {
    curve(
      [
        [0, -0.056, 0.02],
        [0, -0.113, 0.005],
        [0, -0.125, -0.055],
        [0, -0.063, -0.074],
      ],
      0.005,
      steel,
    );
  }
  // Visible machining: screw heads, selector, extractor and stock seams.
  for (const side of [-1, 1]) {
    for (const z of [0.078, -0.035, -0.135]) {
      const pin = tube(0.005, 0.004, side * 0.043, -0.005, z, steel);
      pin.rotation.set(0, 0, Math.PI / 2);
    }
    const selector = box(
      0.004,
      0.012,
      0.033,
      side * 0.045,
      -0.025,
      0.057,
      steel,
    );
    selector.rotation.x = 0.38;
  }
  return f;
}

export function addOptic(group, optic, palette, offset = 0) {
  if (optic === "none") return;
  const { box, tube, curve } = geometryTools(group, palette),
    { steel, rubber } = palette;
  box(0.049, 0.027, 0.091, 0, 0.082 + offset, -0.014, steel);
  if (["scope", "acog"].includes(optic)) {
    const len = optic === "scope" ? 0.27 : 0.17;
    tube(0.027, len, 0, 0.132 + offset, -0.022, steel);
    tube(0.043, 0.04, 0, 0.132 + offset, -0.022 - len / 2, steel);
    tube(0.036, 0.034, 0, 0.132 + offset, -0.012 + len / 2, steel);
    const glass = new T.MeshStandardMaterial({
      color: "#547b82",
      metalness: 0.55,
      roughness: 0.13,
    });
    tube(0.029, 0.001, 0, 0.132 + offset, 0.007 + len / 2, glass);
    box(0.029, 0.031, 0.03, 0, 0.17 + offset, -0.02, rubber);
  } else {
    const wide = optic === "holo";
    curve(
      [
        [-0.032, 0.098 + offset, -0.011],
        [-0.03, 0.15 + offset, -0.011],
        [-0.018, 0.17 + offset, -0.011],
        [0.023, 0.17 + offset, -0.011],
        [0.032, 0.153 + offset, -0.011],
        [0.032, 0.1 + offset, -0.011],
      ],
      wide ? 0.007 : 0.004,
      steel,
    );
    if (wide) box(0.058, 0.022, 0.062, 0, 0.103 + offset, -0.024, rubber);
  }
}
