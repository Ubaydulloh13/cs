import * as THREE from "three";
import { mergeStatic } from "./models.js";
export function addScenery(scene, map) {
  const night = map === "station",
    warm = ["dust", "courtyard", "outpost"].includes(map);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(115, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        zenith: { value: new THREE.Color(night ? "#101d35" : "#4792c8") },
        horizon: { value: new THREE.Color(night ? "#456078" : "#d8e8e9") },
      },
      vertexShader:
        "varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader:
        "uniform vec3 zenith;uniform vec3 horizon;varying vec3 vSky;void main(){vec3 d=normalize(vSky);float gradient=pow(max(d.y,0.0),0.55);vec3 col=mix(horizon,zenith,gradient);float sunlight=pow(max(dot(d,normalize(vec3(-24.0,38.0,19.0))),0.0),180.0);gl_FragColor=vec4(col+vec3(1.0,0.82,0.58)*sunlight*0.6,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>}",
    }),
  );
  // Preprocessor directives must begin on a new shader line.
  sky.material.fragmentShader = sky.material.fragmentShader.replace(
    ";#include",
    ";\n#include",
  );
  sky.renderOrder = -10;
  scene.add(sky);
  const detail = new THREE.Group();
  scene.add(detail);
  const bark = new THREE.MeshStandardMaterial({
      color: "#86704a",
      roughness: 0.98,
    }),
    leaf = new THREE.MeshStandardMaterial({
      color: "#467848",
      side: THREE.DoubleSide,
      roughness: 0.85,
    }),
    frame = new THREE.MeshStandardMaterial({
      color: warm ? "#cdb48b" : "#809599",
      roughness: 0.84,
    }),
    dark = new THREE.MeshStandardMaterial({
      color: "#334647",
      metalness: 0.25,
      roughness: 0.38,
    });
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    detail.add(m);
    return m;
  };
  if (warm || map === "harbor")
    for (const [x, z, h] of [
      [-24, -29, 9],
      [22, -28, 10],
      [-27, 12, 9],
      [27, -10, 11],
      [-17, 29, 9],
      [24, 28, 10],
    ]) {
      const trunk = add(
        new THREE.CylinderGeometry(0.12, 0.3, h, 12),
        bark,
        x,
        h / 2,
        z,
      );
      trunk.rotation.z = 0.055;
      for (let n = 0; n < 13; n++) {
        const ring = add(
          new THREE.TorusGeometry(0.15 + (1 - n / 13) * 0.12, 0.03, 5, 12),
          bark,
          x - (0.055 * n * h) / 13,
          (n * h) / 13,
          z,
        );
        ring.rotation.x = Math.PI / 2;
      }
      for (let n = 0; n < 9; n++) {
        const points = [],
          angle = (n * Math.PI * 2) / 9;
        for (let j = 0; j < 8; j++) {
          const t = j / 7,
            r = t * 3.3,
            y = 0.4 * Math.sin(t * Math.PI) - t * t * 1.15,
            w = Math.sin(t * Math.PI) * 0.33;
          for (const side of [-1, 1])
            points.push(
              Math.sin(angle) * r + Math.cos(angle) * w * side,
              y,
              Math.cos(angle) * r - Math.sin(angle) * w * side,
            );
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(points, 3),
        );
        const index = [];
        for (let j = 0; j < 7; j++) {
          const b = j * 2;
          index.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
        geom.setIndex(index);
        geom.computeVertexNormals();
        add(geom, leaf, x - 0.055 * h, h, z);
      }
    }
  if (warm)
    for (const side of [-1, 1])
      for (let n = 0; n < 7; n++) {
        const arch = new THREE.Shape();
        arch.moveTo(-0.72, 0);
        arch.lineTo(0.72, 0);
        arch.lineTo(0.72, 1.2);
        arch.absarc(0, 1.2, 0.72, 0, Math.PI, false);
        arch.lineTo(-0.72, 0);
        const opening = add(
          new THREE.ShapeGeometry(arch),
          dark,
          n * 6 - 18,
          1.3,
          side * 22.43,
        );
        if (side > 0) opening.rotation.y = Math.PI;
        const trim = new THREE.Shape();
        trim.moveTo(-0.82, 0);
        trim.lineTo(0.82, 0);
        trim.lineTo(0.82, 1.2);
        trim.absarc(0, 1.2, 0.82, 0, Math.PI, false);
        trim.lineTo(-0.82, 0);
        trim.holes.push(new THREE.Path(arch.getPoints()));
        const border = add(
          new THREE.ExtrudeGeometry(trim, {
            depth: 0.09,
            bevelEnabled: true,
            bevelSize: 0.025,
            bevelThickness: 0.025,
            bevelSegments: 1,
            steps: 1,
          }),
          frame,
          n * 6 - 18,
          1.3,
          side * 22.38,
        );
        if (side > 0) border.rotation.y = Math.PI;
        for (let j = 0; j < 4; j++)
          add(
            new THREE.BoxGeometry(0.045, 1.55, 0.065),
            frame,
            n * 6 - 18 - 0.45 + j * 0.3,
            2.1,
            side * 22.33,
          );
      }
  mergeStatic(detail);
}
export function makeHands() {
  const group = new THREE.Group(),
    fabric = new THREE.MeshStandardMaterial({
      color: "#686957",
      roughness: 0.94,
    }),
    leather = new THREE.MeshStandardMaterial({
      color: "#373b34",
      roughness: 0.78,
    }),
    rubber = new THREE.MeshStandardMaterial({
      color: "#1e2525",
      roughness: 0.9,
    });
  const segment = (a, b, r, mat) => {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      direction = to.clone().sub(from);
    const m = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        r,
        Math.max(0.005, direction.length() - 2 * r),
        4,
        12,
      ),
      mat,
    );
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    group.add(m);
    return m;
  };
  for (const [wrist, forearm, sign] of [
    [[0.035, -0.12, 0.09], [0.15, -0.23, 0.5], 1],
    [[-0.045, -0.09, -0.31], [-0.27, -0.25, 0.19], -1],
  ]) {
    segment(forearm, wrist, 0.057, fabric);
    const [x, y, z] = wrist;
    const palm = segment(
      [x, y, z + 0.025],
      [x, y - 0.015, z - 0.035],
      0.044,
      leather,
    );
    palm.scale.x = 0.8;
    for (let i = 0; i < 4; i++) {
      const fy = y + 0.025 - i * 0.019;
      segment(
        [x + sign * 0.03, fy, z - 0.033],
        [x + sign * 0.009, fy - 0.014, z - 0.072],
        0.012,
        leather,
      );
      segment(
        [x + sign * 0.009, fy - 0.014, z - 0.072],
        [x - sign * 0.024, fy - 0.013, z - 0.057],
        0.011,
        leather,
      );
      const knuckle = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 6),
        rubber,
      );
      knuckle.position.set(x + sign * 0.035, fy, z - 0.02);
      knuckle.scale.set(1, 0.65, 1.25);
      group.add(knuckle);
    }
    segment(
      [x - sign * 0.026, y + 0.014, z + 0.01],
      [x - sign * 0.036, y - 0.021, z - 0.034],
      0.017,
      leather,
    );
  }
  mergeStatic(group);
  return group;
}
