// Poly Haven CC0 sources. Preserve attribution/provenance in ASSETS.md.
import fs from "node:fs/promises";
const sets = {
  cobble: "cobblestone_floor_03",
  limestone: "white_sandstone_bricks",
  masonry: "plaster_stone_wall_02",
  plaster: "rough_plaster_broken",
  timber: "weathered_brown_planks",
  tiles: "roof_09",
};
await fs.mkdir(".artifacts/environment-source", { recursive: true });
const sources = [];
for (const [name, id] of Object.entries(sets)) {
  const response = await fetch("https://api.polyhaven.com/files/" + id);
  if (!response.ok) throw new Error(`${id}: ${response.status}`);
  const files = await response.json();
  for (const [channel, key] of [
    ["color", "Diffuse"],
    ["normal", "nor_gl"],
    ["rough", "Rough"],
  ]) {
    const file = files[key]?.["1k"]?.jpg;
    if (!file) throw new Error(`Missing ${id} ${key}`);
    const image = await fetch(file.url);
    if (!image.ok) throw new Error(file.url);
    await fs.writeFile(
      `.artifacts/environment-source/${name}-${channel}.jpg`,
      Buffer.from(await image.arrayBuffer()),
    );
    sources.push({ name, channel, source: id, url: file.url });
  }
  console.log("Downloaded", id);
}
const sky = await (
  await fetch("https://api.polyhaven.com/files/kloppenheim_06_puresky")
).json();
const url = sky.hdri["1k"].hdr.url;
await fs.writeFile(
  "public/textures/daylight.hdr",
  Buffer.from(await (await fetch(url)).arrayBuffer()),
);
await fs.writeFile(
  ".artifacts/environment-source/sources.json",
  JSON.stringify([...sources, { name: "daylight", url }], null, 2),
);
