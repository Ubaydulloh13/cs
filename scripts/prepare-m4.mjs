// Input: CC0 M4A1 from https://opengameart.org/content/m4a1-assault-rifle
// Converts the artist's mesh without changing its proportions; no runtime FBX dependency.
import { readFile, writeFile } from "node:fs/promises";
import { Group, Mesh, MeshStandardMaterial } from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result =
        "data:" +
        blob.type +
        ";base64," +
        Buffer.from(result).toString("base64");
      this.onloadend?.();
    });
  }
};
const data = await readFile(".artifacts/model-sources/m4/M4A1/M4A1.fbx");
const source = new FBXLoader().parse(
  data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  "",
);
source.updateMatrixWorld(true);
const model = new Group();
model.name = "M4A1";
source.traverse((node) => {
  if (!node.isMesh) return;
  const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
  geometry.translate(0.075856, -3.873955, -2.70884);
  geometry.scale(0.01, 0.01, 0.01);
  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({
      color: "#ffffff",
      metalness: 0.6,
      roughness: 0.48,
    }),
  );
  mesh.name = node.name;
  model.add(mesh);
});
await writeFile(
  "public/models/m4a1.glb",
  Buffer.from(await new GLTFExporter().parseAsync(model, { binary: true })),
);
console.log("Prepared detailed M4A1:", model.children.length, "parts");
