import {
  Crosshair,
  Users,
  Shield,
  ArrowUpRight,
  ChevronRight,
  Zap,
  Wifi,
  Swords,
  Target,
} from "lucide-react";
import { MAPS } from "./game/config.js";
export default function Lobby({
  size,
  setSize,
  onStart,
  onFriends,
  onMap,
  map,
  mode,
  setMode,
}) {
  return (
    <main className="lobby">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SENING JAMOANG. SENING G‘ALABANG.</div>
          <h1>
            Jang maydoniga xush kelibsiz<span>.</span>
          </h1>
        </div>
        <span className="build-badge">
          <i />
          EARLY ACCESS<span>V 2.0</span>
        </span>
      </div>
      <section className="hero">
        <div className="hero-image" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="season-tag">
            <span />
            02-MAVSUM <b>//</b> EVOLUTION
          </div>
          <h2>
            HAR BIR O‘Q.
            <br />
            YANGI <em>IMKONIYAT.</em>
          </h2>
          <p>
            Jamoangni yig‘. Qurolingni tanla. Maydonni egalla.
            <br />
            Haqiqiy raqobat shu yerdan boshlanadi.
          </p>
          <div className="hero-actions">
            <button className="primary large" onClick={onStart}>
              <Crosshair size={19} />
              JANGNI BOSHLASH
              <ArrowUpRight size={20} />
            </button>
            <button className="secondary" onClick={onFriends}>
              <Users size={17} />
              DO‘STLAR BILAN
            </button>
          </div>
          <div className="hero-meta">
            <span>
              <Shield size={14} />
              Teng imkoniyatli jang
            </span>
            <span>
              <Zap size={14} />
              Tezkor qayta tug‘ilish
            </span>
            <span>
              <Wifi size={14} />
              Onlayn va botlar
            </span>
          </div>
        </div>
        <div className="hero-coordinate">
          41°18′ N &nbsp; 69°16′ E<br />
          <span>OPERATION: EVOLUTION</span>
        </div>
        <div className="hero-bottom">
          <span>
            <i />
            OPERATSIYA FAOL
          </span>
          <div>
            <b>01</b>
            <span className="slide-line" />
            <span>03</span>
          </div>
        </div>
      </section>
      <section className="mode-section">
        <div className="section-heading">
          <h2>
            <span />
            O‘Z REJIMINGNI TANLA
          </h2>
          <span>Har bir jang — yangi hikoya</span>
        </div>
        <div className="mode-grid">
          {[
            [
              "team",
              "ASOSIY REJIM",
              "Jamoaviy jang",
              "Bir jamoa. Bir maqsad. G‘alaba.",
              Users,
            ],
            [
              "duel",
              "MAHORATINGNI KO‘RSAT",
              "Yakkama-yakka",
              "Faqat sen va raqibing.",
              Swords,
            ],
            [
              "practice",
              "MASHQ MAYDONI",
              "Botlar bilan mashq",
              "Nishonni to‘g‘rila. Darajangni oshir.",
              Target,
            ],
          ].map(([id, label, title, desc, Icon], i) => (
            <button
              className={"mode-card " + id + (mode === id ? " selected" : "")}
              key={id}
              onClick={() => {
                setMode(id);
                if (i === 1) setSize(1);
              }}
            >
              <div className="mode-art">
                <Icon className="mode-watermark" />
                <span className="card-label">{label}</span>
                {i === 2 ? (
                  <span className="practice-title">
                    BOT<span>ZONE</span>
                  </span>
                ) : (
                  <span className="mode-count">
                    {i === 0 ? size : 1}
                    <i>v</i>
                    {i === 0 ? size : 1}
                  </span>
                )}
              </div>
              <div className="mode-info">
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
                <span className="round-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <div className="bottom-grid">
        <section className="match-panel">
          <div className="section-heading">
            <h2>
              <span />
              JANGNI SOZLASH
            </h2>
            <Crosshair size={17} />
          </div>
          <div className="match-config">
            <div>
              <label>JAMOA HAJMI</label>
              <div className="size-options">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    className={n === size ? "active" : ""}
                    onClick={() => {
                      setSize(n);
                      if (mode === "duel" && n !== 1) setMode("team");
                    }}
                  >
                    {n}
                    <span>v</span>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="map-select">
              <label>XARITA</label>
              <button onClick={onMap}>
                <span className="map-thumb" />
                <span>
                  {MAPS[map].name}
                  <small>{MAPS[map].subtitle}</small>
                </span>
                <ChevronRight size={17} />
              </button>
            </div>
            <button className="primary quick-start" onClick={onStart}>
              O‘YNASH
              <ChevronRight size={19} />
            </button>
          </div>
        </section>
        <section className="tip-panel">
          <span className="tip-icon">
            <Shield size={25} />
          </span>
          <div>
            <div className="eyebrow">MAHORAT G‘ALABA KELTIRADI</div>
            <h3>Skin o‘zgaradi. Kuch o‘zgarmaydi.</h3>
            <p>Janglarda tanga to‘pla va o‘z uslubingni yarat.</p>
          </div>
          <ArrowUpRight size={21} />
        </section>
      </div>
      <footer>
        <span>
          <i />
          BARCHA TIZIMLAR TAYYOR<b>•</b>BRAUZERDA O‘YNA
        </span>
        <span>
          STRIKEZONE © 2026<b>·</b>PLAY YOUR WAY.
        </span>
      </footer>
    </main>
  );
}
