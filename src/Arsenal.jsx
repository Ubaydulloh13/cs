import { useState } from "react";
import { Check, Lock, Coins, Search, Crosshair, Sparkles } from "lucide-react";
import { useAccount } from "./Account.jsx";
import GunPreview from "./GunPreview.jsx";
import {
  PRIMARY_WEAPONS,
  SKINS,
  OPTICS,
  FINISH_TIERS,
  skinFor,
  ownsWeaponSkin,
  equippedSkin,
} from "./game/catalog.js";
import "./skin-collection.css";
export default function Arsenal({ onNotice }) {
  const { profile, mutate, update } = useAccount(),
    [weapon, setWeapon] = useState(profile.weapon),
    [skin, setSkin] = useState(equippedSkin(profile)),
    [tier, setTier] = useState("all"),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  const w = PRIMARY_WEAPONS.find((w) => w.id === weapon) || PRIMARY_WEAPONS[0],
    s = skinFor(skin),
    cost =
      (profile.weaponOwned.includes(w.id) ? 0 : w.price) +
      (ownsWeaponSkin(profile, w.id, s.id) ? 0 : s.price);
  const equip = async () => {
    setBusy(true);
    try {
      if (!profile.weaponOwned.includes(w.id))
        await mutate("purchase", { kind: "weapon", id: w.id });
      if (!ownsWeaponSkin(profile, w.id, s.id))
        await mutate("purchase", { kind: "skin", id: s.id, weapon: w.id });
      await update({ weapon: w.id, skin: s.id });
      onNotice(w.name + " — jangga tayyor.");
    } catch (e) {
      onNotice(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="lobby subpage evolution-arsenal">
      <div className="page-heading">
        <div>
          <div className="eyebrow">LOADOUT // SIZNING IMZOINGIZ</div>
          <h1>
            Arsenal<span>.</span>
          </h1>
        </div>
        <span className="build-badge">24 ASOSIY QUROL</span>
      </div>
      <div className="armory-layout">
        <aside className="weapon-list">
          <label className="weapon-search">
            <Search size={17} />
            <input
              aria-label="Qurol izlash"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Qurol izlash…"
            />
          </label>
          {PRIMARY_WEAPONS.filter((w) =>
            w.name.toLowerCase().includes(query.toLowerCase()),
          ).map((item, index) => (
            <button
              key={item.id}
              className={weapon === item.id ? "selected" : ""}
              onClick={() => {
                setWeapon(item.id);
                setSkin(equippedSkin(profile, item.id));
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <b>{item.name}</b>
                <small>{item.family.toUpperCase()}</small>
              </div>
              {profile.weapon === item.id ? (
                <Check size={16} />
              ) : !profile.weaponOwned.includes(item.id) ? (
                <Lock size={14} />
              ) : null}
            </button>
          ))}
        </aside>
        <section className="armory-main">
          <div className="weapon-stage" style={{ "--skin": s.accent }}>
            <div className="stage-heading">
              <div>
                <span className="eyebrow">{s.rarity}</span>
                <h2>
                  {w.name} <em>{s.name}</em>
                </h2>
              </div>
              {s.broadcast && <Sparkles size={22} />}
            </div>
            <GunPreview weapon={w.id} skin={s.id} optic={profile.optic} />
            <div className="weapon-metrics">
              <div>
                <small>ZARBA</small>
                <b>{w.damage}</b>
              </div>
              <div>
                <small>MAGAZIN</small>
                <b>{w.magazine}</b>
              </div>
              <div>
                <small>NISHON</small>
                <b>ANIQ</b>
              </div>
              <div>
                <small>OTISH / S</small>
                <b>{(1 / w.rate).toFixed(1)}</b>
              </div>
            </div>
          </div>
          <div className="loadout-bar">
            <p>
              <kbd>1</kbd> {w.name} <kbd>2</kbd> P226 <kbd>3</kbd> Pichoq
            </p>
            <button
              className="primary"
              disabled={busy || cost > profile.coins}
              onClick={equip}
            >
              {cost ? (
                <>
                  <Coins size={16} />
                  {cost} · OLISH VA TANLASH
                </>
              ) : (
                <>
                  <Check size={17} />
                  TANLASH
                </>
              )}
            </button>
          </div>
          {cost > profile.coins && (
            <p className="muted">
              Tangalar yetarli emas. Janglarda tanga ishlang.
            </p>
          )}
          <div className="optic-picker">
            <label htmlFor="optic">OPTIK NISHON</label>
            <select
              id="optic"
              value={profile.optic}
              onChange={(e) =>
                update({ optic: e.target.value }).catch((e) =>
                  onNotice(e.message),
                )
              }
            >
              {OPTICS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <Crosshair size={20} />
          </div>
          <div className="section-title">
            <h3>{w.name} SKINLARI</h3>
            <span>30 SKIN + FIELD ISSUE</span>
          </div>
          <p className="finish-explainer">
            Xarid qilingan skin faqat <b>{w.name}</b> uchun saqlanadi. Boshqa
            qurollar o‘z skinini saqlaydi.
          </p>
          <div className="finish-tabs">
            {FINISH_TIERS.map((t) => (
              <button
                key={t.id}
                className={tier === t.id ? "active" : ""}
                onClick={() => setTier(t.id)}
              >
                {t.name.replace("?", "·")}
              </button>
            ))}
          </div>
          <div className="skin-swatch-grid">
            {SKINS.filter((item) => tier === "all" || item.tier === tier).map(
              (item) => (
                <button
                  key={item.id}
                  style={{ "--skin": item.color, "--accent": item.accent }}
                  className={
                    "skin-swatch " +
                    (skin === item.id ? "selected " : "") +
                    (item.evolution || "") +
                    (item.animated ? " finish-animated" : "")
                  }
                  onClick={() => setSkin(item.id)}
                >
                  <div className="skin-sample">
                    <i />
                    <i />
                    <i />
                  </div>
                  <b>{item.name}</b>
                  <small>
                    {item.rarity}
                    {item.broadcast ? " · KILLFEED" : ""}
                  </small>
                  <span>
                    {ownsWeaponSkin(profile, w.id, item.id)
                      ? "SIZNIKI"
                      : item.price + " COIN"}
                  </span>
                </button>
              ),
            )}
          </div>
          {s.broadcast && (
            <div
              className={"broadcast-preview " + s.feedClass}
              style={{ "--feed-color": s.accent }}
            >
              <Sparkles size={18} />
              <b>{profile.name}</b>
              <span>{w.name}</span>
              <b>Raqib</b>
              <small>{s.name} · ELIMINATION BROADCAST</small>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
