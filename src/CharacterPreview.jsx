import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadCharacters, createOperator } from "./game/characters.js";
import { makeGun, disposeGroup } from "./game/models.js";
export default function CharacterPreview({ outfit, weapon, skin }) {
  const ref = useRef(null),
    [status, setStatus] = useState("Personaj yuklanmoqda…");
  useEffect(() => {
    let renderer,
      actor,
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
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    camera.position.set(1.9, 1.15, 3.4);
    camera.lookAt(0, 0.98, 0);
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment(),
      environment = pmrem.fromScene(room, 0.04).texture;
    scene.environment = environment;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight("#deecff", "#665841", 3));
    const light = new THREE.DirectionalLight("#d5e5ff", 4);
    light.position.set(2, 4, 3);
    scene.add(light);
    const rim = new THREE.DirectionalLight("#b6e985", 3);
    rim.position.set(-3, 2, -2);
    scene.add(rim);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.7, 0.08, 64),
      new THREE.MeshStandardMaterial({
        color: "#303a3b",
        metalness: 0.4,
        roughness: 0.55,
      }),
    );
    platform.position.y = -0.04;
    scene.add(platform);
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    loadCharacters()
      .then(() => {
        if (dead) return;
        actor = createOperator(outfit);
        actor.marker.visible = false;
        const gun = makeGun(weapon, skin);
        gun.scale.setScalar(0.72);
        gun.position.set(0.14, 1.1, -0.34);
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
      });
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
