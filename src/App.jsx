import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Crosshair,
  Users,
  Shield,
  ArrowUpRight,
  ChevronRight,
  Settings,
  Volume2,
  VolumeX,
  Bell,
  Coins,
  Plus,
  Gamepad2,
  Trophy,
  Swords,
  Box,
  CircleHelp,
  X,
  Check,
  Copy,
  Link,
  LoaderCircle,
  LogOut,
  Target,
  Clock,
} from "lucide-react";
import Lobby from "./Lobby.jsx";
import { AccountProvider, useAccount, api } from "./Account.jsx";
const Shop = lazy(() => import("./Shop.jsx"));
const Arsenal = lazy(() => import("./Arsenal.jsx"));
import "./evolution.css";
import { CONTROLS, MAPS, WEAPONS, SKINS, CROSSHAIRS } from "./game/config.js";
import "./App.css";
import "./panels.css";
const Game = lazy(() =>
  Promise.all([
    import("./game/Game.jsx"),
    import("./game/weapon-assets.js").then((m) => m.loadWeaponAssets()),
    import("./game/characters.js").then((m) => m.loadCharacters()),
  ]).then(([module]) => module),
);
const NAV = [
  ["play", "O‘YNASH", Gamepad2],
  ["arsenal", "ARSENAL", Box],
  ["friends", "DO‘STLAR", Users],
  ["stats", "NATIJALAR", Trophy],
  ["shop", "SHOP", Coins],
];
function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll(
          'button:not(:disabled),input,select,[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      before?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button aria-label="Yopish" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function AppShell() {
  const {
    profile,
    setProfile,
    mutate,
    flush,
    error: accountError,
  } = useAccount();
  const matchTicket = useRef(null);
  const [tab, setTab] = useState(() =>
      new URLSearchParams(location.search).has("room") ? "friends" : "play",
    ),
    [size, setSize] = useState(5),
    [map, setMap] = useState("dust"),
    [mode, setMode] = useState("team"),
    [difficulty, setDifficulty] = useState("normal"),
    [duration, setDuration] = useState(180),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState(null),
    [session, setSession] = useState(null),
    [room, setRoom] = useState(null),
    [connecting, setConnecting] = useState(false),
    [code, setCode] = useState(
      () => new URLSearchParams(location.search).get("room") || "",
    ),
    [networkError, setNetworkError] = useState("");
  const networkRef = useRef(null),
    profileRef = useRef(profile),
    roomUnsubscribe = useRef(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4200);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(
    () => () => {
      networkRef.current?.close();
      roomUnsubscribe.current?.();
    },
    [],
  );

  const closeModal = useCallback(() => setModal(null), []);
  const config = () => ({
    size,
    map,
    difficulty: mode === "practice" ? "easy" : difficulty,
    duration,
  });
  const startOffline = async () => {
    try {
      await flush();
      const ticket = await api("match/start", { duration });
      matchTicket.current = ticket.ticket;
      setModal(null);
      setSession({
        config: config(),
        profile: { ...profile },
        network: null,
        key: crypto.randomUUID(),
      });
    } catch (e) {
      setNotice(e.message);
    }
  };
  const completeMatch = useCallback(
    async (result) => {
      try {
        await mutate("match/complete", { ticket: matchTicket.current, result });
      } catch (e) {
        setNotice(e.message);
      }
    },
    [mutate],
  );
  const closeRoom = () => {
    networkRef.current?.close();
    networkRef.current = null;
    roomUnsubscribe.current?.();
    roomUnsubscribe.current = null;
    setRoom(null);
    setConnecting(false);
  };
  const exitGame = () => {
    if (session?.network) closeRoom();
    setSession(null);
    setTab("play");
  };
  const openRoom = async (join = false) => {
    if (join && !/^[A-Z2-9]{6}$/.test(code.toUpperCase().trim())) {
      setNetworkError("6 belgili xona kodini kiriting.");
      return;
    }
    closeRoom();
    setNetworkError("");
    setConnecting(true);
    try {
      await flush();
      const { RoomNetwork } = await import("./game/network.js");
      const net = new RoomNetwork(
        (info) => {
          setRoom(info);
          setConnecting(false);
        },
        (msg) => {
          setNetworkError(msg);
          setConnecting(false);
          setRoom(null);
        },
      );
      networkRef.current = net;
      roomUnsubscribe.current = net.subscribe(async (data) => {
        if (data.type === "start") {
          try {
            const result = await api("match/start", {
              duration: data.config.duration,
            });
            matchTicket.current = result.ticket;
          } catch (e) {
            setNotice(e.message);
            return;
          }
          setSession({
            config: data.config,
            profile: { ...profileRef.current },
            network: net,
            key: crypto.randomUUID(),
          });
        }
      });
      net.open(profile, join ? code.toUpperCase().trim() : null, config());
    } catch {
      setConnecting(false);
      setNetworkError("Xona xizmatini yuklab bo‘lmadi. Qayta urinib ko‘ring.");
    }
  };
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Nusxalandi. Do‘stingizga yuborishingiz mumkin.");
    } catch {
      setNotice("Nusxalashga ruxsat yo‘q. Xona kodini belgilab nusxalang.");
    }
  };
  const goto = (t) => {
    setTab(t);
    setModal(null);
  };
  const pageHeading = (eyebrow, title, aside) => (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          {title}
          <span>.</span>
        </h1>
      </div>
      {aside}
    </div>
  );
  return (
    <div className="app-shell">
      {accountError && (
        <div className="account-error" role="alert">
          {accountError}
        </div>
      )}
      <header className="topbar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            goto("play");
          }}
        >
          <span className="brand-mark">ϟ</span>STRIKE<span>ZONE</span>
          <sup>BETA</sup>
        </a>
        <nav>
          {NAV.map(([id, name, Icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => goto(id)}
            >
              <Icon size={16} />
              {name}
            </button>
          ))}
        </nav>
        <div className="account">
          <button
            className="coins"
            onClick={() => {
              goto("arsenal");
              setNotice(
                "Har bir yengilgan raqib uchun 25, g‘alaba uchun 150 tanga.",
              );
            }}
            aria-label="Tangalar va arsenal"
          >
            <Coins size={17} />
            {profile.coins.toLocaleString("en-US").replace(/,/g, " ")}
            <Plus size={13} />
          </button>
          <span className="header-divider" />
          <button
            className="notification"
            onClick={() => setModal("news")}
            aria-label="Yangiliklar"
          >
            <Bell size={19} />
            <i />
          </button>
          <button
            className="avatar"
            onClick={() => goto("shop")}
            aria-label="Profil sozlamalari"
          >
            {profile.name[0]?.toUpperCase() || "S"}
          </button>
          <div className="player-name">
            {profile.name}
            <small>
              <i />
              JANGGA TAYYOR
            </small>
          </div>
        </div>
      </header>
      <aside className="rail">
        <div>
          {[Crosshair, Swords, Users, Trophy].map((Icon, i) => (
            <button
              key={i}
              className={tab === NAV[i][0] ? "selected" : ""}
              onClick={() => goto(NAV[i][0])}
              aria-label={NAV[i][1]}
              title={NAV[i][1]}
            >
              <Icon size={21} />
            </button>
          ))}
        </div>
        <div>
          <button
            aria-label="Ovozni yoqish yoki o‘chirish"
            title="Ovoz"
            onClick={() => {
              setProfile((p) => ({ ...p, volume: p.volume ? 0 : 0.45 }));
              setNotice(profile.volume ? "Ovoz o‘chirildi." : "Ovoz yoqildi.");
            }}
          >
            {profile.volume ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            aria-label="Boshqaruv tugmalari"
            title="Boshqaruv"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={19} />
          </button>
          <button
            aria-label="Sozlamalar"
            title="Sozlamalar"
            onClick={() => setModal("settings")}
          >
            <Settings size={19} />
          </button>
        </div>
      </aside>
      {tab === "play" && (
        <Lobby
          {...{ size, setSize, map, mode, setMode }}
          onStart={() => setModal("match")}
          onFriends={() => goto("friends")}
          onMap={() => setModal("maps")}
        />
      )}
      {tab === "arsenal" && (
        <Suspense
          fallback={<main className="lobby">Arsenal yuklanmoqda?</main>}
        >
          <Arsenal onNotice={setNotice} />
        </Suspense>
      )}
      {tab === "shop" && (
        <Suspense fallback={<main className="lobby">Shop yuklanmoqda?</main>}>
          <Shop onNotice={setNotice} />
        </Suspense>
      )}
      {tab === "friends" && (
        <main className="lobby subpage">
          {pageHeading(
            "YAXSHI JAMOA — KATTA USTUNLIK.",
            "Do‘stlar bilan o‘ynang",
            <span className="build-badge">
              <Users size={14} />
              1v1 — 6v6
            </span>,
          )}
          <section className="friends-banner">
            <Users size={42} />
            <div>
              <div className="eyebrow">BIRGA JANGGA KIRING</div>
              <h2>Xona oching. Kodni ulashing.</h2>
              <p>Do‘stlaringiz qo‘shilsin, bo‘sh joylarni botlar to‘ldirsin.</p>
            </div>
          </section>
          {networkError && (
            <div className="inline-error" role="alert">
              {networkError}
            </div>
          )}
          {room ? (
            <section className="room-panel">
              <div className="room-heading">
                <div>
                  <span className="eyebrow">XONA KODI</span>
                  <div className="room-code">
                    {room.code}
                    <button
                      aria-label="Kodni nusxalash"
                      onClick={() => copy(room.code)}
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>
                <button
                  className="secondary"
                  onClick={() =>
                    copy(
                      location.origin +
                        location.pathname +
                        "?room=" +
                        room.code,
                    )
                  }
                >
                  <Link size={15} />
                  TAKLIF HAVOLASI
                </button>
              </div>
              <p className="room-details">
                {room.config.size}v{room.config.size} ·{" "}
                {MAPS[room.config.map].name} · {room.config.duration / 60}{" "}
                daqiqa
              </p>
              <div className="teams">
                {[0, 1].map((team) => (
                  <div key={team}>
                    <h3 className={team === 0 ? "blue" : "orange"}>
                      {team === 0 ? "ALPHA" : "BRAVO"} JAMOASI
                    </h3>
                    {Array.from({ length: room.config.size }, (_, i) => {
                      const m = room.members.filter((m) => m.team === team)[i];
                      return (
                        <div className="room-member" key={i}>
                          <div className="avatar">
                            {m ? m.name[0].toUpperCase() : "B"}
                          </div>
                          <span>
                            {m?.name || "Bot uchun bo‘sh joy"}
                            <small>
                              {m
                                ? m.id === room.myId
                                  ? "SIZ"
                                  : "ULANGAN"
                                : "JANG BOSHLANGANDA QO‘SHILADI"}
                            </small>
                          </span>
                          {m ? <Check size={15} /> : <Target size={15} />}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="room-actions">
                <button className="secondary" onClick={closeRoom}>
                  <LogOut size={16} />
                  XONADAN CHIQISH
                </button>
                {room.host ? (
                  <button
                    className="primary"
                    onClick={() => networkRef.current?.start()}
                  >
                    <Crosshair size={17} />
                    JANGNI BOSHLASH
                  </button>
                ) : (
                  <span className="waiting">
                    <LoaderCircle className="spin" size={16} />
                    Xona egasi boshlashini kuting…
                  </span>
                )}
              </div>
            </section>
          ) : (
            <div className="friends-grid">
              <section className="form-panel">
                <span className="panel-number">01</span>
                <h2>O‘z xonangizni oching</h2>
                <p>Rejimni tanlang va do‘stlaringizni taklif qiling.</p>
                <label>JAMOA HAJMI</label>
                <div className="size-options">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      className={n === size ? "active" : ""}
                      onClick={() => setSize(n)}
                    >
                      {n}
                      <span>v</span>
                      {n}
                    </button>
                  ))}
                </div>
                <label htmlFor="room-map">XARITA</label>
                <select
                  id="room-map"
                  value={map}
                  onChange={(e) => setMap(e.target.value)}
                >
                  {Object.entries(MAPS).map(([id, m]) => (
                    <option key={id} value={id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  className="primary"
                  disabled={connecting}
                  onClick={() => openRoom(false)}
                >
                  {connecting ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Plus size={17} />
                  )}
                  XONA OCHISH
                </button>
              </section>
              <section className="form-panel">
                <span className="panel-number">02</span>
                <h2>Do‘stingizga qo‘shiling</h2>
                <p>Do‘stingiz yuborgan 6 belgili kodni kiriting.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    openRoom(true);
                  }}
                >
                  <label htmlFor="room-code">TAKLIF KODI</label>
                  <input
                    id="room-code"
                    className="code-input"
                    value={code}
                    maxLength={6}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="ABC234"
                    onChange={(e) =>
                      setCode(
                        e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""),
                      )
                    }
                  />
                  <button
                    className="secondary"
                    disabled={connecting || code.length !== 6}
                    type="submit"
                  >
                    {connecting ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <ArrowUpRight size={17} />
                    )}
                    XONAGA KIRISH
                  </button>
                </form>
                <div className="connection-note">
                  <Shield size={19} />
                  <p>
                    Xona egasi o‘yin davomida oynani ochiq saqlasin. Yangi
                    o‘yinchilar jang boshlanishidan oldin kiradi.
                  </p>
                </div>
              </section>
            </div>
          )}
          <div className="friends-note">
            <CircleHelp size={18} />
            <p>
              Internet va WebRTC ulanishi kerak. Ayrim tarmoqlar
              to‘g‘ridan-to‘g‘ri ulanishni cheklaydi; bunday holatda boshqa
              Wi-Fi yoki mobil internetdan urinib ko‘ring. Xona egasi chiqqanda
              jang tugaydi.
            </p>
          </div>
        </main>
      )}
      {tab === "stats" && (
        <main className="lobby subpage">
          {pageHeading(
            "HAR BIR JANGDA BIR QADAM OLDINGA.",
            "Sizning natijalaringiz",
            <span className="build-badge">
              <Trophy size={13} />
              SHAXSIY STATISTIKA
            </span>,
          )}
          <div className="stat-cards">
            {[
              [Crosshair, "JANGLAR", profile.matches],
              [Trophy, "G‘ALABALAR", profile.wins],
              [Target, "YENGILGAN RAQIBLAR", profile.kills],
              [
                Shield,
                "K / D",
                profile.deaths
                  ? (profile.kills / profile.deaths).toFixed(2)
                  : profile.kills.toFixed(1),
              ],
            ].map(([Icon, label, v]) => (
              <div key={label}>
                <Icon size={24} />
                <span>{label}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <div className="section-heading skin-heading">
            <h2>
              <span />
              SO‘NGGI JANGLAR
            </h2>
            <span>SHU BRAUZERDA SAQLANGAN</span>
          </div>
          {profile.history.length ? (
            <div className="match-history">
              {profile.history.map((r) => (
                <div key={r.id} className="history-row">
                  <span className={"history-result " + (r.win ? "win" : "")}>
                    {r.win ? "G‘ALABA" : r.draw ? "DURANG" : "MAG‘LUBIYAT"}
                  </span>
                  <div>
                    <b>{MAPS[r.map]?.name || "Arena"}</b>
                    <small>
                      {r.size}v{r.size} ·{" "}
                      {new Date(r.date).toLocaleDateString("uz-UZ")}
                    </small>
                  </div>
                  <span className="history-score">
                    {r.score[0]} : {r.score[1]}
                  </span>
                  <span>
                    {r.kills} K / {r.deaths} D
                  </span>
                  <span className="reward">
                    <Coins size={14} />+{r.coins}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Trophy size={46} />
              <h2>Sizning hikoyangiz endi boshlanadi.</h2>
              <p>
                Birinchi jangni yakunlang. Natijalaringiz shu yerda ko‘rinadi.
              </p>
              <button
                className="primary"
                onClick={() => {
                  goto("play");
                  setModal("match");
                }}
              >
                BIRINCHI JANG
                <ArrowUpRight size={17} />
              </button>
            </div>
          )}
          <p className="local-note">
            Faqat yakunlangan janglar hisoblanadi. Har bir raqib +25 tanga,
            jangni yakunlash +30, g‘alaba +150.
          </p>
        </main>
      )}
      {modal && (
        <Modal
          title={
            {
              match: "JANGGA TAYYORGARLIK",
              maps: "XARITA TANLANG",
              settings: "SOZLAMALAR",
              help: "BOSHQARUV",
              news: "EVOLUTION · 02-MAVSUM",
            }[modal]
          }
          onClose={closeModal}
        >
          {modal === "match" && (
            <>
              <div className="match-modal-banner">
                <Crosshair size={29} />
                <div>
                  <h3>
                    {size}v{size} ·{" "}
                    {mode === "practice" ? "Mashq maydoni" : "Jamoaviy jang"}
                  </h3>
                  <p>
                    {MAPS[map].name} · {WEAPONS[profile.weapon].name} ·{" "}
                    {SKINS.find((s) => s.id === profile.skin)?.name}
                  </p>
                </div>
              </div>
              <div className="form-pair">
                <div>
                  <label htmlFor="difficulty">BOT QIYINLIGI</label>
                  <select
                    id="difficulty"
                    value={mode === "practice" ? "easy" : difficulty}
                    disabled={mode === "practice"}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="easy">Oson</option>
                    <option value="normal">O‘rtacha</option>
                    <option value="hard">Qiyin</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="duration">JANG DAVOMIYLIGI</label>
                  <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  >
                    <option value={120}>2 daqiqa</option>
                    <option value={180}>3 daqiqa</option>
                    <option value={300}>5 daqiqa</option>
                  </select>
                </div>
              </div>
              <div className="match-summary">
                <Shield size={18} />
                <p>
                  Siz bilan {size - 1} ittifoqchi bot, qarshingizda {size} raqib
                  bot. {Math.max(15, size * 8)} ochkoga birinchi yetgan jamoa
                  g‘olib.
                </p>
              </div>
              <button className="primary full" onClick={startOffline}>
                <Crosshair size={18} />
                ARENA’GA KIRISH
                <ArrowUpRight size={18} />
              </button>
              <p className="modal-note">
                WASD — yurish · Sichqoncha — otish · Space — sakrash · C —
                o‘tirish
              </p>
            </>
          )}
          {modal === "maps" && (
            <div className="map-options">
              {Object.entries(MAPS).map(([id, m]) => (
                <button
                  key={id}
                  className={map === id ? "selected" : ""}
                  onClick={() => {
                    setMap(id);
                    closeModal();
                  }}
                >
                  <div className={"map-plan " + id}>
                    {m.boxes
                      .filter((b) => b.w < 40 && b.d < 40)
                      .map((b, i) => (
                        <span
                          key={i}
                          style={{
                            left: (b.x - b.w / 2 + 25) * 2 + "%",
                            top: ((b.z - b.d / 2 + 23) * 100) / 46 + "%",
                            width: b.w * 2 + "%",
                            height: (b.d * 100) / 46 + "%",
                          }}
                        />
                      ))}
                  </div>
                  <div>
                    <h3>{m.name}</h3>
                    <p>{m.subtitle}</p>
                  </div>
                  {map === id ? (
                    <Check size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </button>
              ))}
            </div>
          )}
          {modal === "settings" && (
            <div className="settings-form">
              <label htmlFor="name">OPERATOR NOMI</label>
              <input
                id="name"
                value={profile.name}
                maxLength={18}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
                onBlur={() => {
                  if (!profile.name.trim())
                    setProfile((p) => ({ ...p, name: "Operator" }));
                }}
              />
              <label htmlFor="sensitivity">
                SICHQONCHA SEZGIRLIGI <b>{profile.sensitivity.toFixed(1)}×</b>
              </label>
              <input
                id="sensitivity"
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={profile.sensitivity}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    sensitivity: Number(e.target.value),
                  }))
                }
              />
              <label htmlFor="volume">
                OVOZ BALANDLIGI <b>{Math.round(profile.volume * 100)}%</b>
              </label>
              <input
                id="volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={profile.volume}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, volume: Number(e.target.value) }))
                }
              />
              <label>PRITSEL SHAKLI</label>
              <div className="crosshair-options">
                {CROSSHAIRS.map((shape, i) => (
                  <button
                    key={shape}
                    aria-label={["Xoch", "Nuqta", "Aylana", "T shakli"][i]}
                    className={profile.crosshair === shape ? "selected" : ""}
                    onClick={() =>
                      setProfile((p) => ({ ...p, crosshair: shape }))
                    }
                  >
                    {["+", "•", "⊙", "┬"][i]}
                  </button>
                ))}
              </div>
              <label>PRITSEL RANGI</label>
              <div className="crosshair-color">
                {["#ccff83", "#ffffff", "#49ddff", "#ff789d"].map((color) => (
                  <button
                    key={color}
                    aria-label={color}
                    className={
                      profile.crosshairColor === color ? "selected" : ""
                    }
                    style={{ background: color }}
                    onClick={() =>
                      setProfile((p) => ({ ...p, crosshairColor: color }))
                    }
                  />
                ))}
              </div>
              <div
                className="reticle-preview"
                style={{ color: profile.crosshairColor }}
              >
                {["+", "•", "⊙", "┬"][CROSSHAIRS.indexOf(profile.crosshair)]}
              </div>
              <label htmlFor="quality">GRAFIKA SIFATI</label>
              <select
                id="quality"
                value={profile.quality}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, quality: e.target.value }))
                }
              >
                <option value="high">
                  Yuqori — soyalar va silliq qirralar
                </option>
                <option value="low">Yengil — kuchsiz qurilmalar uchun</option>
              </select>
              <button
                className="primary full"
                onClick={() => {
                  closeModal();
                  setNotice("Sozlamalar saqlandi.");
                }}
              >
                <Check size={17} />
                TAYYOR
              </button>
              <p className="modal-note">
                Sozlamalar accountingizda avtomatik saqlanadi.
              </p>
            </div>
          )}
          {modal === "help" && (
            <>
              <div className="help-controls">
                {CONTROLS.map(([key, desc]) => (
                  <div key={key}>
                    <kbd>{key}</kbd>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
              <p className="modal-note">
                Telefonda ekrandagi tugmalardan foydalaning. O‘ng tomonni surib
                qarang. Ko‘k belgi — ittifoqchi. O‘q tegishi sariq nishon bilan
                belgilanadi.
              </p>
            </>
          )}
          {modal === "news" && (
            <div className="news-content">
              <span className="season-tag">02-MAVSUM // EVOLUTION</span>
              <h3>Maydon sizniki.</h3>
              <p>
                Oltita arena, 24 asosiy qurol, 30 skin, pichoqlar va 1v1 dan 6v6
                gacha janglar. Botlar bilan mashq qiling yoki do‘stlaringizni
                xonaga chaqiring.
              </p>
              <div>
                <Clock size={17} />
                <span>3 daqiqalik jang. Cheksiz yangi imkoniyat.</span>
              </div>
              <button
                className="primary full"
                onClick={() => setModal("match")}
              >
                BOSHLASH
                <ArrowUpRight size={17} />
              </button>
            </div>
          )}
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Yopish" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {session && (
        <GameBoundary onExit={exitGame}>
          <Suspense
            fallback={
              <div className="game-loading">
                <LoaderCircle className="spin" size={30} />
                <p>Jang maydoni yuklanmoqda…</p>
              </div>
            }
          >
            <Game
              key={session.key}
              config={session.config}
              profile={session.profile}
              network={session.network}
              onExit={exitGame}
              onComplete={completeMatch}
            />
          </Suspense>
        </GameBoundary>
      )}
    </div>
  );
}

class GameBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="game-loading">
        <p>
          3D modelni yuklab bo‘lmadi. Internetni tekshiring va sahifani
          yangilang.
        </p>
        <button className="primary" onClick={this.props.onExit}>
          MENYUGA QAYTISH
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <AccountProvider>
      <AppShell />
    </AccountProvider>
  );
}
