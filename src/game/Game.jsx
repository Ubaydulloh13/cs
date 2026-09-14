import { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Shield,
  Volume2,
  VolumeX,
  X,
  Trophy,
  ArrowLeft,
  RotateCcw,
  MousePointer2,
  Wifi,
  Heart,
  Target,
} from "lucide-react";
import { Simulation } from "./simulation.js";
import { ArenaRenderer } from "./renderer.js";
import { GameAudio } from "./audio.js";
import { CONTROLS, MAPS, WEAPONS, skinFor } from "./config.js";
import "./game.css";

export default function Game({ config, profile, network, onExit, onComplete }) {
  const mount = useRef(null),
    control = useRef(null),
    complete = useRef(false),
    [hud, setHud] = useState(null),
    [paused, setPaused] = useState(true),
    [error, setError] = useState(""),
    [hit, setHit] = useState(false),
    [hurt, setHurt] = useState(false),
    [board, setBoard] = useState(false),
    [muted, setMuted] = useState(profile.volume === 0);
  const touch =
    typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches;
  useEffect(() => {
    const id = network ? network.id : "local";
    let view;
    try {
      view = new ArenaRenderer(mount.current, config, profile);
    } catch {
      queueMicrotask(() =>
        setError(
          "3D grafikani ochib bo‘lmadi. WebGL 2 qo‘llaydigan Chrome yoki Edge brauzerida apparat tezlashtirishini yoqing.",
        ),
      );
      return;
    }
    const audio = new GameAudio(profile.volume);
    const input = {
      mx: 0,
      mz: 0,
      yaw: 0,
      pitch: 0,
      fire: false,
      aim: false,
      jump: false,
      crouch: false,
      sprint: false,
      reload: false,
      grenadeSeq: 0,
      grenadeKind: "he",
      weapon: profile.weapon,
      slot: 1,
    };
    const keys = new Set();
    let sim = null,
      state = null,
      active = false,
      raf = 0,
      last = performance.now(),
      accum = 0,
      sendTime = 0,
      hudTime = 0,
      footTime = 0,
      frames = 0,
      fps = 60,
      fpsTime = 0,
      lastHealth = 100,
      wasDead = false,
      hitTimer,
      hurtTimer,
      disposed = false;
    if (!network || network.host) {
      sim = new Simulation(config);
      if (network) {
        for (const m of network.members)
          sim.addPlayer(m.id, m.name, m.team, false, m.weapon, m.skin, m);
      } else
        sim.addPlayer(
          id,
          profile.name,
          0,
          false,
          profile.weapon,
          profile.skin,
          profile,
        );
      sim.fillBots();
      state = sim.snapshot();
    }
    const self = state?.players.find((p) => p.id === id);
    if (self) input.yaw = self.yaw;
    let firstState = !state;
    const unsubscribe = network?.subscribe((data) => {
      if (data.type === "input" && sim) sim.setInput(data.id, data.input);
      if (data.type === "state" && !sim) {
        const history = [
          ...(state?.events || []),
          ...(data.state.events || []),
        ];
        state = {
          ...data.state,
          remote: true,
          events: [
            ...new Map(
              history
                .filter((e) => data.state.time - e.time < 6)
                .map((e) => [e.id, e]),
            ).values(),
          ].slice(-70),
        };
        if (firstState) {
          const me = state.players.find((p) => p.id === id);
          if (me) {
            input.yaw = me.yaw;
            input.weapon = me.weapon;
          }
          firstState = false;
        }
      }
      if (data.type === "leave" && sim) {
        const p = sim.players.find((p) => p.id === data.id);
        if (p) {
          p.bot = true;
          p.name = p.name + " [BOT]";
          delete sim.inputs[p.id];
        }
      }
      if (data.type === "error") {
        setError(data.message);
        active = false;
        document.exitPointerLock?.();
      }
    });
    function reset() {
      keys.clear();
      Object.assign(input, {
        mx: 0,
        mz: 0,
        fire: false,
        aim: false,
        jump: false,
        crouch: false,
        sprint: false,
        reload: false,
      });
    }
    function pause() {
      active = false;
      reset();
      setPaused(true);
    }
    const lock = () => {
      if (document.pointerLockElement === view.canvas) {
        audio.unlock();
        active = true;
        setPaused(false);
        view.canvas.focus();
      } else pause();
    };
    const lockError = () =>
      setError(
        "Sichqonchani ushlashga ruxsat berilmadi. O‘yinni alohida oynada ochib, yana urinib ko‘ring.",
      );
    const enter = () => {
      audio.unlock();
      setError("");
      if (touch) {
        active = true;
        setPaused(false);
      } else {
        try {
          const promise = view.canvas.requestPointerLock();
          promise?.catch(lockError);
        } catch {
          lockError();
        }
      }
    };
    function keydown(e) {
      if (e.code === "Tab") {
        e.preventDefault();
        setBoard(true);
        return;
      }
      if (!active) return;
      if (
        [
          "Space",
          "ControlLeft",
          "ControlRight",
          "KeyW",
          "KeyS",
          "KeyA",
          "KeyD",
        ].includes(e.code)
      )
        e.preventDefault();
      keys.add(e.code);
      if (/^Digit[1-3]$/.test(e.code)) input.slot = Number(e.code.slice(-1));
      if (!e.repeat && ["KeyG", "KeyH"].includes(e.code)) {
        input.grenadeKind = e.code === "KeyH" ? "flash" : "he";
        input.grenadeSeq++;
      }
    }
    function keyup(e) {
      keys.delete(e.code);
      if (e.code === "Tab") setBoard(false);
    }
    function mousemove(e) {
      if (!active || touch) return;
      input.yaw -= e.movementX * 0.0021 * profile.sensitivity;
      input.pitch = Math.max(
        -1.45,
        Math.min(
          1.45,
          input.pitch - e.movementY * 0.0021 * profile.sensitivity,
        ),
      );
    }
    function mousedown(e) {
      if (!active) return;
      if (e.button === 0) input.fire = true;
      if (e.button === 2) input.aim = true;
    }
    function mouseup(e) {
      if (e.button === 0) input.fire = false;
      if (e.button === 2) input.aim = false;
    }
    const context = (e) => e.preventDefault();
    const blur = () => {
      reset();
      if (!network) pause();
    };
    document.addEventListener("pointerlockchange", lock);
    document.addEventListener("pointerlockerror", lockError);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("mousemove", mousemove);
    view.canvas.addEventListener("mousedown", mousedown);
    window.addEventListener("mouseup", mouseup);
    view.canvas.addEventListener("contextmenu", context);
    window.addEventListener("blur", blur);
    control.current = {
      enter,
      pause: () => {
        document.exitPointerLock?.();
        pause();
      },
      input,
      audio,
      look: (dx, dy) => {
        input.yaw -= dx * 0.005 * profile.sensitivity;
        input.pitch = Math.max(
          -1.4,
          Math.min(1.4, input.pitch - dy * 0.005 * profile.sensitivity),
        );
      },
    };
    function event(e) {
      if (e.type === "shot") audio.shot(e.weapon, e.player === id);
      if (e.type === "slash" && e.player === id)
        audio.tone(180, 0.14, 0.17, "sawtooth", 60);
      if (e.type === "reload" && e.player === id) audio.reload();
      if (e.type === "throw" && e.player === id)
        audio.tone(160, 0.1, 0.12, "triangle", 80);
      if (e.type === "explosion")
        audio.tone(
          e.kind === "flash" ? 1100 : 70,
          e.kind === "flash" ? 0.12 : 0.38,
          0.17,
          "sawtooth",
          e.kind === "flash" ? 450 : 22,
        );
      if (e.type === "hit" && e.player === id) {
        audio.hit();
        setHit(true);
        clearTimeout(hitTimer);
        hitTimer = setTimeout(() => setHit(false), 130);
      }
    }
    let lastSentEvent = 0;
    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      frames++;
      fpsTime += dt;
      if (fpsTime >= 1) {
        fps = Math.round(frames / fpsTime);
        frames = 0;
        fpsTime = 0;
      }
      if (active && !touch) {
        input.mx = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
        input.mz = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
        input.jump = keys.has("Space");
        input.crouch =
          keys.has("KeyC") ||
          keys.has("ControlLeft") ||
          keys.has("ControlRight");
        input.sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
        input.reload = keys.has("KeyR");
      }
      if (sim) {
        sim.setInput(id, input);
        if (active || network) {
          accum += dt;
          let steps = 0;
          while (accum >= 1 / 60 && steps < 6) {
            sim.step(1 / 60);
            accum -= 1 / 60;
            steps++;
          }
          if (steps === 6) accum = 0;
        }
        state = sim.view();
      }
      sendTime += dt;
      if (network && sendTime > 0.05) {
        sendTime = 0;
        if (sim) {
          network.broadcast({
            type: "state",
            state: sim.snapshot(Math.max(0, lastSentEvent - 30)),
          });
          lastSentEvent = sim.serial;
        } else network.sendInput(input);
      }
      if (!state) return;
      const p = state.players.find((p) => p.id === id);
      if (!p) return;
      if (p.health < lastHealth && p.health > 0) {
        setHurt(true);
        clearTimeout(hurtTimer);
        hurtTimer = setTimeout(() => setHurt(false), 220);
      }
      lastHealth = p.health;
      if (p.health <= 0) wasDead = true;
      else if (wasDead) {
        wasDead = false;
        input.yaw = p.yaw;
        input.pitch = 0;
        input.fire = false;
      }
      footTime += dt;
      if (
        active &&
        p.health > 0 &&
        p.moving &&
        p.y < 0.02 &&
        footTime > (input.sprint ? 0.28 : 0.42)
      ) {
        audio.step();
        footTime = 0;
      }
      view.render(state, id, input, Math.min(dt, 0.05), event);
      hudTime += dt;
      if (hudTime > 0.1) {
        hudTime = 0;
        setHud({ ...state, me: { ...p }, fps, aim: input.aim });
      }
      if (state.over && !complete.current) {
        complete.current = true;
        active = false;
        reset();
        setPaused(false);
        document.exitPointerLock?.();
        const winner =
          state.score[0] === state.score[1]
            ? -1
            : state.score[0] > state.score[1]
              ? 0
              : 1;
        const result = {
          id: crypto.randomUUID(),
          map: config.map,
          size: config.size,
          kills: p.kills,
          deaths: p.deaths,
          win: winner === p.team,
          draw: winner === -1,
          score: state.score,
          coins: 30 + p.kills * 25 + (winner === p.team ? 150 : 0),
          accuracy: p.shots ? Math.round((p.hits / p.shots) * 100) : 0,
          date: new Date().toISOString(),
        };
        onComplete(result);
      }
    }
    raf = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(hitTimer);
      clearTimeout(hurtTimer);
      unsubscribe?.();
      document.removeEventListener("pointerlockchange", lock);
      document.removeEventListener("pointerlockerror", lockError);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("mousemove", mousemove);
      view.canvas.removeEventListener("mousedown", mousedown);
      window.removeEventListener("mouseup", mouseup);
      view.canvas.removeEventListener("contextmenu", context);
      window.removeEventListener("blur", blur);
      if (document.pointerLockElement === view.canvas)
        document.exitPointerLock();
      view.dispose();
      audio.dispose();
      control.current = null;
    };
  }, [config, network, profile, onComplete, touch]);
  const me = hud?.me,
    over = hud?.over;
  const press = (key, value) => {
    if (control.current) control.current.input[key] = value;
  };
  const touchPoint = useRef(null);
  const leave = () => {
    control.current?.pause();
    onExit();
  };
  return (
    <div className="game-screen">
      <div ref={mount} className="game-canvas" />
      {hud && (
        <div className="game-hud">
          <div className="hud-top">
            <div className="hud-map">
              <Crosshair size={17} />
              <div>
                {MAPS[config.map].name}
                <small>
                  {config.size}v{config.size} ·{" "}
                  {network ? "DO‘STLAR BILAN" : "BOTLAR BILAN"}
                </small>
              </div>
            </div>
            <div className="score-bar">
              <span className="blue">{hud.score[0]}</span>
              <div>
                <b>
                  {Math.floor(hud.remaining / 60)}:
                  {String(Math.floor(hud.remaining % 60)).padStart(2, "0")}
                </b>
                <small>MAQSAD: {hud.target}</small>
              </div>
              <span className="orange">{hud.score[1]}</span>
            </div>
            <button
              className="hud-menu"
              aria-label="Tanaffus"
              onClick={() => control.current?.pause()}
            >
              <X size={19} />
            </button>
          </div>
          <div className="kill-feed">
            {hud.events
              .filter((e) => e.type === "kill" && hud.time - e.time < 5)
              .slice(-4)
              .map((e) => (
                <div
                  key={e.id}
                  className={
                    skinFor(e.skin).broadcast
                      ? "elimination broadcast-" +
                        skinFor(e.skin).evolution +
                        (skinFor(e.skin).broadcastAnimated
                          ? " animated-broadcast"
                          : "")
                      : ""
                  }
                  style={{ "--feed-accent": skinFor(e.skin).accent }}
                >
                  <b className={e.team === 0 ? "blue" : "orange"}>{e.name}</b>
                  <span>
                    {e.head ? "◎" : "⌁"}{" "}
                    {e.weapon === "grenade"
                      ? "HE GRENADE"
                      : WEAPONS[e.weapon]?.name}
                  </span>
                  <b>{e.victimName}</b>
                  {skinFor(e.skin).broadcast && (
                    <small>{skinFor(e.skin).name} · ELIMINATION</small>
                  )}
                </div>
              ))}
          </div>
          <div
            className={
              "crosshair shape-" +
              profile.crosshair +
              (hit ? " hit" : "") +
              (hud.aim && me.weapon !== "knife" ? " aim hidden-reticle" : "")
            }
            style={{ "--reticle": profile.crosshairColor }}
          >
            <i />
            <i />
            <i />
            <i />
          </div>
          {hud.aim &&
            me.weapon !== "knife" &&
            (WEAPONS[me.weapon].family === "sniper" ||
            ["acog", "scope"].includes(profile.optic) ? (
              <div className="scope">
                <i />
                <b />
                <span className="scope-center" />
                <small>{profile.optic === "acog" ? "4×" : "6×"}</small>
              </div>
            ) : (
              <div className={"ads-optic " + profile.optic}>
                <div className="optic-housing">
                  <i />
                  <b />
                </div>
              </div>
            ))}
          {me.health > 0 && me.protect > hud.time && (
            <div className="spawn-protection">
              <Shield size={15} /> HIMOYA: {Math.ceil(me.protect - hud.time)} s
            </div>
          )}
          {me.health <= 0 && !over && (
            <div className="death-message">
              <h2>QAYTA JANGGA QAYTASIZ</h2>
              <span>{Math.max(1, Math.ceil(me.spawnAt - hud.time))}</span>
              <p>Qurolingiz qayta to‘ldirilmoqda</p>
            </div>
          )}
          <div className="hud-bottom">
            <div className="health">
              <Heart size={21} />
              <b>{me.health}</b>
              <span>HP</span>
              <div>
                <i style={{ width: me.health + "%" }} />
              </div>
            </div>
            <div className="hud-hints">
              {touch ? "" : "WASD — YURISH   ·   R — O‘QLASH   ·   TAB — HISOB"}
              <small>
                {network ? (
                  <>
                    <Wifi size={10} /> XONA {network.code}
                  </>
                ) : (
                  <>
                    <Target size={10} /> MASHQ REJIMI
                  </>
                )}
                <span>{hud.fps} FPS</span>
              </small>
            </div>
            <div className="ammo">
              <div className="grenade-inventory">
                <span>
                  <kbd>G</kbd> HE {me.grenadeAmmo?.he || 0}
                </span>
                <span>
                  <kbd>H</kbd> FLASH {me.grenadeAmmo?.flash || 0}
                </span>
              </div>
              <span>
                {WEAPONS[me.weapon].name}{" "}
                <b>{me.reloading > 0 ? "O‘QLANMOQDA…" : ""}</b>
              </span>
              <div>
                {me.weapon === "knife" ? "∞" : me.ammo}
                <small>/ {me.weapon === "knife" ? "MELEE" : me.reserve}</small>
              </div>
            </div>
          </div>
        </div>
      )}
      {hurt && <div className="damage-overlay" />}
      {hud && me?.health > 0 && me.flashUntil > hud.time && (
        <div
          className="flash-overlay"
          style={{ opacity: Math.min(0.98, (me.flashUntil - hud.time) / 1.1) }}
        >
          <span>FLASHBANG</span>
        </div>
      )}
      {touch && !paused && !over && !error && (
        <div className="touch-controls">
          <div
            className="touch-look"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              touchPoint.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!touchPoint.current) return;
              control.current?.look(
                e.clientX - touchPoint.current.x,
                e.clientY - touchPoint.current.y,
              );
              touchPoint.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={() => {
              touchPoint.current = null;
            }}
            onPointerCancel={() => {
              touchPoint.current = null;
            }}
          />
          <div className="touch-pad">
            {[
              ["↑", "mz", 1],
              ["←", "mx", -1],
              ["↓", "mz", -1],
              ["→", "mx", 1],
            ].map(([label, key, v]) => (
              <button
                key={label}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  press(key, v);
                }}
                onPointerUp={() => press(key, 0)}
                onPointerCancel={() => press(key, 0)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="touch-slots">
            {[1, 2, 3].map((slot) => (
              <button key={slot} onClick={() => press("slot", slot)}>
                {["Qurol", "Pistol", "Pichoq"][slot - 1]}
              </button>
            ))}
            <button
              onClick={() => {
                if (control.current) {
                  control.current.input.grenadeKind = "he";
                  control.current.input.grenadeSeq++;
                }
              }}
            >
              HE
            </button>
            <button
              onClick={() => {
                if (control.current) {
                  control.current.input.grenadeKind = "flash";
                  control.current.input.grenadeSeq++;
                }
              }}
            >
              FLASH
            </button>
          </div>
          <div className="touch-actions">
            {[
              ["OTISH", "fire"],
              ["SAKRASH", "jump"],
              ["O‘TIRISH", "crouch"],
              ["NISHON", "aim"],
              ["O‘QLASH", "reload"],
            ].map(([label, key]) => (
              <button
                key={key}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  press(key, true);
                }}
                onPointerUp={() => press(key, false)}
                onPointerCancel={() => press(key, false)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {(paused || error) && !over && (
        <div className="game-overlay">
          <div className="pause-card">
            <span className="modal-eyebrow">
              <Crosshair size={15} /> STRIKEZONE · {config.size}v{config.size}
            </span>
            <h1>
              {error
                ? "ALOQA / GRAFIKA"
                : hud
                  ? "JANGGA TAYYORMISIZ?"
                  : "ARENA YUKLANMOQDA"}
            </h1>
            <p>
              {error ||
                `${MAPS[config.map].name} · ${network ? "Do‘stlaringiz bilan jamoaviy jang" : "Botlar bilan jamoaviy jang"} · ${config.duration || 180} soniya`}
            </p>
            {!error && (
              <div className="control-grid">
                {CONTROLS.slice(0, 10).map(([key, desc]) => (
                  <div key={key}>
                    <kbd>{key}</kbd>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="pause-actions">
              <button
                className="primary"
                disabled={!hud}
                onClick={() => control.current?.enter()}
              >
                <MousePointer2 size={17} />
                {error ? "QAYTA URINISH" : "JANGGA KIRISH"}
              </button>
              <button className="secondary" onClick={leave}>
                <ArrowLeft size={16} />
                MENYUGA
              </button>
              <button
                className="secondary"
                aria-label="Ovozni o‘zgartirish"
                onClick={() => {
                  if (control.current)
                    control.current.audio.volume = muted
                      ? profile.volume || 0.45
                      : 0;
                  setMuted(!muted);
                }}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
            <small>
              {touch
                ? "Ekranning o‘ng tomonini surib qarang. Tugmalar orqali harakat qiling."
                : "Davom etish uchun bosing. ESC — kursorni bo‘shatish."}
              {network ? " Xona egasi oynani ochiq saqlasin." : ""}
            </small>
          </div>
        </div>
      )}
      {over && (
        <div className="game-overlay result-overlay">
          <div className="pause-card result-card">
            <Trophy className="result-trophy" size={44} />
            <div className="modal-eyebrow">JANG YAKUNLANDI</div>
            <h1>
              {hud.score[me.team] > hud.score[1 - me.team]
                ? "G‘ALABA!"
                : hud.score[0] === hud.score[1]
                  ? "DURANG"
                  : "YANA URINIB KO‘RING"}
            </h1>
            <div className="final-score">
              <span className="blue">{hud.score[0]}</span>
              <i>:</i>
              <span className="orange">{hud.score[1]}</span>
            </div>
            <div className="result-stats">
              <div>
                <b>{me.kills}</b>
                <span>YENGILGAN RAQIB</span>
              </div>
              <div>
                <b>{me.deaths}</b>
                <span>HALOK BO‘LISH</span>
              </div>
              <div>
                <b>
                  +
                  {30 +
                    me.kills * 25 +
                    (hud.score[me.team] > hud.score[1 - me.team] ? 150 : 0)}
                </b>
                <span>TANGA</span>
              </div>
            </div>
            <button className="primary" onClick={leave}>
              <RotateCcw size={17} />
              BOSH MENYUGA QAYTISH
            </button>
          </div>
        </div>
      )}
      {board && hud && (
        <div className="scoreboard-overlay">
          <div className="scoreboard">
            <h2>JANG NATIJALARI</h2>
            <div className="score-row score-label">
              <span>OPERATOR</span>
              <span>KILL</span>
              <span>DEATH</span>
            </div>
            {[...hud.players]
              .sort((a, b) => a.team - b.team || b.kills - a.kills)
              .map((p) => (
                <div
                  className={"score-row " + (p.id === me.id ? "you" : "")}
                  key={p.id}
                >
                  <span className={p.team === 0 ? "blue" : "orange"}>
                    {p.name} {p.bot && <small>BOT</small>}
                    {p.id === me.id && <small>SIZ</small>}
                  </span>
                  <b>{p.kills}</b>
                  <b>{p.deaths}</b>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
