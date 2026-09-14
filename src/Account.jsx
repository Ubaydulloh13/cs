/* oxlint-disable react/only-export-components -- Authentication context and client API intentionally share one module. */
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Crosshair,
  ArrowUpRight,
  LoaderCircle,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
const Context = createContext(null);
export async function api(path, body) {
  const response = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Account serveri javob bermadi. npm run dev orqali ishga tushiring.",
    );
  }
  if (!response.ok) throw new Error(data.error || "So‘rov bajarilmadi.");
  return data;
}
const editable = [
  "name",
  "weapon",
  "skin",
  "knife",
  "knifeSkin",
  "outfit",
  "sensitivity",
  "volume",
  "quality",
  "optic",
  "crosshair",
  "crosshairColor",
];
export const useAccount = () => useContext(Context);
export function AccountProvider({ children }) {
  const [profile, setState] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    ref = useRef(null),
    queue = useRef(Promise.resolve()),
    pending = useRef({}),
    timer = useRef(null);
  const accept = useCallback((p) => {
    ref.current = p;
    setState(p);
  }, []);
  const enqueue = useCallback((fn) => {
    const next = queue.current.catch(() => {}).then(fn);
    queue.current = next;
    return next;
  }, []);
  const refresh = useCallback(async () => {
    const d = await api("session");
    accept(d.profile);
    return d.profile;
  }, [accept]);
  useEffect(() => {
    Promise.resolve()
      .then(refresh)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    return () => clearTimeout(timer.current);
  }, [refresh]);
  const mutate = useCallback(
    (path, data) =>
      enqueue(async () => {
        try {
          const d = await api(path, data);
          if ("profile" in d)
            accept(d.profile ? { ...d.profile, ...pending.current } : null);
          setError("");
          return d;
        } catch (e) {
          setError(e.message);
          throw e;
        }
      }),
    [accept, enqueue],
  );
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return queue.current;
    return mutate("profile", patch);
  }, [mutate]);
  const update = useCallback(
    async (patch) => {
      await flush();
      return mutate("profile", patch);
    },
    [flush, mutate],
  );
  const setProfile = useCallback(
    (value) => {
      const next = typeof value === "function" ? value(ref.current) : value;
      const patch = {};
      for (const key of editable)
        if (next[key] !== ref.current[key]) patch[key] = next[key];
      pending.current = { ...pending.current, ...patch };
      accept({ ...ref.current, ...patch });
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => flush().catch(() => refresh().catch(() => {})),
        350,
      );
    },
    [accept, flush, refresh],
  );
  const login = async (mode, data) => {
    const d = await api(mode, data);
    accept(d.profile);
    setError("");
  };
  const logout = useCallback(async () => {
    await flush();
    await mutate("logout", {});
  }, [flush, mutate]);
  if (loading)
    return (
      <div className="account-loading">
        <LoaderCircle className="spin" />
        <p>STRIKEZONE yuklanmoqda…</p>
      </div>
    );
  return (
    <Context.Provider
      value={{
        profile,
        setProfile,
        mutate,
        update,
        logout,
        refresh,
        flush,
        error,
      }}
    >
      {profile ? children : <AuthScreen login={login} initialError={error} />}
    </Context.Provider>
  );
}
function AuthScreen({ login, initialError }) {
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError),
    [visible, setVisible] = useState(false);
  return (
    <main className="auth-screen">
      <section className="auth-art">
        <a className="brand" href="/">
          ϟ STRIKE<span>ZONE</span>
        </a>
        <div>
          <span className="eyebrow">EVOLUTION // SEASON 02</span>
          <h1>
            O‘z uslubingiz.
            <br />
            O‘z jamoangiz.
            <br />
            <em>Sizning maydon.</em>
          </h1>
          <p>24 asosiy qurol. 6 arena. Siz tanlagan operator.</p>
          <div className="auth-tags">
            <span>1v1 — 6v6</span>
            <span>DO‘STLAR BILAN</span>
            <span>BOTLAR</span>
          </div>
        </div>
        <small>STRIKEZONE · TACTICAL MULTIPLAYER</small>
      </section>
      <section className="auth-panel">
        <Crosshair size={36} />
        <span className="eyebrow">JANG SHU YERDAN BOSHLANADI</span>
        <h2>
          {mode === "login" ? "Qaytganingiz bilan." : "Safga qo‘shiling."}
        </h2>
        <p>Operatoringiz, kiyimlaringiz va arsenalingiz bitta accountda.</p>
        <div className="shop-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Kirish
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Account ochish
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const data = new FormData(e.currentTarget);
            try {
              await login(mode, {
                username: data.get("username"),
                password: data.get("password"),
              });
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="username">LOGIN</label>
          <input
            id="username"
            name="username"
            placeholder="operator_nomi"
            pattern="[a-zA-Z0-9_]{3,20}"
            minLength={3}
            maxLength={20}
            required
            autoComplete="username"
          />
          <label htmlFor="password">PAROL</label>
          <div className="password-input">
            <input
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              minLength={10}
              maxLength={128}
              placeholder="Kamida 10 belgi"
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            <button
              type="button"
              aria-label="Parolni ko‘rsatish"
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary full" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <ArrowUpRight size={18} />
            )}{" "}
            {mode === "login" ? "ACCOUNTGA KIRISH" : "ACCOUNT OCHISH"}
          </button>
        </form>
        <div className="auth-note">
          <Shield size={18} />
          <span>Yangi accountga 1 000 tanga va 4 ta boshlang‘ich qurol.</span>
        </div>
      </section>
    </main>
  );
}
