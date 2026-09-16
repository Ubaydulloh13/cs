import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadWeaponAssets } from "./game/weapon-assets.js";
import { makeGun, disposeGroup, updateGunAnimation } from "./game/models.js";
import { SKINS } from "./game/config.js";
export function GunThumbnail({ skin = "standard" }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current,
      ctx = c.getContext("2d"),
      s = SKINS.find((s) => s.id === skin) || SKINS[0];
    c.width = 480;
    c.height = 180;
    ctx.clearRect(0, 0, 480, 180);
    ctx.save();
    ctx.translate(35, 105);
    ctx.rotate(-0.12);
    ctx.shadowColor = "#0008";
    ctx.shadowBlur = 12;
    const shape = (color, points) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    };
    shape("#282e28", [
      [0, -13],
      [60, -20],
      [72, -14],
      [70, 10],
      [7, 22],
      [0, 17],
    ]);
    shape(s.color, [
      [57, -22],
      [204, -22],
      [208, 5],
      [67, 10],
    ]);
    shape(s.color, [
      [207, -21],
      [289, -21],
      [290, -3],
      [207, -1],
    ]);
    shape("#343c34", [
      [289, -14],
      [372, -14],
      [372, -7],
      [289, -7],
    ]);
    shape("#272f27", [
      [365, -18],
      [388, -18],
      [388, -3],
      [365, -3],
    ]);
    shape("#272f27", [
      [116, 4],
      [137, 4],
      [131, 45],
      [113, 45],
      [109, 36],
    ]);
    shape(s.accent, [
      [161, 0],
      [184, 0],
      [190, 40],
      [207, 65],
      [185, 70],
      [163, 43],
    ]);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#bbc5ab";
    ctx.globalAlpha = 0.24;
    ctx.fillRect(70, -19, 126, 3);
    ctx.globalAlpha = 1;
    for (let n = 0; n < 8; n++) {
      ctx.fillStyle = "#283024";
      ctx.fillRect(214 + n * 8, -23, 4, 6);
    }
    shape("#273124", [
      [266, -22],
      [270, -40],
      [277, -40],
      [281, -21],
    ]);
    shape("#3b4535", [
      [71, -22],
      [74, -35],
      [84, -35],
      [87, -22],
    ]);
    for (let n = 0; n < 4; n++) {
      ctx.fillStyle = s.accent;
      ctx.fillRect(86 + n * 27, -15, 9, 9);
    }
    ctx.restore();
  }, [skin]);
  return (
    <canvas
      ref={ref}
      className="gun-thumbnail"
      aria-label={skin + " qurol skini"}
    />
  );
}
export default function GunPreview({
  weapon,
  skin,
  knife = "combat",
  optic = "red-dot",
}) {
  const ref = useRef(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      queueMicrotask(() => setError(true));
      return;
    }
    const el = ref.current;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(37, 1, 0.1, 20);
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.65;
    pmrem.dispose();
    room.dispose();
    scene.add(new THREE.HemisphereLight("#eaf1fa", "#555663", 2));
    const sun = new THREE.DirectionalLight("#f2ffe4", 5);
    sun.position.set(3, 4, 2);
    scene.add(sun);
    const fill = new THREE.DirectionalLight("#adcb83", 2);
    fill.position.set(-3, 1, -2);
    scene.add(fill);
    let dead = false;
    let gun = makeGun(weapon, skin, knife, optic);
    loadWeaponAssets()
      .then(() => {
        if (dead) return;
        const old = gun;
        gun = makeGun(weapon, skin, knife, optic);
        gun.rotation.copy(old.rotation);
        scene.remove(old);
        disposeGroup(old);
        scene.add(gun);
        fit();
      })
      .catch(() => {});
    gun.rotation.set(0.04, Math.PI / 2 + 0.17, -0.035);
    scene.add(gun);
    const fit = () => {
      const bounds = new THREE.Box3().setFromObject(gun),
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      const distance =
        (1.3 * Math.max(size.y, size.x / camera.aspect)) /
          (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) +
        size.z * 0.5;
      camera.position
        .copy(center)
        .add(new THREE.Vector3(0, 0.045, Math.max(0.45, distance)));
      camera.lookAt(center);
    };
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      fit();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    let frame,
      lastX = null;
    const down = (e) => {
        lastX = e.clientX;
        el.setPointerCapture(e.pointerId);
      },
      move = (e) => {
        if (lastX !== null) {
          gun.rotation.y += (e.clientX - lastX) * 0.012;
          lastX = e.clientX;
        }
      },
      up = () => {
        lastX = null;
      };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    const animate = (now = performance.now()) => {
      frame = requestAnimationFrame(animate);
      if (lastX === null) gun.rotation.y += 0.00025;
      updateGunAnimation(gun, now / 1000);
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      scene.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      renderer.dispose();
      environment.dispose();
      renderer.domElement.remove();
    };
  }, [weapon, skin, knife, optic]);
  return (
    <div className="weapon-preview" ref={ref}>
      {error && <GunThumbnail skin={skin} />}
      <span>3D KO‘RINISH · AYLANTIRISH UCHUN SURING</span>
    </div>
  );
}
