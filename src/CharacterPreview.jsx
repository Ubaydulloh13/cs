import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadWeaponAssets } from "./game/weapon-assets.js";
import { loadCharacters, createOperator } from "./game/characters.js";
import { makeGun, disposeGroup, updateGunAnimation } from "./game/models.js";
export default function CharacterPreview({ outfit, weapon, skin }) {
  const ref = useRef(null),
    [status, setStatus] = useState("Personaj yuklanmoqda…");
  useEffect(() => {
    let renderer,
      actor,
      gun,
      frame,
      dead = false,
      last = performance.now();
    const el = ref.current;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      queueMicrotask(() => setStatus("3D ko‘rinish uchun WebGL kerak."));
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x10171b, 0);
    renderer.domElement.setAttribute(
      "aria-label",
      "Tanlangan operatorning aylantiriladigan 3D ko‘rinishi",
    );
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    camera.position.set(0.45, 1.08, 3.1);
    camera.lookAt(0, 0.79, 0);
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment(),
      environment = pmrem.fromScene(room, 0.04).texture;
    scene.environment = environment;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight("#deecff", "#665841", 3));
    const light = new THREE.DirectionalLight("#d5e5ff", 4);
    light.position.set(2, 4, 3);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = light.shadow.camera.bottom = -2;
    light.shadow.camera.right = light.shadow.camera.top = 2;
    light.shadow.normalBias = 0.015;
    scene.add(light);
    const rim = new THREE.DirectionalLight("#b6e985", 3);
    rim.position.set(-3, 2, -2);
    scene.add(rim);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.8, 0.08, 48),
      new THREE.MeshStandardMaterial({
        color: "#303a3b",
        metalness: 0.4,
        roughness: 0.55,
      }),
    );
    platform.position.y = -0.04;
    platform.receiveShadow = true;
    scene.add(platform);
    const resize = () => {
      const width = Math.max(el.clientWidth, 1);
      const height = Math.max(el.clientHeight, 1);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      // Keep the full body in frame on narrow mobile panels as well.
      camera.position.z = camera.aspect < 0.8 ? 3.7 : 3.1;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    Promise.all([loadCharacters(), loadWeaponAssets()])
      .then(() => {
        if (dead) return;
        actor = createOperator(outfit);
        actor.marker.visible = false;
        actor.g.rotation.y = Math.PI - 0.2;
        gun = makeGun(weapon, skin);
        gun.position.set(0.13, 1.15, -0.23);
        actor.g.add(gun);
        scene.add(actor.g);
        setStatus("");
      })
      .catch(() => {
        if (!dead) setStatus("Personaj yuklanmadi. Sahifani yangilang.");
      });
    let start = null;
    const down = (e) => {
        start = e.clientX;
        el.setPointerCapture(e.pointerId);
      },
      move = (e) => {
        if (start !== null && actor) {
          actor.g.rotation.y += (e.clientX - start) * 0.012;
          start = e.clientX;
        }
      },
      up = () => (start = null);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    const draw = (now) => {
      frame = requestAnimationFrame(draw);
      actor?.update(Math.min((now - last) / 1000, 0.05), {
        moving: false,
        crouch: false,
        weapon,
      });
      if (gun) updateGunAnimation(gun, now / 1000);
      last = now;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      for (const [event, fn] of [
        ["pointerdown", down],
        ["pointermove", move],
        ["pointerup", up],
        ["pointercancel", up],
      ])
        el.removeEventListener(event, fn);
      if (actor) {
        scene.remove(actor.g);
        actor.dispose();
      }
      if (gun) disposeGroup(gun);
      disposeGroup(scene);
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [outfit, weapon, skin]);
  return (
    <div ref={ref} className="character-preview">
      {status && <span>{status}</span>}
      <small>AYLANTIRISH UCHUN SURING</small>
    </div>
  );
}
