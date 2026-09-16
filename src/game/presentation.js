import { wallDistance, rayBox } from "./simulation.js";
import { eyeHeight, PLAYER_HEIGHT, CROUCH_HEIGHT } from "./dimensions.js";
const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (n) => {
  n = clamp(n);
  return n * n * (3 - 2 * n);
};
export function weaponPresentation(player, time) {
  const actionAge = time - (player.weaponActionAt ?? -10);
  const stow =
    player.weaponAction === "holster"
      ? ease(actionAge / 0.55)
      : 1 - ease(actionAge / 0.55);
  const inspecting = Math.max(0, time - (player.inspectAt ?? -10));
  let inspect = 0,
    turn = 0;
  if (inspecting < 2.65 && !player.holstered && player.reloading <= 0) {
    inspect = ease(inspecting / 0.32) * (1 - ease((inspecting - 2.15) / 0.5));
    turn = inspecting < 1.18 ? -0.6 : 0.7;
    if (inspecting >= 0.95 && inspecting < 1.4)
      turn = -0.6 + 1.3 * ease((inspecting - 0.95) / 0.45);
  }
  return {
    stow,
    inspect,
    turn,
    visible: !player.holstered || actionAge < 0.55,
  };
}
export function orbitCamera(player, input, boxes) {
  const yaw = (input.yaw ?? player.yaw) + (input.orbitYaw || 0),
    pitch =
      input.orbitPitch ??
      Math.max(-0.9, Math.min(1.1, 0.24 - (input.pitch || 0)));
  const head = [player.x, eyeHeight(player) - 0.12, player.z];
  const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const shoulder = Math.max(
    0,
    Math.min(input.aim ? 0.38 : 0.58, wallDistance(head, right, boxes) - 0.2),
  );
  const target = head.map((v, i) => v + right[i] * shoulder);
  const direction = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ];
  // Probe the camera's edges as well as its centre so corners cannot clip.
  let obstruction = Infinity;
  for (const [x, y, z] of [
    [0, 0, 0],
    [0.16, 0, 0],
    [-0.16, 0, 0],
    [0, 0.12, 0],
    [0, -0.12, 0],
  ])
    obstruction = Math.min(
      obstruction,
      wallDistance(
        [target[0] + x, target[1] + y, target[2] + z],
        direction,
        boxes,
      ),
    );
  const distance = Math.max(
    0.12,
    Math.min(input.aim ? 1.9 : 3.4, obstruction - 0.18),
  );
  return {
    position: target.map((v, i) => v + direction[i] * distance),
    target,
  };
}

// Aim at the third-person screen ray while still firing from the player's eye.
// A wall between the player and that point remains authoritative in shoot().
export function thirdPersonAim(player, input, boxes, players = []) {
  const pose = orbitCamera(player, input, boxes),
    ray = pose.target.map((v, i) => v - pose.position[i]);
  const length = Math.hypot(...ray),
    dir = ray.map((v) => v / length);
  let distance = Math.min(100, wallDistance(pose.position, dir, boxes));
  for (const other of players) {
    if (other.id === player.id || other.health <= 0) continue;
    distance = Math.min(
      distance,
      rayBox(
        pose.position,
        dir,
        [other.x - 0.36, other.y, other.z - 0.36],
        [
          other.x + 0.36,
          other.y + (other.crouch ? CROUCH_HEIGHT : PLAYER_HEIGHT),
          other.z + 0.36,
        ],
      ),
    );
  }
  const point = pose.position.map((v, i) => v + dir[i] * distance),
    origin = [player.x, eyeHeight(player), player.z],
    delta = point.map((v, i) => v - origin[i]);
  return {
    shotYaw: Math.atan2(-delta[0], -delta[2]),
    shotPitch: Math.atan2(delta[1], Math.hypot(delta[0], delta[2])),
  };
}
