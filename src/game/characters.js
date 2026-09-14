import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { OUTFITS } from "./catalog.js";
let loaded, pending;
export function loadCharacters() {
  if (loaded) return Promise.resolve(loaded);
  if (!pending)
    pending = new GLTFLoader()
      .loadAsync("/models/soldier.glb")
      .then((g) => (loaded = g))
      .catch((e) => {
        pending = null;
        throw e;
      });
  return pending;
}
export function createOperator(outfit = "vanguard", team = 0) {
  if (!loaded) throw new Error("Character model has not loaded");
  const look = OUTFITS.find((o) => o.id === outfit) || OUTFITS[0],
    g = new THREE.Group(),
    model = clone(loaded.scene);
  const bounds = new THREE.Box3().setFromObject(model),
    size = bounds.getSize(new THREE.Vector3());
  const modelHeight = 1.6,
    baseScale = modelHeight / size.y;
  model.scale.setScalar(baseScale);
  model.position.y = -bounds.min.y * baseScale;
  model.rotation.y = Math.PI;
  g.add(model);
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      o.material = o.material.clone();
      o.material.color.multiply(new THREE.Color(look.color));
      o.material.roughness = 0.64;
    }
  });
  const mixer = new THREE.AnimationMixer(model),
    actions = {};
  for (const clip of loaded.animations)
    actions[clip.name] = mixer.clipAction(clip);
  let action = actions.Idle;
  action?.play();
  const badge = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 12, 8),
    new THREE.MeshStandardMaterial({
      color: look.accent,
      emissive: look.accent,
      emissiveIntensity: 0.3,
    }),
  );
  badge.scale.set(1, 0.5, 0.3);
  badge.position.set(0.12, 1.18, -0.21);
  g.add(badge);
  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: team === 0 ? "#7ccbff" : "#ffaf70" }),
  );
  marker.position.y = 1.85;
  g.add(marker);
  const left =
      model.getObjectByName("mixamorigLeftArm") ||
      model.getObjectByName("mixamorig:LeftArm"),
    right =
      model.getObjectByName("mixamorigRightArm") ||
      model.getObjectByName("mixamorig:RightArm");
  return {
    g,
    model,
    marker,
    legs: [],
    update(dt, p) {
      const next = p.moving
        ? p.sprint
          ? actions.Run
          : actions.Walk
        : actions.Idle;
      if (next && next !== action) {
        action?.fadeOut(0.18);
        next.reset().fadeIn(0.18).play();
        action = next;
      }
      mixer.update(dt);
      if (left) left.rotation.z -= 0.8;
      if (right) right.rotation.z += 0.8;
      model.scale.y = baseScale * (p.crouch ? 0.67 : 1);
      model.position.y = -bounds.min.y * model.scale.y;
      badge.position.y = p.crouch ? 0.79 : 1.18;
      marker.position.y = p.crouch ? 1.27 : 1.85;
    },
  };
}
