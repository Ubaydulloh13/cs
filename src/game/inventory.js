import { PRIMARY_WEAPONS, SKINS, skinKey, ownsWeaponSkin } from "./catalog.js";

// Legacy global finishes stay with the primary on which they were bought/used.
// The migration is deterministic and never changes the player's coin balance.
export function normalizeInventory(source, admin = false) {
  const p = { ...source };
  const weapon = PRIMARY_WEAPONS.some((w) => w.id === p.weapon)
    ? p.weapon
    : "ak";
  const known = new Set(SKINS.map((s) => s.id));
  p.skinOwned = Array.isArray(p.skinOwned)
    ? [...new Set(p.skinOwned)]
    : (p.owned || ["standard"])
        .filter((s) => known.has(s) && s !== "standard")
        .map((s) => skinKey(weapon, s));
  p.knifeSkinOwned = Array.isArray(p.knifeSkinOwned)
    ? [...new Set(p.knifeSkinOwned)]
    : [
        ...new Set([
          "standard",
          known.has(p.knifeSkin) ? p.knifeSkin : "standard",
        ]),
      ];
  p.weaponSkins =
    p.weaponSkins &&
    typeof p.weaponSkins === "object" &&
    !Array.isArray(p.weaponSkins)
      ? { ...p.weaponSkins }
      : { [weapon]: p.skin || "standard" };
  if (admin) {
    p.skinOwned = PRIMARY_WEAPONS.flatMap((w) =>
      SKINS.filter((s) => s.price > 0).map((s) => skinKey(w.id, s.id)),
    );
    p.knifeSkinOwned = SKINS.map((s) => s.id);
  }
  for (const w of PRIMARY_WEAPONS) {
    const selected = p.weaponSkins[w.id] || "standard";
    p.weaponSkins[w.id] =
      known.has(selected) && ownsWeaponSkin(p, w.id, selected)
        ? selected
        : "standard";
  }
  p.weapon = weapon;
  p.skin = p.weaponSkins[weapon];
  p.knifeSkin = p.knifeSkinOwned.includes(p.knifeSkin)
    ? p.knifeSkin
    : "standard";
  return p;
}
