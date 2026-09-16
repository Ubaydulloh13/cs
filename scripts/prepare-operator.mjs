// Convert the Mixamo SWAT game asset distributed by Lumak (see ASSETS.md).
// Format definitions: Urho3D Graphics/{Model,Skeleton,Animation}.cpp.
import fs from "node:fs/promises";
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};
class Reader {
  constructor(bytes) {
    this.b = bytes;
    this.p = 0;
  }
  u8() {
    return this.b[this.p++];
  }
  u32() {
    const v = this.b.readUInt32LE(this.p);
    this.p += 4;
    return v;
  }
  f() {
    const v = this.b.readFloatLE(this.p);
    this.p += 4;
    return v;
  }
  floats(n) {
    return Array.from({ length: n }, () => this.f());
  }
  str() {
    const end = this.b.indexOf(0, this.p),
      v = this.b.toString("utf8", this.p, end);
    this.p = end + 1;
    return v;
  }
  id() {
    const v = this.b.toString("ascii", this.p, this.p + 4);
    this.p += 4;
    return v;
  }
}
const rename = (name) =>
  "mixamorig" + name.replace(/^.*:/, "").replace(/^mixamorig/, "");
const reflect = new T.Matrix4().makeScale(1, 1, -1);
const pos = (a) => [a[0], a[1], -a[2]],
  quat = (a) => [-a[1], -a[2], a[3], a[0]];
const r = new Reader(await fs.readFile(".artifacts/swat-source/Swat.mdl"));
if (r.id() !== "UMD2") throw Error("Expected UMD2");
const buffers = [];
for (let count = r.u32(), i = 0; i < count; i++) {
  const n = r.u32(),
    elements = Array.from({ length: r.u32() }, () => r.u32());
  r.u32();
  r.u32();
  const attributes = {};
  for (const e of elements) {
    const semantic = (e >> 8) & 255,
      type = e & 255;
    attributes[semantic] = {
      data: [],
      size: [1, 1, 2, 3, 4, 4, 4][type],
      type,
    };
  }
  for (let j = 0; j < n; j++)
    for (const e of elements) {
      const a = attributes[(e >> 8) & 255];
      for (let k = 0; k < a.size; k++)
        a.data.push(a.type >= 5 ? r.u8() : r.f());
    }
  buffers.push(attributes);
}
const indices = [];
for (let count = r.u32(), i = 0; i < count; i++) {
  const n = r.u32(),
    size = r.u32();
  const list = [];
  for (let j = 0; j < n; j++) {
    list.push(size === 2 ? r.b.readUInt16LE(r.p) : r.b.readUInt32LE(r.p));
    r.p += size;
  }
  indices.push(list);
}
const geometries = [];
for (let count = r.u32(), i = 0; i < count; i++) {
  const mapping = Array.from({ length: r.u32() }, () => r.u32());
  for (let lods = r.u32(), j = 0; j < lods; j++) {
    r.f();
    r.u32();
    const vb = r.u32(),
      ib = r.u32(),
      start = r.u32(),
      count = r.u32();
    if (j === 0) geometries.push({ mapping, vb, ib, start, count });
  }
}
if (r.u32() !== 0) throw Error("Unexpected morph targets");
const bones = [],
  parents = [],
  inverses = [];
for (let count = r.u32(), i = 0; i < count; i++) {
  const bone = new T.Bone();
  bone.name = rename(r.str());
  parents.push(r.u32());
  bone.position.fromArray(pos(r.floats(3)));
  bone.quaternion.fromArray(quat(r.floats(4)));
  bone.scale.fromArray(r.floats(3));
  const m = r.floats(12),
    inverse = new T.Matrix4().set(
      ...m.slice(0, 4),
      ...m.slice(4, 8),
      ...m.slice(8, 12),
      0,
      0,
      0,
      1,
    );
  inverses.push(inverse.premultiply(reflect).multiply(reflect));
  const collision = r.u8();
  if (collision & 1) r.f();
  if (collision & 2) r.floats(6);
  bones.push(bone);
}
const model = new T.Group();
model.name = "TacticalOperator";
bones.forEach((bone, i) => {
  if (parents[i] === i) model.add(bone);
  else bones[parents[i]].add(bone);
});
const skeleton = new T.Skeleton(bones, inverses);
for (const [i, g] of geometries.entries()) {
  const geo = new T.BufferGeometry(),
    a = buffers[g.vb];
  for (const [semantic, name] of [
    [0, "position"],
    [1, "normal"],
    [4, "uv"],
    [6, "skinWeight"],
    [7, "skinIndex"],
  ]) {
    const src = a[semantic];
    if (!src) continue;
    const data = [...src.data];
    if (semantic === 0 || semantic === 1)
      for (let n = 2; n < data.length; n += 3) data[n] *= -1;
    if (semantic === 7 && g.mapping.length)
      for (let n = 0; n < data.length; n++) data[n] = g.mapping[data[n]] ?? 0;
    geo.setAttribute(
      name,
      semantic === 7
        ? new T.Uint16BufferAttribute(data, src.size)
        : new T.Float32BufferAttribute(data, src.size),
    );
  }
  const list = indices[g.ib].slice(g.start, g.start + g.count);
  for (let n = 0; n < list.length; n += 3)
    [list[n + 1], list[n + 2]] = [list[n + 2], list[n + 1]];
  // Remove vertices belonging to another material section before exporting.
  const used = [...new Set(list)],
    remap = new Map(used.map((v, i) => [v, i]));
  for (const [key, attribute] of Object.entries(geo.attributes)) {
    const values = [];
    for (const vertex of used)
      for (let c = 0; c < attribute.itemSize; c++)
        values.push(attribute.getComponent(vertex, c));
    geo.setAttribute(
      key,
      key === "skinIndex"
        ? new T.Uint16BufferAttribute(values, attribute.itemSize)
        : new T.Float32BufferAttribute(values, attribute.itemSize),
    );
  }
  geo.setIndex(list.map((i) => remap.get(i)));
  const mat = new T.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85 });
  mat.name = i === 1 ? "swat-head" : "swat-body";
  const mesh = new T.SkinnedMesh(geo, mat);
  mesh.name = mat.name;
  mesh.bind(skeleton, new T.Matrix4());
  model.add(mesh);
}
const animations = [];
for (const [file, name] of [
  ["Idle", "Idle"],
  ["WalkFwd", "Walk"],
  ["RunFwd", "Run"],
]) {
  const a = new Reader(
    await fs.readFile(`.artifacts/swat-source/Swat_${file}.ani`),
  );
  if (a.id() !== "UANI") throw Error("UANI expected");
  a.str();
  const duration = a.f(),
    tracks = [];
  for (let n = a.u32(), i = 0; i < n; i++) {
    const bone = rename(a.str()),
      mask = a.u8(),
      times = [],
      ps = [],
      qs = [],
      ss = [];
    for (let keys = a.u32(), j = 0; j < keys; j++) {
      times.push(a.f());
      if (mask & 1) ps.push(...pos(a.floats(3)));
      if (mask & 2) qs.push(...quat(a.floats(4)));
      if (mask & 4) ss.push(...a.floats(3));
    }
    if (mask & 1) {
      if (bone.endsWith("Hips"))
        for (let j = 0; j < ps.length; j += 3) {
          ps[j] = ps[0];
          ps[j + 2] = ps[2];
        }
      tracks.push(new T.VectorKeyframeTrack(bone + ".position", times, ps));
    }
    if (mask & 2)
      tracks.push(
        new T.QuaternionKeyframeTrack(bone + ".quaternion", times, qs),
      );
    if (mask & 4)
      tracks.push(new T.VectorKeyframeTrack(bone + ".scale", times, ss));
  }
  animations.push(new T.AnimationClip(name, duration, tracks));
}
model.updateMatrixWorld(true);
await fs.writeFile(
  "public/models/operator.glb",
  Buffer.from(
    await new GLTFExporter().parseAsync(model, { binary: true, animations }),
  ),
);
console.log(
  "Operator:",
  bones.length,
  "bones",
  geometries.length,
  "meshes",
  new T.Box3().setFromObject(model).getSize(new T.Vector3()).toArray(),
);
