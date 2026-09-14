import { useState } from "react";
import {
  Coins,
  Shield,
  Check,
  ShoppingBag,
  LogOut,
  CreditCard,
  Gift,
} from "lucide-react";
import { useAccount } from "./Account.jsx";
import { OUTFITS, KNIVES, SKINS, COIN_PACKS } from "./game/catalog.js";
import CharacterPreview from "./CharacterPreview.jsx";
import GunPreview from "./GunPreview.jsx";
export default function Shop({ onNotice }) {
  const { profile, mutate, update, logout } = useAccount(),
    [tab, setTab] = useState("outfit"),
    [outfit, setOutfit] = useState(profile.outfit),
    [knife, setKnife] = useState(profile.knife),
    [skin, setSkin] = useState(profile.knifeSkin),
    [amount, setAmount] = useState(10000),
    [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onNotice(e.message);
    } finally {
      setBusy(false);
    }
  };
  const buy = async (kind, id) => {
    await mutate("purchase", { kind, id });
  };
  const o = OUTFITS.find((o) => o.id === outfit) || OUTFITS[0],
    k = KNIVES.find((k) => k.id === knife) || KNIVES[0],
    s = SKINS.find((s) => s.id === skin) || SKINS[0],
    cost =
      (profile.knifeOwned.includes(k.id) ? 0 : k.price) +
      ((profile.knifeSkinOwned || ["standard"]).includes(s.id) ? 0 : s.price);
  return (
    <main className="lobby subpage shop-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PERSONAJ // KOLLEKSIYA // ACCOUNT</div>
          <h1>
            Shop<span>.</span>
          </h1>
        </div>
        <div className="build-badge">
          <Coins size={16} />
          {profile.coins.toLocaleString()} COIN
        </div>
      </div>
      <div className="shop-tabs">
        {[
          ["outfit", "Operatorlar"],
          ["knife", "Pichoqlar"],
          ["coins", "Coin va donat"],
          ["account", "Account"],
          ...(profile.role === "admin" ? [["admin", "Operator paneli"]] : []),
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "outfit" && (
        <div className="shop-layout">
          <section className="character-stage">
            <div className="stage-heading">
              <div>
                <span className="eyebrow">SIZNING OPERATORINGIZ</span>
                <h2>{o.name}</h2>
              </div>
              <Shield size={22} />
            </div>
            <CharacterPreview
              outfit={outfit}
              weapon={profile.weapon}
              skin={profile.skin}
            />
            <button
              className="primary full"
              disabled={
                busy ||
                (!profile.outfitOwned.includes(o.id) && o.price > profile.coins)
              }
              onClick={() =>
                run(async () => {
                  if (!profile.outfitOwned.includes(o.id))
                    await buy("outfit", o.id);
                  await update({ outfit: o.id });
                  onNotice("Operator kiyimi tanlandi.");
                })
              }
            >
              {profile.outfit === o.id ? (
                <Check size={17} />
              ) : (
                <ShoppingBag size={17} />
              )}{" "}
              {profile.outfitOwned.includes(o.id)
                ? "KIYIMNI TANLASH"
                : o.price + " COIN · OLISH"}
            </button>
          </section>
          <section className="outfit-list">
            {OUTFITS.map((item) => (
              <button
                key={item.id}
                className={outfit === item.id ? "selected" : ""}
                onClick={() => setOutfit(item.id)}
                style={{ "--outfit": item.color, "--accent": item.accent }}
              >
                <span className="outfit-emblem">
                  <Shield size={32} />
                </span>
                <div>
                  <small>TAKTIK TO‘PLAM</small>
                  <h3>{item.name}</h3>
                  <p>
                    {profile.outfitOwned.includes(item.id)
                      ? "KOLLEKSIYANGIZDA"
                      : item.price + " COIN"}
                  </p>
                </div>
                {profile.outfit === item.id && <Check size={18} />}
              </button>
            ))}
          </section>
        </div>
      )}
      {tab === "knife" && (
        <div className="knife-shop">
          <div className="weapon-stage">
            <div className="stage-heading">
              <div>
                <span className="eyebrow">MELEE COLLECTION</span>
                <h2>
                  {k.name} <em>{s.name}</em>
                </h2>
              </div>
            </div>
            <GunPreview weapon="knife" knife={knife} skin={skin} />
          </div>
          <div className="knife-options">
            {KNIVES.map((item) => (
              <button
                key={item.id}
                className={knife === item.id ? "selected" : ""}
                onClick={() => setKnife(item.id)}
              >
                <b>{item.name}</b>
                <small>
                  {profile.knifeOwned.includes(item.id)
                    ? "SIZNIKI"
                    : item.price + " COIN"}
                </small>
              </button>
            ))}
          </div>
          <label htmlFor="knife-skin">PICHOQ SKINI</label>
          <select
            id="knife-skin"
            value={skin}
            onChange={(e) => setSkin(e.target.value)}
          >
            {SKINS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{" "}
                {(profile.knifeSkinOwned || ["standard"]).includes(s.id)
                  ? "· Sizniki"
                  : "· " + s.price + " coin"}
              </option>
            ))}
          </select>
          <button
            className="primary"
            disabled={busy || cost > profile.coins}
            onClick={() =>
              run(async () => {
                if (!profile.knifeOwned.includes(k.id))
                  await buy("knife", k.id);
                if (!(profile.knifeSkinOwned || ["standard"]).includes(s.id)) await buy("knifeSkin", s.id);
                await update({ knife: k.id, knifeSkin: s.id });
                onNotice("Pichoq va skini tanlandi.");
              })
            }
          >
            {cost ? cost + " COIN · OLISH" : "TANLASH"} <Check size={18} />
          </button>
        </div>
      )}
      {tab === "coins" && (
        <>
          <div className="payment-intro">
            <CreditCard size={28} />
            <div>
              <h2>Arsenalingizni boyiting.</h2>
              <p>
                Coin bilan qurol, kiyim va skin oling. Hozircha coinlar janglar
                orqali yig‘iladi.
              </p>
            </div>
          </div>
          <div className="coin-packs">
            {COIN_PACKS.map((p, i) => (
              <article key={p.coins}>
                <span className="eyebrow">
                  {["STARTER", "REINFORCEMENT", "ELITE"][i]}
                </span>
                <Coins size={48} />
                <h2>
                  {p.coins.toLocaleString()} <small>COIN</small>
                </h2>
                <p>Rejalashtirilgan narx: {p.price.toLocaleString()} so‘m</p>
                <button className="secondary full" disabled>
                  TO‘LOV HALI ULANMAGAN
                </button>
              </article>
            ))}
          </div>
          <div className="donation-card">
            <Gift size={32} />
            <div>
              <h3>Loyihani qo‘llab-quvvatlash</h3>
              <p>
                Donat va pulga xarid to‘lov provayderi ulangandan keyin
                ochiladi.
              </p>
            </div>
            <button className="secondary" disabled>
              DONAT · TEZ KUNDA
            </button>
          </div>
        </>
      )}
      {tab === "admin" && profile.role === "admin" && (
        <section className="admin-panel">
          <Shield size={36} />
          <span className="eyebrow">OPERATOR // ADMINISTRATOR</span>
          <h2>Tangalarni boshqarish</h2>
          <p>O‘z accountingizga kerakli miqdorda coin qo‘shing.</p>
          <label htmlFor="admin-amount">TANGA MIQDORI</label>
          <input
            id="admin-amount"
            type="number"
            min={1}
            max={1000000000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <div className="admin-presets">
            {[1000, 10000, 100000, 1000000].map((n) => (
              <button
                className="secondary"
                key={n}
                onClick={() => setAmount(n)}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
          <button
            className="primary full"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await mutate("admin/coins", { amount });
                onNotice("Tangalar accountingizga qo‘shildi.");
              })
            }
          >
            <Coins size={18} /> COIN QO‘SHISH
          </button>
        </section>
      )}
      {tab === "account" && (
        <section className="profile-panel">
          <Shield size={32} />
          <h2>{profile.name}</h2>
          <p>
            @{profile.username} ·{" "}
            {profile.role === "admin" ? "ADMINISTRATOR" : "OPERATOR"}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              run(async () => {
                await mutate("password", {
                  currentPassword: f.get("current"),
                  password: f.get("password"),
                });
                onNotice("Parol yangilandi. Qayta kiring.");
              });
            }}
          >
            <h3>Parolni yangilash</h3>
            <label htmlFor="current-password">HOZIRGI PAROL</label>
            <input
              id="current-password"
              name="current"
              type="password"
              autoComplete="current-password"
              required
            />
            <label htmlFor="new-password">YANGI PAROL</label>
            <input
              id="new-password"
              name="password"
              type="password"
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            <button className="primary full" disabled={busy}>
              PAROLNI YANGILASH
            </button>
          </form>
          <button
            className="secondary full"
            disabled={busy}
            onClick={() => run(logout)}
          >
            <LogOut size={17} /> ACCOUNTDAN CHIQISH
          </button>
        </section>
      )}
    </main>
  );
}
