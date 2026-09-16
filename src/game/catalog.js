const gun = (id, name, family, damage, magazine, rate, price = 0) => ({
  id,
  name,
  family,
  damage,
  magazine,
  rate,
  price,
  slot: 1,
  reload: family === "lmg" ? 3.5 : 2.1,
  spread: 0,
  description:
    family === "sniper" ? "Uzoq masofa · aniq zarba" : "Asosiy jang quroli",
});
export const PRIMARY_WEAPONS = [
  gun("ak", "AK-47", "ak", 34, 30, 0.11),
  gun("m4", "M4A1", "ar", 30, 30, 0.095),
  gun("mp5", "MP5", "smg", 24, 30, 0.075),
  gun("awp", "AWP", "sniper", 100, 10, 1.05),
  gun("scar", "SCAR-L", "scar", 35, 30, 0.12, 900),
  gun("hk416", "HK416", "ar", 32, 30, 0.09, 800),
  gun("aug", "AUG A3", "bullpup", 32, 30, 0.1, 750),
  gun("famas", "FAMAS", "bullpup", 27, 25, 0.08, 650),
  gun("g36", "G36C", "ar", 31, 30, 0.1, 700),
  gun("ak12", "AK-12", "ak", 33, 30, 0.105, 850),
  gun("acr", "ACR", "ar", 31, 30, 0.095, 800),
  gun("tavor", "TAR-21", "bullpup", 32, 30, 0.1, 900),
  gun("sg553", "SG 553", "ar", 34, 30, 0.11, 950),
  gun("galil", "Galil ACE", "ak", 33, 35, 0.115, 700),
  gun("ump45", "UMP-45", "smg", 35, 25, 0.13, 600),
  gun("p90", "P90", "bullpup", 23, 50, 0.07, 900),
  gun("vector", "Vector", "smg", 21, 33, 0.06, 1000),
  gun("m249", "M249", "lmg", 29, 100, 0.09, 1800),
  gun("svd", "SVD", "sniper", 68, 10, 0.42, 1500),
  gun("scarh", "SCAR-H", "scar", 42, 20, 0.14, 1200),
  gun("asval", "AS VAL", "ak", 31, 20, 0.08, 1250),
  gun("mp7", "MP7", "smg", 23, 40, 0.07, 1100),
  gun("bizon", "PP-Bizon", "smg", 25, 64, 0.085, 1000),
  gun("an94", "AN-94", "ak", 35, 30, 0.095, 1350),
];
export const WEAPONS = Object.fromEntries(
  [
    ...PRIMARY_WEAPONS,
    { ...gun("pistol", "P226", "pistol", 28, 15, 0.22), slot: 2, reload: 1.5 },
    {
      ...gun("knife", "Pichoq", "knife", 65, 1, 0.55),
      slot: 3,
      range: 2.5,
      reload: 0,
    },
  ].map((w) => [w.id, w]),
);
const finish = (
  id,
  name,
  color,
  accent,
  price,
  tier,
  pattern,
  evolution = null,
) => ({
  id,
  name,
  color,
  accent,
  price,
  tier,
  pattern,
  evolution,
  rarity:
    tier === "broadcast"
      ? "MYTHIC"
      : tier === "animated"
        ? "LEGENDARY"
        : price
          ? "RARE"
          : "STANDARD",
  animated: tier === "animated" || tier === "broadcast",
  broadcast: tier === "broadcast",
  broadcastAnimated: tier === "broadcast",
  feedClass:
    tier === "broadcast"
      ? "broadcast-" + (evolution || pattern) + " broadcast-animated"
      : "",
});
// Thirty purchasable finishes: each purchase belongs to one selected weapon.
export const SKINS = [
  finish(
    "standard",
    "Field Issue",
    "#42464a",
    "#262b30",
    0,
    "standard",
    "metal",
  ),
  finish("desert", "Desert Sand", "#b49a70", "#56462d", 250, "static", "camo"),
  finish(
    "arctic",
    "Arctic Wolf",
    "#e5eaf0",
    "#668493",
    350,
    "static",
    "shards",
  ),
  finish(
    "crimson",
    "Crimson Strike",
    "#ad2939",
    "#efe3d2",
    500,
    "static",
    "racing",
  ),
  finish("gold", "Royal Gold", "#d7b45e", "#292431", 900, "static", "engraved"),
  finish("toxic", "Toxic Venom", "#93c540", "#203229", 650, "static", "hex"),
  finish(
    "obsidian",
    "Obsidian Edge",
    "#262035",
    "#be88ff",
    1000,
    "static",
    "shards",
  ),
  finish("tiger", "Tiger Strike", "#cf8632", "#262328", 500, "static", "tiger"),
  finish("ocean", "Ocean Depth", "#236c8d", "#a2edf1", 600, "static", "wave"),
  finish(
    "royal",
    "Royal Guard",
    "#3431a4",
    "#e9c26a",
    850,
    "static",
    "engraved",
  ),
  finish("ivory", "Ivory Rebel", "#e7e0cf", "#df4026", 750, "static", "racing"),
  finish(
    "spectrum",
    "Spectrum Fade",
    "#e755aa",
    "#79d9ec",
    950,
    "animated",
    "wave",
  ),
  finish(
    "cyber",
    "Cyber Circuit",
    "#173e4d",
    "#38f8c5",
    1200,
    "animated",
    "circuit",
  ),
  finish(
    "plasma",
    "Plasma Current",
    "#363282",
    "#5bf7ff",
    1100,
    "animated",
    "circuit",
  ),
  finish("ember", "Ember Flow", "#411e28", "#ff9350", 1150, "animated", "wave"),
  finish(
    "aurora",
    "Aurora Borealis",
    "#29455b",
    "#81ffd4",
    1250,
    "animated",
    "wave",
  ),
  finish(
    "pulse",
    "Crimson Pulse",
    "#661e3f",
    "#ff559e",
    1050,
    "animated",
    "hex",
  ),
  finish(
    "tidal",
    "Tidal Motion",
    "#143555",
    "#48caf5",
    1150,
    "animated",
    "wave",
  ),
  finish(
    "reactor",
    "Reactor Core",
    "#313a25",
    "#ccf84d",
    1300,
    "animated",
    "circuit",
  ),
  finish(
    "quicksilver",
    "Quicksilver",
    "#748390",
    "#d8f4ff",
    1200,
    "animated",
    "shards",
  ),
  finish(
    "sunset",
    "Solar Drift",
    "#bb4a51",
    "#f7d470",
    1000,
    "animated",
    "wave",
  ),
  finish(
    "glacier",
    "Glacier Reborn",
    "#b8edff",
    "#49bbec",
    1500,
    "broadcast",
    "shards",
    "ice",
  ),
  finish(
    "dragon",
    "Dragon Sovereign",
    "#712729",
    "#ffce73",
    1800,
    "broadcast",
    "scales",
    "dragon",
  ),
  finish(
    "inferno",
    "Inferno Forge",
    "#ce3927",
    "#ffaf33",
    1600,
    "broadcast",
    "wave",
    "flame",
  ),
  finish(
    "nebula",
    "Nebula Shift",
    "#7548b7",
    "#6adcf4",
    1400,
    "broadcast",
    "stars",
    "cosmic",
  ),
  finish(
    "storm",
    "Storm Herald",
    "#323e76",
    "#aac9ff",
    1700,
    "broadcast",
    "circuit",
    "lightning",
  ),
  finish(
    "phantom",
    "Phantom Bloom",
    "#392e55",
    "#d795ff",
    1750,
    "broadcast",
    "shards",
    "spectral",
  ),
  finish(
    "serpent",
    "Jade Serpent",
    "#1e5b4a",
    "#b0ffc4",
    1850,
    "broadcast",
    "scales",
    "serpent",
  ),
  finish(
    "eclipse",
    "Eclipse Crown",
    "#242131",
    "#ffc779",
    1900,
    "broadcast",
    "engraved",
    "eclipse",
  ),
  finish(
    "nova",
    "Supernova",
    "#803348",
    "#ffdc9e",
    1950,
    "broadcast",
    "stars",
    "nova",
  ),
  finish(
    "abyss",
    "Abyss Leviathan",
    "#172f49",
    "#39e6ea",
    1800,
    "broadcast",
    "scales",
    "abyss",
  ),
];
export const FINISH_TIERS = [
  { id: "all", name: "Barchasi" },
  { id: "static", name: "Rangli · 10" },
  { id: "animated", name: "Animatsiyali · 10" },
  { id: "broadcast", name: "Animatsiya + killchat · 10" },
];
export const skinKey = (weapon, skin) => weapon + ":" + skin;
export const ownsWeaponSkin = (profile, weapon, skin) =>
  skin === "standard" ||
  (profile.skinOwned || []).includes(skinKey(weapon, skin));
export const equippedSkin = (profile, weapon = profile.weapon) =>
  profile.weaponSkins?.[weapon] ||
  (profile.weapon === weapon ? profile.skin : null) ||
  "standard";
export const KNIVES = [
  { id: "combat", name: "Combat", price: 0 },
  { id: "karambit", name: "Karambit", price: 800 },
  { id: "butterfly", name: "Butterfly", price: 1100 },
  { id: "bayonet", name: "M9 Bayonet", price: 750 },
  { id: "kukri", name: "Kukri", price: 900 },
  { id: "talon", name: "Talon", price: 1000 },
];
export const OUTFITS = [
  {
    id: "vanguard",
    name: "Vanguard",
    color: "#788275",
    accent: "#b5c590",
    price: 0,
  },
  {
    id: "ghost",
    name: "Ghost Division",
    color: "#465061",
    accent: "#e0e6ef",
    price: 650,
  },
  {
    id: "desert-ops",
    name: "Desert Ops",
    color: "#b4a180",
    accent: "#dac57c",
    price: 500,
  },
  {
    id: "frost",
    name: "Arctic Sentinel",
    color: "#c4d6e4",
    accent: "#58c6ed",
    price: 1200,
  },
  {
    id: "recon",
    name: "Jungle Recon",
    color: "#4c7057",
    accent: "#a2c877",
    price: 700,
  },
  {
    id: "royal-guard",
    name: "Royal Guard",
    color: "#66577c",
    accent: "#eac663",
    price: 1500,
  },
  {
    id: "nightfall",
    name: "Nightfall",
    color: "#373e4a",
    accent: "#f36d67",
    price: 950,
  },
];
export const OPTICS = [
  { id: "none", name: "Optikasiz · temir nishon", zoom: 65 },
  { id: "red-dot", name: "Red Dot", zoom: 56 },
  { id: "holo", name: "Holografik", zoom: 51 },
  { id: "acog", name: "ACOG 4×", zoom: 33 },
  { id: "scope", name: "Optika 6×", zoom: 24 },
];
export const CROSSHAIRS = ["cross", "dot", "circle", "t", "none"];
export const COIN_PACKS = [
  { coins: 500, price: 15000 },
  { coins: 1500, price: 39000 },
  { coins: 4000, price: 89000 },
];
export const skinFor = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
export function catalogItem(kind, id) {
  return (
    kind === "weapon"
      ? PRIMARY_WEAPONS
      : kind === "skin"
        ? SKINS
        : kind === "outfit"
          ? OUTFITS
          : kind === "knife"
            ? KNIVES
            : []
  ).find((v) => v.id === id);
}
