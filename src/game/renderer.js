import * as THREE from "three";
import { createOperator } from "./characters.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MAPS, WEAPONS, OPTICS } from "./config.js";
import { makeGun, mergeStatic, disposeGroup } from "./models.js";
export { makeGun } from "./models.js";
const material = (color, roughness = 0.8) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.15 });
function cube(parent, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cylinder(parent, r1, r2, h, x, y, z, mat, segments = 20) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r2, h, segments),
    mat,
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function textTexture(text, bg = "#8b896e", fg = "#eeeece", w = 512, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${h * 0.5}px Arial`;
  ctx.fillText(text, w / 2, h / 2);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export class ArenaRenderer {
  constructor(container, config, profile) {
    this.config = config;
    this.profile = profile;
    this.renderer = new THREE.WebGLRenderer({
      antialias: profile.quality !== "low",
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, profile.quality === "low" ? 1 : 1.35),
    );
    this.renderer.shadowMap.enabled = profile.quality !== "low";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.canvas = this.renderer.domElement;
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute("aria-label", "STRIKEZONE 3D jang maydoni");
    container.appendChild(this.canvas);
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environment = new RoomEnvironment();
    this.environment = pmrem.fromScene(environment, 0.04).texture;
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.35;
    environment.dispose();
    pmrem.dispose();
    const map = MAPS[config.map];
    this.scene.background = new THREE.Color(map.sky);
    this.scene.fog = new THREE.Fog(map.fog, 30, 95);
    this.camera = new THREE.PerspectiveCamera(78, 1, 0.06, 150);
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    this.models = new Map();
    this.effects = [];
    this.lastEvent = 0;
    this.recoil = 0;
    this.time = 0;
    this.frameAverage = 1 / 60;
    this.adaptAt = 0;
    this.slash = 0;
    this.currentGun = "";
    this.lastSpawn = 0;
    this.scene.add(new THREE.HemisphereLight("#e6eee3", "#77735b", 2));
    const sun = new THREE.DirectionalLight("#fff1cf", 3);
    sun.position.set(-24, 38, 19);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    sun.shadow.normalBias = 0.025;
    this.scene.add(sun);
    this.createMap(map);
    mergeStatic(this.scene);
    this.handGroup = new THREE.Group();
    this.camera.add(this.handGroup);
    this.setGun(profile.weapon, profile.skin);
    this.resize = () => {
      const w = container.clientWidth,
        h = container.clientHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    this.resize();
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(container);
  }
  createMap(map) {
    const loader = new THREE.TextureLoader();
    const load = (file, repeat, color = false) => {
      const t = loader.load("/textures/" + file);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat, repeat);
      t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      if (color) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: this.config.map === "dust" ? "#cfc7b1" : "#cccccc",
      map: load("concrete-color.jpg", 25, true),
      normalMap: load("concrete-normal.jpg", 25),
      roughnessMap: load("concrete-rough.jpg", 25),
      roughness: 1,
      normalScale: new THREE.Vector2(0.65, 0.65),
    });
    const brick = load("brick-color.jpg", 4, true),
      brickNormal = load("brick-normal.jpg", 4);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      floorMaterial,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    if (this.config.map === "harbor") {
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 100),
        new THREE.MeshStandardMaterial({
          color: "#276e85",
          metalness: 0.55,
          roughness: 0.2,
        }),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, -0.1, -65);
      this.scene.add(water);
    }
    if (this.config.map === "station") {
      this.scene.add(new THREE.AmbientLight("#80aaca", 0.6));
      for (const x of [-18, 18]) {
        const light = new THREE.PointLight("#80caff", 15, 25, 1);
        light.position.set(x, 4, 0);
        this.scene.add(light);
      }
    }
    const dark = material("#454b40"),
      trim = material("#aaa18a");
    for (const b of map.boxes) {
      const mat = material(b.color);
      if (b.kind === "concrete" && b.h > 4) {
        mat.map = brick;
        mat.normalMap = brickNormal;
        mat.color.set("#d4cfc2");
        mat.normalScale = new THREE.Vector2(0.4, 0.4);
        mat.roughness = 0.95;
      } else if (b.kind === "concrete") {
        mat.map = load("concrete-color.jpg", 1, true);
        mat.normalMap = load("concrete-normal.jpg", 1);
        mat.roughness = 0.95;
      }
      cube(this.scene, b.w, b.h, b.d, b.x, b.h / 2, b.z, mat);
      if (b.kind === "container") {
        for (let x = -b.w / 2 + 0.2; x < b.w / 2; x += 0.38) {
          cube(
            this.scene,
            0.045,
            b.h - 0.12,
            0.06,
            b.x + x,
            b.h / 2,
            b.z + b.d / 2 + 0.02,
            mat,
          );
          cube(
            this.scene,
            0.045,
            b.h - 0.12,
            0.06,
            b.x + x,
            b.h / 2,
            b.z - b.d / 2 - 0.02,
            mat,
          );
        }
        for (let z = -b.d / 2 + 0.2; z < b.d / 2; z += 0.45) {
          cube(
            this.scene,
            0.065,
            b.h - 0.1,
            0.045,
            b.x + b.w / 2,
            b.h / 2,
            b.z + z,
            mat,
          );
          cube(
            this.scene,
            0.065,
            b.h - 0.1,
            0.045,
            b.x - b.w / 2,
            b.h / 2,
            b.z + z,
            mat,
          );
        }
        cube(this.scene, b.w + 0.06, 0.09, b.d + 0.06, b.x, b.h, b.z, dark);
      } else if (b.kind === "crate") {
        for (const y of [0.12, b.h - 0.12])
          cube(this.scene, b.w + 0.04, 0.09, b.d + 0.04, b.x, y, b.z, dark);
        cube(this.scene, 0.12, b.h, b.d + 0.05, b.x, b.h / 2, b.z, trim);
      } else if (b.h > 4) {
        cube(this.scene, b.w + 0.05, 0.25, b.d + 0.05, b.x, b.h, b.z, dark);
      }
    }
    for (const [z, letter, color] of [
      [-22.45, "B", "#b1543c"],
      [22.45, "A", "#566d86"],
    ]) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 2),
        new THREE.MeshStandardMaterial({
          map: textTexture(letter, color),
          side: THREE.DoubleSide,
        }),
      );
      sign.position.set(0, 3, z);
      if (z > 0) sign.rotation.y = Math.PI;
      this.scene.add(sign);
    }
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 2.3),
      new THREE.MeshStandardMaterial({
        map: textTexture("STRIKEZONE", "#3c4437", "#d3debc", 1024, 256),
      }),
    );
    label.position.set(-24.45, 3, 0);
    label.rotation.y = Math.PI / 2;
    this.scene.add(label);
    for (let side = -1; side <= 1; side += 2) {
      for (let n = 0; n < 7; n++) {
        const h = 6 + (n % 3) * 2;
        cube(
          this.scene,
          6,
          h,
          8,
          n * 10 - 30,
          h / 2,
          side * 34,
          material(n % 2 ? "#878b80" : "#99978b"),
        );
        for (let j = 0; j < 3; j++)
          cube(
            this.scene,
            0.9,
            1.1,
            0.06,
            n * 10 - 32 + j * 2,
            h - 2,
            side > 0 ? 29.95 : -29.95,
            material("#374b4c"),
          );
      }
      for (let n = 0; n < 3; n++) {
        const x = -20 + n * 20;
        const pole = cylinder(
          this.scene,
          0.065,
          0.065,
          8,
          x,
          4,
          side * 21,
          dark,
        );
        pole.castShadow = false;
        cube(this.scene, 1.3, 0.1, 0.35, x, 8, side * 21, dark);
      }
    }
    const paint = material("#d7c174");
    for (let n = 0; n < 7; n++)
      cube(this.scene, 1.2, 0.009, 0.12, -21 + n * 7, 0.01, -18, paint);
    for (let n = 0; n < 7; n++)
      cube(this.scene, 1.2, 0.009, 0.12, -21 + n * 7, 0.01, 18, paint);
    for (const [x, z] of [
      [-21, -15],
      [21, 15],
      [-20, 13],
      [20, -13],
    ]) {
      for (let n = 0; n < 2; n++) {
        cylinder(
          this.scene,
          0.43,
          0.43,
          1.2,
          x + n * 0.95,
          0.6,
          z,
          material("#6c7259"),
        );
        cylinder(this.scene, 0.45, 0.45, 0.07, x + n * 0.95, 0.12, z, dark);
        cylinder(this.scene, 0.45, 0.45, 0.07, x + n * 0.95, 1.05, z, dark);
      }
    }
  }
  setGun(weapon, skin, knife = "combat") {
    if (this.currentGun === weapon + skin + knife) return;
    this.handGroup.children.forEach(disposeGroup);
    this.handGroup.clear();
    this.gun = makeGun(weapon, skin, knife, this.profile.optic);
    this.handGroup.add(this.gun);
    const sleeve = material("#596046"),
      glove = material("#292e25");
    const limb = (radius, length, x, y, z, mat) => {
      const m = new THREE.Mesh(
        new THREE.CapsuleGeometry(radius, length, 5, 16),
        mat,
      );
      m.position.set(x, y, z);
      m.rotation.x = Math.PI / 2;
      this.handGroup.add(m);
      return m;
    };
    limb(0.058, 0.25, 0.11, -0.15, 0.25, sleeve).rotation.z = -0.25;
    limb(0.057, 0.055, 0.035, -0.13, 0.09, glove);
    limb(0.054, 0.32, -0.11, -0.14, -0.16, sleeve).rotation.y = 0.3;
    limb(0.055, 0.06, -0.04, -0.09, -0.34, glove);
    this.flash = new THREE.PointLight("#ffd477", 0, 5);
    this.flash.position.set(0, 0.02, -0.9);
    this.gun.add(this.flash);
    this.currentGun = weapon + skin + knife;
  }
  makePlayer(p) {
    const m = createOperator(p.outfit, p.team);
    m.gun = makeGun(
      p.weapon,
      p.weapon === "knife" ? p.knifeSkin : p.skin,
      p.knife,
    );
    m.gun.scale.setScalar(0.7);
    m.gun.position.set(0.14, 0.96, -0.34);
    m.g.add(m.gun);
    m.weapon = p.weapon;
    this.scene.add(m.g);
    return m;
  }
  render(state, id, input, dt, onEvent) {
    this.time += dt;
    this.frameAverage = this.frameAverage * 0.98 + dt * 0.02;
    if (
      this.time > this.adaptAt + 4 &&
      this.frameAverage > 1 / 43 &&
      this.renderer.getPixelRatio() > 0.85
    ) {
      this.renderer.setPixelRatio(
        Math.max(0.85, this.renderer.getPixelRatio() - 0.15),
      );
      this.resize();
      this.adaptAt = this.time;
    }
    const p = state.players.find((p) => p.id === id);
    if (!p) return;
    this.setGun(p.weapon, p.weapon === "knife" ? p.knifeSkin : p.skin, p.knife);
    const smooth = 1 - Math.exp(-22 * dt);
    const eye = p.y + (p.crouch ? 0.9 : 1.48);
    const dest = new THREE.Vector3(p.x, eye, p.z);
    if (state.remote && this.camera.position.distanceTo(dest) < 5)
      this.camera.position.lerp(dest, smooth);
    else this.camera.position.copy(dest);
    this.camera.rotation.set(input.pitch, input.yaw, 0, "YXZ");
    this.recoil = Math.max(0, this.recoil - dt * 5);
    this.slash = Math.max(0, this.slash - dt * 4);
    const fov = input.aim
      ? WEAPONS[p.weapon].family === "sniper"
        ? 27
        : OPTICS.find((o) => o.id === this.profile.optic)?.zoom || 56
      : input.sprint && p.moving
        ? 84
        : 78;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, smooth);
    this.camera.updateProjectionMatrix();
    const bob = p.moving
      ? Math.sin(this.time * (input.sprint ? 15 : 10)) * 0.013
      : Math.sin(this.time * 2) * 0.002;
    const aim = input.aim ? 1 : 0;
    this.handGroup.position.lerp(
      new THREE.Vector3(
        0.24 * (1 - aim),
        -0.23 - aim * 0.017 + bob,
        -0.4 + this.recoil * 0.055,
      ),
      smooth,
    );
    this.handGroup.rotation.set(
      p.reloading > 0
        ? -0.5 + Math.sin(p.reloading * 4) * 0.17
        : -Math.sin(this.slash * Math.PI) * 0.8,
      0,
      p.reloading > 0
        ? -0.38
        : bob * 0.3 + Math.sin(this.slash * Math.PI) * 1.2,
    );
    this.handGroup.visible =
      p.health > 0 &&
      !(
        input.aim &&
        (WEAPONS[p.weapon].family === "sniper" ||
          ["acog", "scope"].includes(this.profile.optic))
      );
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 180);
    const ids = new Set(state.players.map((p) => p.id));
    for (const [key, m] of this.models)
      if (!ids.has(key)) {
        this.scene.remove(m.g);
        this.models.delete(key);
      }
    for (const q of state.players) {
      if (q.id === id) continue;
      let m = this.models.get(q.id);
      if (!m) {
        m = this.makePlayer(q);
        this.models.set(q.id, m);
        m.g.position.set(q.x, q.y, q.z);
      }
      m.g.visible = q.health > 0;
      if (m.g.position.distanceTo(new THREE.Vector3(q.x, q.y, q.z)) > 5)
        m.g.position.set(q.x, q.y, q.z);
      else m.g.position.lerp(new THREE.Vector3(q.x, q.y, q.z), smooth);
      m.g.rotation.y = q.yaw;
      m.update(dt, q, this.time);
      m.legs.forEach((l, n) => {
        l.rotation.x = q.moving
          ? Math.sin(this.time * 9 + n * Math.PI) * 0.4
          : 0;
      });
      m.marker.visible = q.team === p.team;
      m.marker.rotation.y = this.time;
      if (m.weapon !== q.weapon) {
        m.g.remove(m.gun);
        disposeGroup(m.gun);
        m.gun = makeGun(
          q.weapon,
          q.weapon === "knife" ? q.knifeSkin : q.skin,
          q.knife,
        );
        m.gun.scale.setScalar(0.75);
        m.gun.position.set(0.18, 0.9, -0.37);
        m.g.add(m.gun);
        m.weapon = q.weapon;
      }
    }
    for (const e of state.events || []) {
      if (e.id <= this.lastEvent) continue;
      this.lastEvent = e.id;
      if (state.time - e.time > 0.45) continue;
      onEvent?.(e);
      if (e.type === "slash" && e.player === id) this.slash = 1;
      if (e.type === "shot") {
        if (e.player === id) {
          this.recoil = p.weapon === "knife" ? 2 : 0.65;
          this.flash.intensity = 9;
        }
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...e.from),
          new THREE.Vector3(...e.to),
        ]);
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: e.player === id ? "#ffdf8e" : "#fff2bb",
            transparent: true,
            opacity: 0.7,
          }),
        );
        this.scene.add(line);
        this.effects.push({ mesh: line, life: 0.075 });
        const spark = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 5, 5),
          new THREE.MeshBasicMaterial({ color: "#ffdc85" }),
        );
        spark.position.set(...e.to);
        this.scene.add(spark);
        this.effects.push({ mesh: spark, life: 0.14 });
      }
    }
    for (let n = this.effects.length - 1; n >= 0; n--) {
      const e = this.effects[n];
      e.life -= dt;
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        e.mesh.material.dispose();
        this.effects.splice(n, 1);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.observer.disconnect();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      const mats = o.material
        ? Array.isArray(o.material)
          ? o.material
          : [o.material]
        : [];
      mats.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    });
    this.environment?.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
