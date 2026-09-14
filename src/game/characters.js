import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { OUTFITS } from "./catalog.js";
import { PLAYER_HEIGHT } from "./dimensions.js";

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

export const OPERATOR_HEIGHT = PLAYER_HEIGHT;
const shoulder = new THREE.Vector3();
const elbow = new THREE.Vector3();
const wrist = new THREE.Vector3();
const direction = new THREE.Vector3();
const bend = new THREE.Vector3();
const desiredElbow = new THREE.Vector3();
const before = new THREE.Vector3();
const after = new THREE.Vector3();
const worldRotation = new THREE.Quaternion();
const parentRotation = new THREE.Quaternion();
const turn = new THREE.Quaternion();

function pointBone(bone, joint, target) {
  bone.getWorldPosition(before);
  joint.getWorldPosition(after).sub(before).normalize();
  before.copy(target).sub(before).normalize();
  turn.setFromUnitVectors(after, before);
  bone.getWorldQuaternion(worldRotation).premultiply(turn);
  bone.parent.getWorldQuaternion(parentRotation).invert();
  bone.quaternion.copy(parentRotation.multiply(worldRotation));
  bone.updateWorldMatrix(false, true);
}

// Solve from the current animated pose each frame, never accumulate offsets.
function aimArm(arm, target, pole) {
  if (!arm.upper || !arm.lower || !arm.hand) return;
  arm.upper.getWorldPosition(shoulder);
  arm.lower.getWorldPosition(elbow);
  arm.hand.getWorldPosition(wrist);
  const upperLength = shoulder.distanceTo(elbow);
  const lowerLength = elbow.distanceTo(wrist);
  const distance = THREE.MathUtils.clamp(
    shoulder.distanceTo(target),
    Math.abs(upperLength - lowerLength) + 0.001,
    upperLength + lowerLength - 0.002,
  );
  direction.copy(target).sub(shoulder).normalize();
  bend.copy(pole).sub(shoulder);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  const along =
    (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  desiredElbow
    .copy(shoulder)
    .addScaledVector(direction, along)
    .addScaledVector(bend, height);
  pointBone(arm.upper, arm.lower, desiredElbow);
  pointBone(arm.lower, arm.hand, target);
}

// All game sizing is outside the animated source subtree. Its imported
// centimetre conversion remains intact even when animation tracks run.
export function buildOperator(asset, outfit = "vanguard", team = 0) {
  const look = OUTFITS.find((o) => o.id === outfit) || OUTFITS[0];
  const g = new THREE.Group();
  const normalized = new THREE.Group();
  const origin = new THREE.Group();
  const model = clone(asset.scene);
  g.name = "operator";
  normalized.name = "operator-size";
  origin.add(model);
  normalized.add(origin);
  g.add(normalized);
  model.updateMatrixWorld(true);
  model.traverse((o) => o.skeleton?.update());
  const bounds = new THREE.Box3().setFromObject(model, true);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y < 0.001)
    throw new Error("Character model has invalid dimensions");
  const baseScale = OPERATOR_HEIGHT / size.y;
  normalized.scale.setScalar(baseScale);
  normalized.rotation.y = Math.PI;
  origin.position.set(-(bounds.max.x + bounds.min.x) / 2, -bounds.min.y, 0);
  const ownedMaterials = [];
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      const tint = (material) => {
        const copy = material.clone();
        copy.color?.multiply(
          new THREE.Color(look.color).lerp(new THREE.Color("#ffffff"), 0.22),
        );
        copy.roughness = 0.69;
        ownedMaterials.push(copy);
        return copy;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(tint)
        : tint(o.material);
    }
  });
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of asset.animations)
    actions[clip.name] = mixer.clipAction(clip);
  let action = actions.Idle || Object.values(actions)[0];
  action?.play();
  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.075),
    new THREE.MeshBasicMaterial({ color: team === 0 ? "#7ccbff" : "#ffaf70" }),
  );
  marker.position.y = 1.83;
  g.add(marker);
  const findBone = (name) =>
    model.getObjectByName("mixamorig" + name) ||
    model.getObjectByName("mixamorig:" + name);
  const arms = ["Right", "Left"].map((side) => ({
    upper: findBone(side + "Arm"),
    lower: findBone(side + "ForeArm"),
    hand: findBone(side + "Hand"),
    target: new THREE.Vector3(),
    pole: new THREE.Vector3(),
  }));
  const grip = new THREE.Vector3(0.13, 1.07, -0.17);
  const support = new THREE.Vector3(-0.035, 1.11, -0.45);
  const rightPole = new THREE.Vector3(0.45, 0.85, -0.06);
  const leftPole = new THREE.Vector3(-0.36, 0.9, -0.15);
  let disposed = false;
  const actor = {
    g,
    model,
    normalized,
    marker,
    mixer,
    legs: [],
    update(dt, p = {}) {
      const next = p.moving
        ? p.sprint
          ? actions.Run
          : actions.Walk
        : actions.Idle;
      if (next && next !== action) {
        action?.fadeOut(0.16);
        next.reset().fadeIn(0.16).play();
        action = next;
      }
      mixer.update(Math.min(dt, 0.1));
      normalized.scale.set(
        baseScale,
        baseScale * (p.crouch ? 0.68 : 1),
        baseScale,
      );
      marker.position.y = p.crouch ? 1.23 : 1.83;
      g.updateWorldMatrix(true, true);
      for (let i = 0; i < arms.length; i++) {
        const arm = arms[i];
        arm.target.copy(i ? support : grip);
        arm.pole.copy(i ? leftPole : rightPole);
        if (p.crouch) {
          arm.target.y *= 0.68;
          arm.pole.y *= 0.68;
        }
        if (p.weapon === "knife" && i === 0)
          arm.target.set(0.23, p.crouch ? 0.68 : 1.02, -0.27);
        g.localToWorld(arm.target);
        g.localToWorld(arm.pole);
        aimArm(arm, arm.target, arm.pole);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      ownedMaterials.forEach((m) => m.dispose());
      marker.geometry.dispose();
      marker.material.dispose();
      // Geometry and textures belong to the cached asset, not an instance.
    },
  };
  actor.update(0, {});
  return actor;
}

export function createOperator(outfit = "vanguard", team = 0) {
  if (!loaded) throw new Error("Character model has not loaded");
  return buildOperator(loaded, outfit, team);
}
