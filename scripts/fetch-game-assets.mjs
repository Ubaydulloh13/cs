import { mkdir, writeFile } from "node:fs/promises";
const assets = [
  [
    "models/soldier.glb",
    "https://threejs.org/examples/models/gltf/Soldier.glb",
  ],
  [
    "textures/concrete-color.jpg",
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg",
  ],
  [
    "textures/concrete-normal.jpg",
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_worn_001/concrete_floor_worn_001_nor_gl_1k.jpg",
  ],
  [
    "textures/concrete-rough.jpg",
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_worn_001/concrete_floor_worn_001_rough_1k.jpg",
  ],
  [
    "textures/brick-color.jpg",
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brick_wall_001/brick_wall_001_diffuse_1k.jpg",
  ],
  [
    "textures/brick-normal.jpg",
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brick_wall_001/brick_wall_001_nor_gl_1k.jpg",
  ],
];
let failed = 0;
for (const [file, url] of assets) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(45000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const bytes = new Uint8Array(await r.arrayBuffer());
    await mkdir("public/" + file.split("/")[0], { recursive: true });
    await writeFile("public/" + file, bytes);
    console.log(file, bytes.length);
  } catch (e) {
    failed++;
    console.error(file, e.message);
  }
}
if (failed) process.exitCode = 1;
