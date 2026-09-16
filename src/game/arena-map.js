// Rendered walls, movement collision and bullet occlusion share these solids.
// An interior is empty space between wall segments, never a solid building box.
const solid = (x, z, w, d, h, kind = "wall", y = 0) => ({
  x,
  z,
  w,
  d,
  h,
  y,
  kind,
  color: "#a2aaa7",
});
export const ARENA_BOXES = [
  solid(-25, 0, 0.5, 46, 3.4, "boundary"),
  solid(25, 0, 0.5, 46, 3.4, "boundary"),
  solid(0, -23, 50, 0.5, 3.4, "boundary"),
  solid(0, 23, 50, 0.5, 3.4, "boundary"),
];
export const ARENA_BUILDINGS = [
  { x: 0, z: 0, w: 16, d: 15, h: 4.6, door: 3.2, kind: "warehouse" },
  { x: -17, z: -11, w: 4.3, d: 8, h: 2.7, door: 2.2, kind: "container" },
  { x: 17, z: 11, w: 4.3, d: 8, h: 2.7, door: 2.2, kind: "container" },
  { x: 15.5, z: -12, w: 6, d: 3, h: 2.7, door: 2.1, kind: "cabin" },
  { x: -15.5, z: 12, w: 6, d: 3, h: 2.7, door: 2.1, kind: "cabin" },
];
for (const b of ARENA_BUILDINGS) {
  const thickness = b.kind === "warehouse" ? 0.24 : 0.15,
    side = (b.w - b.door) / 2;
  for (const sign of [-1, 1]) {
    ARENA_BOXES.push(
      solid(
        b.x + sign * (b.door / 2 + side / 2),
        b.z - b.d / 2,
        side,
        thickness,
        b.h,
        b.kind,
      ),
    );
    ARENA_BOXES.push(
      solid(
        b.x + sign * (b.door / 2 + side / 2),
        b.z + b.d / 2,
        side,
        thickness,
        b.h,
        b.kind,
      ),
    );
  }
  for (const sign of [-1, 1]) {
    if (b.kind === "warehouse") {
      const length = (b.d - 3.2) / 2;
      for (const end of [-1, 1])
        ARENA_BOXES.push(
          solid(
            b.x + (sign * b.w) / 2,
            b.z + end * (1.6 + length / 2),
            thickness,
            length,
            b.h,
            b.kind,
          ),
        );
      ARENA_BOXES.push(
        solid(
          b.x + (sign * b.w) / 2,
          b.z,
          thickness,
          3.2,
          b.h - 2.7,
          b.kind,
          2.7,
        ),
      );
    } else
      ARENA_BOXES.push(
        solid(b.x + (sign * b.w) / 2, b.z, thickness, b.d, b.h, b.kind),
      );
    ARENA_BOXES.push(
      solid(
        b.x,
        b.z + (sign * b.d) / 2,
        b.door,
        thickness,
        b.h - 2.3,
        b.kind,
        2.3,
      ),
    );
  }
  if (b.kind !== "warehouse")
    ARENA_BOXES.push(solid(b.x, b.z, b.w + 0.1, b.d + 0.1, 0.12, "roof", b.h));
}
// The upper ventilation band is visibly open; doorways stay full height.
for (let i = ARENA_BOXES.length - 1; i >= 0; i--) {
  const b = ARENA_BOXES[i];
  if (b.kind !== "warehouse") continue;
  const bottom = b.y || 0;
  b.h = 3.25 - bottom;
  ARENA_BOXES.push({ ...b, y: 4.3, h: 0.3 });
}
ARENA_BOXES.push(
  // Interior cover leaves four connected routes through the warehouse.
  solid(-3, -3, 3.5, 0.5, 1.45, "concrete"),
  solid(3, 3, 3.5, 0.5, 1.45, "concrete"),
  solid(-4, 2.7, 2, 2, 1.35, "crate"),
  solid(4, -2.7, 2, 2, 1.35, "crate"),
  solid(-13, 2, 0.7, 5.8, 1.6, "logs"),
  solid(13, -2, 0.7, 5.8, 1.6, "logs"),
  solid(-19, 1, 0.7, 4.5, 1.6, "logs"),
  solid(19, -1, 0.7, 4.5, 1.6, "logs"),
  solid(-6, 13, 4, 0.45, 1.45, "concrete"),
  solid(6, -13, 4, 0.45, 1.45, "concrete"),
  solid(-3, -16, 2, 1.8, 1.4, "crate"),
  solid(3, 16, 2, 1.8, 1.4, "crate"),
  solid(11, 6, 2, 2, 1.3, "crate"),
  solid(-11, -6, 2, 2, 1.3, "crate"),
);
export const ARENA_MAP = {
  name: "Arena",
  subtitle: "Ochiq ombor · konteynerlar · yon yo‘laklar",
  sky: "#bed0dc",
  fog: "#c0c9ca",
  ground: "#7f876d",
  boxes: ARENA_BOXES,
};
