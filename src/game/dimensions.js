// Metres. The rendered operator, eye ray, hitbox and grenade origin share these.
export const PLAYER_HEIGHT = 1.6;
export const CROUCH_HEIGHT = 1.088;
export const EYE_HEIGHT = 1.43;
export const CROUCH_EYE_HEIGHT = 0.92;
export const eyeHeight = (p) =>
  p.y + (p.crouch ? CROUCH_EYE_HEIGHT : EYE_HEIGHT);
