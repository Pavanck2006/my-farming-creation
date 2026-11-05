import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, CheckCheck,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock, CloudSun, Droplets,
  Flower2, History, Home, Image, Leaf, LogOut, Menu, MessageCircle, Moon,
  Plus, Search, Settings, ShieldCheck, Sparkles, Sun, Trash2, TrendingUp,
  RefreshCw, Upload, User, Wheat, Wind, X
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { useApp } from "./context/AppContext";
import api, { errorMessage } from "./services/api";

export const getPhotoUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

const navigation = [
  { title: "Overview", path: "/app", icon: <Home size={17} /> },
  { title: "Crop planner", path: "/app/recommendations", icon: <Wheat size={17} /> },
  { title: "Compare & simulate", path: "/app/simulator", icon: <TrendingUp size={17} /> },
  { title: "Weather", path: "/app/weather", icon: <CloudSun size={17} /> },
  { title: "Market prices", path: "/app/market", icon: <ArrowUpRight size={17} /> },
  { title: "Crop calendar", path: "/app/calendar", icon: <CalendarDays size={17} /> },
  { title: "Crop protection", path: "/app/protection", icon: <ShieldCheck size={17} /> },
  { title: "AI assistant", path: "/app/assistant", icon: <Sparkles size={17} /> },
  { title: "Saved plans", path: "/app/plans", icon: <Leaf size={17} /> },
  { title: "Farming history", path: "/app/history", icon: <Clock size={17} /> }
];

const kannadaNavigation = [
  "ಅವಲೋಕನ",
  "ಬೆಳೆ ಯೋಜನೆ",
  "ಹೋಲಿಕೆ & ಸಿಮ್ಯುಲೇಶನ್",
  "ಹವಾಮಾನ",
  "ಮಾರುಕಟ್ಟೆ ಬೆಲೆ",
  "ಬೆಳೆ ಕ್ಯಾಲೆಂಡರ್",
  "ಬೆಳೆ ರಕ್ಷಣೆ",
  "AI ಸಹಾಯಕ",
  "ಉಳಿಸಿದ ಯೋಜನೆಗಳು",
  "ಕೃಷಿ ಇತಿಹಾಸ"
];

const soilOptions = ["red", "black", "alluvial", "laterite", "sandy", "clay", "loamy"];
const kannadaSoilNames = {
  red: "ಕೆಂಪು ಮಣ್ಣು (Red)",
  black: "ಕಪ್ಪು ಮಣ್ಣು (Black)",
  alluvial: "ಮೆಕ್ಕಲು ಮಣ್ಣು (Alluvial)",
  laterite: "ಲ್ಯಾಟರೈಟ್ ಮಣ್ಣು (Laterite)",
  sandy: "ಮರಳು ಮಣ್ಣು (Sandy)",
  clay: "ಜೇಡಿ ಮಣ್ಣು (Clay)",
  loamy: "ಗೋಡು ಮಣ್ಣು (Loamy)"
};

const suggestions = [
  "Which crops need less water?",
  "Why is ragi recommended for my soil?",
  "How should I plan for this season?",
  "What pest precautions should I take?"
];

const formatMoney = (value) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

function FarmerAvatar({ photoUrl, name, size = 32, className = "" }) {
  const [imgError, setImgError] = useState(false);
  const fullUrl = useMemo(() => getPhotoUrl(photoUrl), [photoUrl]);

  if (fullUrl && !imgError) {
    return (
      <img
        src={fullUrl}
        alt={name || "Farmer"}
        className={`farmer-avatar-img ${className}`}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
        onError={() => setImgError(true)}
      />
    );
  }

  const initial = name ? name.trim().charAt(0).toUpperCase() : "F";
  return (
    <div
      className={`farm-avatar-fallback ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontSize: Math.max(11, Math.round(size * 0.42)),
        fontWeight: 700
      }}
    >
      {initial}
    </div>
  );
}

function PageTitle({ eyebrow, title, detail, action }) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  );
}

function Notice({ children, kind = "info" }) {
  return <div className={`notice notice-${kind}`}>{children}</div>;
}

function Loading({ label = "Loading..." }) {
  return (
    <div className="loading">
      <span className="spinner" />
      {label}
    </div>
  );
}

function Stat({ icon: Icon, label, value, foot, tone = "green" }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={18} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}

function CropCard({ crop, onSave, onCompare, selected }) {
  const { language } = useApp();
  const [customYield, setCustomYield] = useState(crop.yieldPerAcre ?? 10);
  const [customPrice, setCustomPrice] = useState(crop.pricePerQuintal ?? crop.price ?? 3500);
  const [customCost, setCustomCost] = useState(crop.estimatedCostPerAcre ?? crop.costPerAcre ?? 15000);
  const [showCalc, setShowCalc] = useState(false);

  useEffect(() => {
    setCustomYield(crop.yieldPerAcre ?? 10);
    setCustomPrice(crop.pricePerQuintal ?? crop.price ?? 3500);
    setCustomCost(crop.estimatedCostPerAcre ?? crop.costPerAcre ?? 15000);
  }, [crop]);

  const y = Math.max(0, Number(customYield) || 0);
  const p = Math.max(0, Number(customPrice) || 0);
  const c = Math.max(0, Number(customCost) || 0);
  const grossRev = Math.round(y * p);
  const netProfit = Math.round(grossRev - c);

  const resetCalc = () => {
    setCustomYield(crop.yieldPerAcre ?? 10);
    setCustomPrice(crop.pricePerQuintal ?? crop.price ?? 3500);
    setCustomCost(crop.estimatedCostPerAcre ?? crop.costPerAcre ?? 15000);
  };

  return (
    <article className="crop-card">
      <div className="crop-card-top">
        <div className="crop-symbol"><Wheat size={24} /></div>
        <div className={`score ${crop.score >= 75 ? "score-high" : ""}`}>
          {crop.score}<small>% match</small>
        </div>
      </div>

      <div className="crop-name-row">
        <div>
          <h3>{crop.name}</h3>
          <span className="muted small">
            {crop.season ? (Array.isArray(crop.season) ? crop.season.join(", ") : crop.season) : "Kharif"} season · {crop.duration} days
          </span>
        </div>
      </div>

      <p className="crop-reason">{crop.reasons?.slice(0, 2).join(" · ") || crop.note}</p>

      <div className="crop-metrics">
        <span><Droplets size={16} /> <b>{crop.water}</b> water</span>
        <span><ShieldCheck size={16} /> <b>{crop.risk || "Low-medium"}</b> risk</span>
      </div>

      {/* Complete Financial Breakdown */}
      <div className="crop-finance-grid">
        <div className="finance-item">
          <span>Expected Yield</span>
          <strong>{y} <small>q / acre</small></strong>
        </div>
        <div className="finance-item">
          <span>Market Price</span>
          <strong>{formatMoney(p)} <small>/ q</small></strong>
        </div>
        <div className="finance-item">
          <span>Cultivation Cost</span>
          <strong>{formatMoney(c)} <small>/ acre</small></strong>
        </div>
        <div className="finance-item">
          <span>Gross Revenue</span>
          <strong className="revenue-val">{formatMoney(grossRev)} <small>/ acre</small></strong>
        </div>
        <div className="finance-item profit-item">
          <span>Estimated Net Profit</span>
          <strong className={netProfit >= 0 ? "profit-val" : "loss-val"}>
            {formatMoney(netProfit)} <small>/ acre</small>
          </strong>
        </div>
      </div>

      {/* Interactive Farmer Profit Calculator Toggle */}
      <div className="calc-toggle-row">
        <button
          type="button"
          className="button button-outline button-small calc-toggle-btn"
          onClick={() => setShowCalc(!showCalc)}
        >
          <TrendingUp size={15} /> {showCalc ? "Hide Profit Calculator" : "Calculate My Own Profit"}
        </button>
      </div>

      {showCalc && (
        <div className="farmer-calc-box">
          <div className="calc-header">
            <b>Custom Profit Estimate ({crop.name})</b>
            <button type="button" onClick={resetCalc} className="text-button">Reset Reference</button>
          </div>
          <div className="calc-inputs-grid">
            <label>
              <span>Expected Yield (q/acre)</span>
              <input
                type="number"
                min="1"
                max="200"
                step="0.5"
                value={customYield}
                onChange={(e) => setCustomYield(e.target.value)}
              />
            </label>
            <label>
              <span>Market Price (₹/q)</span>
              <input
                type="number"
                min="100"
                max="100000"
                step="50"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
            </label>
            <label>
              <span>Cultivation Cost (₹/acre)</span>
              <input
                type="number"
                min="0"
                max="500000"
                step="500"
                value={customCost}
                onChange={(e) => setCustomCost(e.target.value)}
              />
            </label>
          </div>
          <div className="calc-result-bar">
            <div>
              <small>Custom Gross Revenue</small>
              <b>{formatMoney(grossRev)}</b>
            </div>
            <div className="calc-profit-result">
              <small>Custom Net Profit</small>
              <b className={netProfit >= 0 ? "profit-val" : "loss-val"}>{formatMoney(netProfit)} / acre</b>
            </div>
          </div>
        </div>
      )}

      <div className="estimate-disclaimer">
        ⚠️ Estimated reference values. Yield and profit are never guaranteed.
      </div>

      <div className="crop-card-actions">
        <label className="compare-check">
          <input type="checkbox" checked={Boolean(selected)} onChange={() => onCompare?.(crop.name)} /> Compare
        </label>
        <button className="text-button" onClick={() => onSave?.(crop)}>
          Save plan <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}

function CropGrid({ crops: list, onSave, selected = [], onCompare }) {
  if (!list?.length) {
    return (
      <div className="empty-state">
        <Flower2 size={26} />
        <h3>No recommendations yet</h3>
        <p>Complete your farm profile to get a crop shortlist tailored to your soil.</p>
        <Link className="button button-outline" to="/app/profile">
          Complete farm profile <ArrowRight size={16} />
        </Link>
      </div>
    );
  }
  return (
    <div className="crop-grid">
      {list.map((crop) => (
        <CropCard
          key={crop.name}
          crop={crop}
          onSave={onSave}
          onCompare={onCompare}
          selected={selected.includes(crop.name)}
        />
      ))}
    </div>
  );
}

// ==========================================
// LANDING PAGE
// ==========================================
function Landing() {
  const { theme, setTheme, language, setLanguage } = useApp();
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link className="brand" to="/">
          <span className="brand-icon"><Leaf size={19} /></span>Namma Krishi
        </Link>
        <nav>
          <a href="#how">{language === "kn" ? "ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ" : "How it works"}</a>
          <a href="#features">{language === "kn" ? "ವೈಶಿಷ್ಟ್ಯಗಳು" : "For your farm"}</a>
        </nav>
        <div className="landing-actions">
          <button className="icon-button" aria-label="Toggle theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="kn">ಕನ್ನಡ</option>
          </select>
          <Link to="/login" className="button button-small button-primary">
            {language === "kn" ? "ರೈತರ ಲಾಗಿನ್" : "Farmer login"}
          </Link>
        </div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="kicker-dot" /> {language === "kn" ? "ನಿಮ್ಮ ಋತುವನ್ನು ಯೋಜಿಸಲು ಉತ್ತಮ ಮಾರ್ಗ" : "A smarter way to plan your season"}
          </div>
          <h1>
            {language === "kn" ? <>ಪ್ರತಿ ಎಕರೆಯನ್ನು<br /><em>ಬುದ್ಧಿವಂತಿಕೆಯಿಂದ</em> ನಿರ್ವಹಿಸಿ.</> : <>Make every acre<br />a <em>smarter</em> decision.</>}
          </h1>
          <p>
            {language === "kn"
              ? "ನಿಮ್ಮ ಮಣ್ಣು, ನೀರು ಮತ್ತು ಋತುವಿಗೆ ಸೂಕ್ತವಾದ ಬೆಳೆಗಳನ್ನು ಹೋಲಿಸಿ. ನಿಖರ ಮಾಹಿತಿಯೊಂದಿಗೆ ಉತ್ತಮ ನಿರ್ಧಾರಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಿ."
              : "Compare crop choices for your soil, water and season. See the trade-offs clearly, then make the call that feels right for your farm."}
          </p>
          <div className="hero-actions">
            <Link to="/login" className="button button-primary">
              {language === "kn" ? "ಈಗಲೇ ಪ್ರಾರಂಭಿಸಿ" : "Plan your next season"} <ArrowRight size={17} />
            </Link>
            <a className="hero-link" href="#how">
              {language === "kn" ? "ಹೆಚ್ಚು ತಿಳಿಯಿರಿ" : "See how it works"} <ChevronRight size={16} />
            </a>
          </div>
          <div className="hero-proof">
            <div className="proof-avatars">
              <span>ರೈ</span><span>🌱</span><span>ಅ</span>
            </div>
            <span>{language === "kn" ? "ಕರ್ನಾಟಕದ ರೈತರಿಗಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾಗಿದೆ" : "Built for Karnataka's farming community"}</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-sun" />
          <div className="hero-field field-back" />
          <div className="hero-field field-front" />
          <div className="hero-plant"><span /><span /><span /><span /><span /></div>
          <div className="visual-chip chip-top"><span className="chip-check"><Check size={13} /></span> Your farm, your call</div>
          <div className="visual-chip chip-bottom">
            <span className="weather-sun">☀</span>
            <div><b>Weather check</b><small>7-day forecast ready</small></div>
            <ArrowUpRight size={16} />
          </div>
          <div className="floating-leaf">✳</div>
        </div>
      </section>
      <section className="trust-strip">
        <span>BETTER DECISIONS START WITH</span>
        <div>
          <span><Leaf size={16} /> Your soil</span>
          <span><Droplets size={16} /> Your water</span>
          <span><CloudSun size={16} /> Your season</span>
          <span><TrendingUp size={16} /> Your market</span>
        </div>
      </section>
      <section id="how" className="feature-section">
        <div className="section-heading">
          <span className="eyebrow">A little more clarity</span>
          <h2>One season. Many possibilities.</h2>
          <p>Namma Krishi helps you explore them before you put a seed in the ground.</p>
        </div>
        <div id="features" className="feature-cards">
          <div className="feature-card">
            <span className="feature-no">01</span>
            <div className="feature-icon"><Flower2 /></div>
            <h3>Find your fit</h3>
            <p>See how soil, available water and season influence crop suitability—with a transparent score, not a mystery answer.</p>
          </div>
          <div className="feature-card">
            <span className="feature-no">02</span>
            <div className="feature-icon"><TrendingUp /></div>
            <h3>Compare the trade-offs</h3>
            <p>Change rainfall, market price and cost assumptions to explore how your plan responds to change.</p>
          </div>
          <div className="feature-card">
            <span className="feature-no">03</span>
            <div className="feature-icon"><CalendarDays /></div>
            <h3>Plan with confidence</h3>
            <p>Keep your shortlist, follow a simple crop calendar and check current weather before you make the call.</p>
          </div>
        </div>
      </section>
      <section className="landing-cta">
        <div>
          <span className="eyebrow">Your farm is one of a kind</span>
          <h2>Let's plan around what you have.</h2>
          <p>Start with your farm profile. No agronomy degree required.</p>
        </div>
        <Link to="/login" className="button button-primary">
          Get started <ArrowRight size={17} />
        </Link>
        <Leaf className="cta-decoration" size={140} />
      </section>
      <footer className="landing-footer">
        <Link className="brand" to="/"><span className="brand-icon"><Leaf size={17} /></span>Namma Krishi</Link>
        <span>Helpful estimates, not guarantees. Always seek local agricultural advice.</span>
        <span>Made for farmers, with care. <span className="heart">♥</span></span>
      </footer>
    </main>
  );
}

// ==========================================
// LOGIN PAGE (NO OTP - MOBILE NUMBER ONLY)
// ==========================================
function Login() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [notRegistered, setNotRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { login, language } = useApp();

  const handleLogin = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setNotRegistered(false);

    try {
      const { data } = await api.post("/auth/login", { phone });
      login(data.token, data.farmer);
      navigate("/app");
    } catch (error) {
      const err = errorMessage(error);
      setMessage(err);
      if (error.response?.data?.notRegistered || error.response?.status === 404) {
        setNotRegistered(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-logo-header">
        <Link to="/" className="auth-logo-link" title="Namma Krishi">
          <img
            src="/namma-krishi-logo.png"
            alt="Namma Krishi Logo"
            className="auth-logo-image"
            onError={(e) => {
              // Try fallback or hide cleanly
              if (!e.currentTarget.dataset.retried) {
                e.currentTarget.dataset.retried = "true";
                e.currentTarget.src = "/logo.png";
              } else {
                e.currentTarget.style.display = "none";
              }
            }}
          />
        </Link>
        <Link to="/" className="brand auth-brand">
          <span className="brand-icon"><Leaf size={19} /></span>Namma Krishi
        </Link>
      </div>
      <div className="auth-card">
        <div className="auth-emblem"><Leaf size={23} /></div>
        <span className="eyebrow">{language === "kn" ? "ನಮ್ಮ ಕೃಷಿಗೆ ಸ್ವಾಗತ" : "Welcome to Namma Krishi"}</span>
        <h1>{language === "kn" ? "ರೈತರ ಸೈನ್ ಇನ್" : "Farmer Sign In"}</h1>
        <p>
          {language === "kn"
            ? "ನಿಮ್ಮ ನೋಂದಾಯಿತ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ ನೇರವಾಗಿ ಲಾಗಿನ್ ಆಗಿ (OTP ರಹಿತ ಪ್ರೊಟೊಟೈಪ್)."
            : "Enter your registered mobile number to access your farm dashboard."}
        </p>

        <form onSubmit={handleLogin} className="form-stack">
          <label>
            {language === "kn" ? "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ" : "Registered Mobile Number"}
            <input
              required
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="9876543210 or +91 98765 43210"
              minLength={10}
              autoFocus
            />
          </label>
          <small className="muted">
            {language === "kn" ? "10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ." : "Enter your 10-digit mobile number."}
          </small>

          {message && (
            <Notice kind={notRegistered ? "warning" : "error"}>
              {message}
            </Notice>
          )}

          {notRegistered && (
            <Link
              to="/register"
              state={{ phone }}
              className="button button-primary button-full"
              style={{ marginTop: 8 }}
            >
              {language === "kn" ? "ಹೊಸ ಖಾತೆ ನೋಂದಾಯಿಸಿ" : "Register as a New Farmer"} <ArrowRight size={16} />
            </Link>
          )}

          {!notRegistered && (
            <button className="button button-primary button-full" disabled={busy}>
              {busy ? (language === "kn" ? "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…" : "Signing in…") : (language === "kn" ? "ಸೈನ್ ಇನ್ ಮಾಡಿ" : "Sign In to Farm")} <ArrowRight size={16} />
            </button>
          )}
        </form>

        <div className="auth-bottom-links" style={{ marginTop: 20, textAlign: "center", fontSize: 12 }}>
          <span className="muted">
            {language === "kn" ? "ಹೊಸ ರೈತರೇ? " : "New to Namma Krishi? "}
          </span>
          <Link to="/register" state={{ phone }} style={{ color: "var(--green)", fontWeight: 700 }}>
            {language === "kn" ? "ಇಲ್ಲಿ ನೋಂದಣಿ ಮಾಡಿ" : "Register here"}
          </Link>
        </div>

        <div className="auth-bottom">
          <ShieldCheck size={14} />
          {language === "kn" ? "ಹ್ಯಾಕಥಾನ್ ಪ್ರೊಟೊಟೈಪ್: ತ್ವರಿತ ಮೊಬೈಲ್ ಪ್ರವೇಶ." : "Prototype mode: Instant mobile access without OTP."}
        </div>
      </div>
      <Link to="/" className="back-home">
        <ChevronLeft size={15} /> {language === "kn" ? "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ" : "Back to Namma Krishi"}
      </Link>
    </main>
  );
}

// ==========================================
// REGISTRATION PAGE (FIRST-TIME USER)
// ==========================================
function Register() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { login, language } = useApp();
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [form, setForm] = useState({
    phone: state?.phone || "",
    name: "",
    districtId: "",
    talukId: "",
    village: ""
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/locations/districts")
      .then(({ data }) => setDistricts(data.districts))
      .catch((reason) => setError(errorMessage(reason)));
  }, []);

  useEffect(() => {
    if (!form.districtId) {
      setTaluks([]);
      return;
    }
    api.get(`/locations/districts/${form.districtId}/taluks`)
      .then(({ data }) => setTaluks(data.taluks))
      .catch((reason) => setError(errorMessage(reason)));
  }, [form.districtId]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const { data } = await api.post("/auth/register", form);
      login(data.token, data.farmer);
      navigate("/app");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-logo-header">
        <Link to="/" className="auth-logo-link" title="Namma Krishi">
          <img
            src="/namma-krishi-logo.png"
            alt="Namma Krishi Logo"
            className="auth-logo-image"
            onError={(e) => {
              // Try fallback or hide cleanly
              if (!e.currentTarget.dataset.retried) {
                e.currentTarget.dataset.retried = "true";
                e.currentTarget.src = "/logo.png";
              } else {
                e.currentTarget.style.display = "none";
              }
            }}
          />
        </Link>
        <Link to="/" className="brand auth-brand">
          <span className="brand-icon"><Leaf size={19} /></span>Namma Krishi
        </Link>
      </div>
      <div className="auth-card">
        <div className="auth-emblem"><Leaf size={23} /></div>
        <span className="eyebrow">{language === "kn" ? "ಮೊದಲ ಬಾರಿಯ ನೋಂದಣಿ" : "First-time Registration"}</span>
        <h1>{language === "kn" ? "ರೈತರ ವಿವರಗಳನ್ನು ಸೇರಿಸಿ" : "Set up your farm"}</h1>
        <p>
          {language === "kn"
            ? "ನಿಮ್ಮ ಕೃಷಿ ಸಲಹೆಗಳನ್ನು ಪಡೆಯಲು ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಒಮ್ಮೆ ನಮೂದಿಸಿ."
            : "Enter your contact and farm location details to create your Namma Krishi account."}
        </p>

        <form className="form-stack" onSubmit={submit}>
          <label>
            {language === "kn" ? "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (Mobile Number)" : "Mobile number"}
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="9876543210"
              minLength={10}
            />
          </label>

          <label>
            {language === "kn" ? "ರೈತರ ಹೆಸರು (Farmer Name)" : "Farmer full name"}
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder={language === "kn" ? "ಉದಾ: ರಮೇಶ್ ಗೌಡ" : "e.g. Ramesh Gowda"}
            />
          </label>

          <label>
            {language === "kn" ? "ಜಿಲ್ಲೆ (District)" : "District"}
            <select
              required
              value={form.districtId}
              onChange={(event) => setForm({ ...form, districtId: event.target.value, talukId: "" })}
            >
              <option value="">{language === "kn" ? "ಜಿಲ್ಲೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Select district"}</option>
              {districts.map((district) => (
                <option value={district.id} key={district.id}>{district.name}</option>
              ))}
            </select>
          </label>

          <label>
            {language === "kn" ? "ತಾಲೂಕು (Taluk)" : "Taluk"}
            <select
              required
              disabled={!form.districtId}
              value={form.talukId}
              onChange={(event) => setForm({ ...form, talukId: event.target.value })}
            >
              <option value="">{language === "kn" ? "ತಾಲೂಕನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Select taluk"}</option>
              {taluks.map((taluk) => (
                <option value={taluk.id} key={taluk.id}>{taluk.name}</option>
              ))}
            </select>
          </label>

          <label>
            {language === "kn" ? "ಗ್ರಾಮ / ಊರು (Village - ಐಚ್ಛಿಕ)" : "Village (Optional)"}
            <input
              value={form.village}
              onChange={(event) => setForm({ ...form, village: event.target.value })}
              placeholder={language === "kn" ? "ಉದಾ: ಕೆಂಪೇಗೌಡನಗರ" : "e.g. Byatarayanapura"}
            />
          </label>

          {error && <Notice kind="error">{error}</Notice>}

          <button className="button button-primary button-full" disabled={busy}>
            {busy ? (language === "kn" ? "ಖಾತೆ ರಚಿಸಲಾಗುತ್ತಿದೆ…" : "Creating your profile…") : (language === "kn" ? "ಖಾತೆ ರಚಿಸಿ & ಮುಂದುವರಿಯಿರಿ" : "Create Account & Continue")} <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-bottom-links" style={{ marginTop: 20, textAlign: "center", fontSize: 12 }}>
          <span className="muted">
            {language === "kn" ? "ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಿದ್ದೀರಾ? " : "Already registered? "}
          </span>
          <Link to="/login" style={{ color: "var(--green)", fontWeight: 700 }}>
            {language === "kn" ? "ಇಲ್ಲಿ ಸೈನ್ ಇನ್ ಮಾಡಿ" : "Sign in directly"}
          </Link>
        </div>

        <div className="auth-bottom">
          <ShieldCheck size={14} />
          {language === "kn" ? "ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿ MongoDB ಯಲ್ಲಿ ಉಳಿಸಲಾಗುತ್ತದೆ." : "Your farm details are saved to MongoDB."}
        </div>
      </div>
      <Link to="/login" className="back-home">
        <ChevronLeft size={15} /> {language === "kn" ? "ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ" : "Back to login"}
      </Link>
    </main>
  );
}

// ==========================================
// PROFILE DROPDOWN COMPONENT
// ==========================================
function ProfileDropdown({ farmer, onClose, onLogout, language }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const hasLocation = Boolean(farmer?.district && farmer?.taluk);
  const isComplete = farmer?.profileComplete;

  return (
    <div className="profile-dropdown-panel" ref={dropdownRef}>
      <div className="profile-dropdown-header">
        <FarmerAvatar photoUrl={farmer?.photoUrl} name={farmer?.name} size={46} />
        <div className="profile-dropdown-user">
          <h4>{farmer?.name || "Farmer"}</h4>
          <span className="profile-phone">{farmer?.phone}</span>
          <span className="profile-location">
            {farmer?.village ? `${farmer.village}, ` : ""}
            {hasLocation ? `${farmer.taluk}, ${farmer.district}` : "Location not set"}
          </span>
        </div>
      </div>

      <div className="profile-dropdown-status">
        <div className="profile-status-bar">
          <div
            className="profile-status-fill"
            style={{ width: isComplete ? "100%" : "60%" }}
          />
        </div>
        <div className="profile-status-text">
          <span>{isComplete ? (language === "kn" ? "ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಂಡಿದೆ" : "Profile 100% complete") : (language === "kn" ? "ವಿವರಗಳು ಅಪೂರ್ಣವಾಗಿವೆ" : "Profile 60% complete")}</span>
          {!isComplete && (
            <Link to="/app/profile" onClick={onClose} className="status-fix-link">
              {language === "kn" ? "ಪೂರ್ಣಗೊಳಿಸಿ" : "Complete now"}
            </Link>
          )}
        </div>
      </div>

      <div className="profile-dropdown-menu">
        <Link to="/app/profile" onClick={onClose} className="dropdown-item">
          <Settings size={16} />
          <div>
            <b>{language === "kn" ? "ಕೃಷಿ ವಿವರಗಳು & ಸೆಟ್ಟಿಂಗ್ಸ್" : "Farm Profile & Settings"}</b>
            <small>{language === "kn" ? "ಮಣ್ಣು, ನೀರು & ಜಾಗದ ವಿವರಗಳು" : "Edit soil, water, farm size"}</small>
          </div>
        </Link>
        <Link to="/app/history" onClick={onClose} className="dropdown-item">
          <History size={16} />
          <div>
            <b>{language === "kn" ? "ನನ್ನ ಕೃಷಿ ಇತಿಹಾಸ" : "My Farming History"}</b>
            <small>{language === "kn" ? "ಹಿಂದಿನ ಬೆಳೆ ಯೋಜನೆಗಳು ಮತ್ತು ಹೋಲಿಕೆಗಳು" : "Past recommendations & comparisons"}</small>
          </div>
        </Link>
        <Link to="/app/plans" onClick={onClose} className="dropdown-item">
          <Leaf size={16} />
          <div>
            <b>{language === "kn" ? "ಉಳಿಸಿದ ಯೋಜನೆಗಳು" : "Saved Crop Plans"}</b>
            <small>{language === "kn" ? "ನಿಮ್ಮ ಉಳಿಸಿದ ಬೆಳೆ ಯೋಜನೆಗಳು" : "Review and continue saved plans"}</small>
          </div>
        </Link>
      </div>

      <div className="profile-dropdown-footer">
        <button className="dropdown-logout" onClick={() => { onClose(); onLogout(); }}>
          <LogOut size={15} />
          {language === "kn" ? "ಸೈನ್ ಔಟ್ ಮಾಡಿ" : "Sign Out"}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// NOTIFICATIONS DROPDOWN COMPONENT
// ==========================================
function NotificationDropdown({ onClose, language }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((items) =>
        items.map((n) => ((n._id || n.id) === id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((items) => items.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const clearAll = async () => {
    try {
      await api.delete("/notifications");
      setNotifications([]);
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTypeIcon = (type) => {
    switch (type) {
      case "sowing": return <Wheat size={16} className="notif-icon-sowing" />;
      case "calendar": return <CalendarDays size={16} className="notif-icon-cal" />;
      case "weather": return <CloudSun size={16} className="notif-icon-weather" />;
      case "pest": return <ShieldCheck size={16} className="notif-icon-pest" />;
      case "market": return <TrendingUp size={16} className="notif-icon-market" />;
      default: return <Leaf size={16} className="notif-icon-general" />;
    }
  };

  return (
    <div className="notification-dropdown-panel" ref={panelRef}>
      <div className="notif-header">
        <div className="notif-title-row">
          <h3>{language === "kn" ? "ಅಧಿಸೂಚನೆಗಳು" : "Notifications"}</h3>
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount} {language === "kn" ? "ಹೊಸತು" : "new"}</span>
          )}
        </div>
        <div className="notif-actions">
          {unreadCount > 0 && (
            <button className="notif-action-btn" onClick={markAllAsRead} title="Mark all read">
              <CheckCheck size={14} /> {language === "kn" ? "ಎಲ್ಲ ಓದಲಾಗಿದೆ" : "Mark all read"}
            </button>
          )}
          {notifications.length > 0 && (
            <button className="notif-action-btn clear-btn" onClick={clearAll} title="Clear all">
              <Trash2 size={14} /> {language === "kn" ? "ತೆರವುಗೊಳಿಸಿ" : "Clear all"}
            </button>
          )}
        </div>
      </div>

      <div className="notif-body">
        {loading ? (
          <div className="notif-empty"><span className="spinner" /> {language === "kn" ? "ಲೋಡ್ ಆಗುತ್ತಿದೆ…" : "Loading notifications…"}</div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <Bell size={28} className="muted" />
            <p><b>{language === "kn" ? "ಯಾವುದೇ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ" : "No notifications yet"}</b></p>
            <small className="muted">
              {language === "kn" ? "ನಿಮ್ಮ ಕೃಷಿ ಅಪ್‌ಡೇಟ್‌ಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ." : "Important sowing and weather reminders will appear here."}
            </small>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((item) => (
              <div
                key={item._id || item.id}
                className={`notif-card ${item.read ? "notif-read" : "notif-unread"}`}
                onClick={() => !item.read && markAsRead(item._id || item.id)}
              >
                <div className="notif-card-icon">{getTypeIcon(item.type)}</div>
                <div className="notif-card-content">
                  <div className="notif-card-title">
                    <b>{item.title}</b>
                    {!item.read && <span className="notif-dot" />}
                  </div>
                  <p>{item.description}</p>
                  <span className="notif-time">
                    {new Date(item.createdAt || Date.now()).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// APP LAYOUT WITH DARK AGRICULTURAL GREEN SIDEBAR
// ==========================================
function AppLayout({ children }) {
  const { farmer, logout, theme, setTheme, language, setLanguage } = useApp();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const location = useLocation();

  // Load unread count on mount
  useEffect(() => {
    api.get("/notifications")
      .then(({ data }) => {
        const count = (data.notifications || []).filter((n) => !n.read).length;
        setUnreadNotifs(count);
      })
      .catch(() => {});
  }, [location.pathname]);

  const active = navigation.find((item) => item.path === location.pathname);

  return (
    <div className="app-shell">
      {/* Dark Agricultural Green Sidebar */}
      <aside className={`sidebar sidebar-dark-green ${mobileMenu ? "sidebar-open" : ""}`}>
        <Link className="brand sidebar-brand" to="/app">
          <span className="brand-icon"><Leaf size={18} /></span>
          <span className="brand-name-dark">Namma Krishi</span>
        </Link>

        {/* Farmer Profile Button at Top-Left */}
        <button
          type="button"
          className="sidebar-farm-btn"
          onClick={() => setShowProfileMenu((prev) => !prev)}
          title="Open Farmer Profile Menu"
        >
          <FarmerAvatar photoUrl={farmer?.photoUrl} name={farmer?.name} size={34} />
          <div className="sidebar-farm-info">
            <b>{farmer?.name || "Your farm"}</b>
            <small>
              {farmer?.taluk ? `${farmer.taluk}, ${farmer.district}` : (language === "kn" ? "ವಿವರಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ" : "Set up your farm profile")}
            </small>
          </div>
          <ChevronDown size={15} className={`chevron-icon ${showProfileMenu ? "rotated" : ""}`} />
        </button>

        <div className="nav-caption">{language === "kn" ? "ಕಾರ್ಯಸ್ಥಳ" : "YOUR WORKSPACE"}</div>

        <nav className="side-nav">
          {navigation.map((item, index) => {
            const isActive = location.pathname === item.path || (item.path === "/app" && location.pathname === "/app/");
            return (
              <Link
                key={item.path}
                onClick={() => setMobileMenu(false)}
                to={item.path}
                className={`nav-link ${isActive ? "nav-active" : ""}`}
              >
                <span className="nav-glyph">{item.icon}</span>
                <span className="nav-label">{language === "kn" ? kannadaNavigation[index] : item.title}</span>
                {item.title === "AI assistant" && <span className="nav-new">AI</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <Link
            className={`nav-link ${location.pathname === "/app/profile" ? "nav-active" : ""}`}
            to="/app/profile"
            onClick={() => setMobileMenu(false)}
          >
            <Settings size={17} />
            <span className="nav-label">{language === "kn" ? "ಕೃಷಿ ವಿವರಗಳು & ಸೆಟ್ಟಿಂಗ್ಸ್" : "Farm profile & settings"}</span>
          </Link>

          <div className="sidebar-help">
            <div className="help-icon"><CircleHelp size={16} /></div>
            <b>{language === "kn" ? "ನಿಮ್ಮ ಸಹಾಯಕ್ಕೆ" : "Here to help"}</b>
            <p>
              {language === "kn"
                ? "ನಮ್ಮ ಕೃಷಿ ಮಾರ್ಗದರ್ಶಿ ಮಾತ್ರ. ಸ್ಥಳೀಯ ಕೃಷಿ ತಜ್ಞರಿಂದ ಸಲಹೆ ಪಡೆಯಿರಿ."
                : "Namma Krishi provides guided estimates. Confirm with local KVK before sowing."}
            </p>
            <Link to="/app/assistant">
              {language === "kn" ? "ಸಹಾಯಕರನ್ನು ಕೇಳಿ" : "Ask the assistant"} <ArrowRight size={13} />
            </Link>
          </div>

          <button className="nav-link logout-button" onClick={logout}>
            <LogOut size={17} />
            <span>{language === "kn" ? "ಸೈನ್ ಔಟ್" : "Sign out"}</span>
          </button>

          <div className="sidebar-version">NAMMA KRISHI · KARNATAKA</div>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="mobile-backdrop"
          onClick={() => setMobileMenu(false)}
          aria-label="Close menu"
        />
      )}

      <div className="main-column">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-btn"
              aria-label="Open menu"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={19} />
            </button>
            <div className="breadcrumbs">
              <span>Namma Krishi</span>
              <ChevronRight size={14} />
              <b>
                {active?.title ||
                  (location.pathname.includes("profile") ? "Farm profile" :
                   location.pathname.includes("history") ? "Farming history" : "Workspace")}
              </b>
            </div>
          </div>

          <div className="top-actions">
            <span className="season-chip">
              <span /> {language === "kn" ? "ಮುಂಗಾರು ಬೆಳೆ ಯೋಜನೆ" : "Kharif planning"}
            </span>

            <select
              className="language-select"
              aria-label="Select language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">EN</option>
              <option value="kn">ಕನ್ನಡ</option>
            </select>

            <button
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            {/* Notification Bell Button */}
            <div className="topbar-notif-wrap">
              <button
                className={`icon-button notification-button ${unreadNotifs > 0 ? "has-unread" : ""}`}
                aria-label="Notifications"
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  setShowProfileMenu(false);
                }}
              >
                <Bell size={17} />
                {unreadNotifs > 0 && <span className="notif-count-badge">{unreadNotifs}</span>}
              </button>
              {showNotifications && (
                <NotificationDropdown
                  onClose={() => {
                    setShowNotifications(false);
                    // Refresh unread count
                    api.get("/notifications")
                      .then(({ data }) => setUnreadNotifs((data.notifications || []).filter((n) => !n.read).length))
                      .catch(() => {});
                  }}
                  language={language}
                />
              )}
            </div>

            {/* Farmer Profile Button in Topbar */}
            <div className="topbar-profile-wrap">
              <button
                className="top-avatar-btn"
                onClick={() => {
                  setShowProfileMenu((prev) => !prev);
                  setShowNotifications(false);
                }}
                title="Farmer Profile Menu"
              >
                <FarmerAvatar photoUrl={farmer?.photoUrl} name={farmer?.name} size={34} />
                <span className="topbar-farmer-name">{farmer?.name?.split(" ")[0] || "Farmer"}</span>
                <ChevronDown size={14} />
              </button>
              {showProfileMenu && (
                <ProfileDropdown
                  farmer={farmer}
                  onClose={() => setShowProfileMenu(false)}
                  onLogout={logout}
                  language={language}
                />
              )}
            </div>
          </div>
        </header>

        <main className="page-content">{children}</main>

        <footer className="app-footer">
          <span>Namma Krishi · Intelligent Farming Decision Engine</span>
          <span>Estimates for guidance only · Verify with your local agricultural officer</span>
        </footer>
      </div>
    </div>
  );
}

function Protected({ children }) {
  const { token, loading } = useApp();
  if (loading) return <Loading label="Loading your farm…" />;
  return token ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" replace />;
}

function saveCropPlan(crop, farmer, notify) {
  return api.post("/plans", {
    name: `${crop.name} · ${new Date().toLocaleDateString()}`,
    crops: [crop.name],
    area: farmer?.landArea || 1,
    season: crop.season || "Kharif"
  })
    .then(() => notify(`${crop.name} added to your saved plans.`))
    .catch((error) => notify(errorMessage(error), true));
}

// ==========================================
// DASHBOARD
// ==========================================
function Dashboard() {
  const { farmer, language } = useApp();
  const [recommendations, setRecommendations] = useState([]);
  const [weather, setWeather] = useState(null);
  const [market, setMarket] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");

  const notify = (text, isError = false) => {
    setToast(isError ? `Error: ${text}` : text);
    setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => {
    Promise.all([
      api.post("/crops/recommend", { soils: farmer?.soils, waterAvailability: farmer?.waterAvailability, landArea: farmer?.landArea }).catch((error) => {
        setLoadError(errorMessage(error));
        return { data: { recommendations: [] } };
      }),
      farmer?.district
        ? api.get("/weather", { params: { district: farmer.district, taluk: farmer.taluk } }).catch((error) => ({ data: { available: false, reason: errorMessage(error) } }))
        : Promise.resolve({ data: { available: false, reason: "Add your farm location to see local weather." } }),
      api.get("/market/prices", { params: { district: farmer?.district } }).catch((error) => ({ data: { available: false, prices: [], reason: errorMessage(error) } })),
      api.get("/calendar").catch(() => ({ data: { months: [] } })),
      api.get("/activities").catch(() => ({ data: { activities: [] } }))
    ]).then(([cropData, weatherData, prices, calendarData, actData]) => {
      setRecommendations(cropData.data.recommendations || []);
      setWeather(weatherData.data);
      setMarket(prices.data);
      setCalendar(calendarData.data.months || []);
      setActivities(actData.data.activities || []);
    }).finally(() => setLoading(false));
  }, [farmer]);

  const month = new Date().getMonth() + 1;
  const monthPlan = calendar.find((item) => item.month === month);

  if (loading) return <Loading label="Putting your farm dashboard together…" />;

  return (
    <>
      <PageTitle
        eyebrow={language === "kn" ? "ನಿಮ್ಮ ಕೃಷಿ ಅವಲೋಕನ" : "YOUR FARM AT A GLANCE"}
        title={language === "kn" ? `ಶುಭೋದಯ, ${farmer?.name?.split(" ")[0] || "ರೈತರೇ"}.` : `Good day, ${farmer?.name?.split(" ")[0] || "farmer"}.`}
        detail={
          farmer?.district
            ? `${language === "kn" ? "ನಿಮ್ಮ ಜಾಗ:" : "Tailored conditions for"} ${farmer.taluk}, ${farmer.district}${farmer.village ? ` (${farmer.village})` : ""}.`
            : "Complete your farm profile to get personalized recommendations."
        }
        action={
          <Link to="/app/profile" className="button button-outline">
            <Settings size={15} /> {language === "kn" ? "ವಿವರಗಳನ್ನು ನವೀಕರಿಸಿ" : "Edit farm details"}
          </Link>
        }
      />

      {loadError && <Notice kind="error">{loadError}</Notice>}

      {!farmer?.profileComplete && (
        <Notice kind="warning">
          <b>{language === "kn" ? "ಪ್ರೊಫೈಲ್ ಅಪೂರ್ಣವಾಗಿದೆ:" : "Profile Incomplete:"}</b>{" "}
          {language === "kn"
            ? "ನಿಮ್ಮ ಮಣ್ಣಿನ ಪ್ರಕಾರ, ನೀರಿನ ಲಭ್ಯತೆ ಮತ್ತು ಗ್ರಾಮದ ವಿವರಗಳನ್ನು ಸೇರಿಸಿ."
            : "Add your soil type, water availability and village to make recommendations more accurate."}{" "}
          <Link to="/app/profile">
            {language === "kn" ? "ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ" : "Complete profile"} <ArrowRight size={14} />
          </Link>
        </Notice>
      )}

      <div className="stat-grid">
        <Stat
          icon={Flower2}
          label={language === "kn" ? "ಸೂಕ್ತ ಬೆಳೆಗಳು" : "Crops to explore"}
          value={recommendations.length}
          foot={language === "kn" ? "ನಿಮ್ಮ ಮಣ್ಣಿಗೆ ಸೂಕ್ತವಾದವು" : "Ranked for your conditions"}
        />
        <Stat
          icon={CloudSun}
          label={language === "kn" ? "ಇಂದಿನ ಹವಾಮಾನ" : "Today's weather"}
          value={weather?.available ? `${Math.round(weather.current.temperature_2m)}°C` : "Not available"}
          foot={weather?.available ? `At ${weather.location}` : "Select a farm location"}
          tone="yellow"
        />
        <Stat
          icon={Droplets}
          label={language === "kn" ? "ನೀರಿನ ಲಭ್ಯತೆ" : "Water availability"}
          value={farmer?.waterAvailability || "Not set"}
          foot={language === "kn" ? "ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ಅಪ್‌ಡೇಟ್ ಮಾಡಿ" : "Update in farm profile"}
          tone="blue"
        />
        <Stat
          icon={TrendingUp}
          label={language === "kn" ? "ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು" : "Market prices"}
          value={market?.available ? `${market.prices.length} listings` : "Not connected"}
          foot={market?.available ? "Verified provider records" : "No verified data feed"}
          tone="peach"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel recommendation-panel">
          <div className="section-top">
            <div>
              <span className="eyebrow">{language === "kn" ? "ಶಿಫಾರಸುಗಳು" : "A GOOD PLACE TO START"}</span>
              <h2>{language === "kn" ? "ನಿಮ್ಮ ಬೆಳೆ ಶಾರ್ಟ್‌ಲಿಸ್ಟ್" : "Your crop shortlist"}</h2>
              <p>{language === "kn" ? "ನಿಮ್ಮ ಜಮೀನಿಗೆ ಸೂಕ್ತವಾದ ಆಯ್ಕೆಗಳು." : "These are options worth exploring—not a promise of results."}</p>
            </div>
            <Link to="/app/recommendations" className="text-button">
              {language === "kn" ? "ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ" : "See all"} <ArrowRight size={15} />
            </Link>
          </div>
          <CropGrid
            crops={recommendations.slice(0, 3)}
            onSave={(crop) => saveCropPlan(crop, farmer, notify)}
          />
        </section>

        <aside className="right-stack">
          <section className="panel weather-panel">
            <div className="section-top">
              <div>
                <span className="eyebrow">{language === "kn" ? "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ" : "WEATHER CHECK"}</span>
                <h2>{weather?.available ? weather.location : "Your local forecast"}</h2>
              </div>
              <CloudSun size={20} className="weather-icon" />
            </div>
            {weather?.available ? (
              <>
                <div className="weather-current">
                  <b>{Math.round(weather.current.temperature_2m)}°</b>
                  <span>Now · humidity {weather.current.relative_humidity_2m}%<br />Wind {weather.current.wind_speed_10m} km/h</span>
                </div>
                <div className="forecast-strip">
                  {weather.daily.time.slice(0, 5).map((day, index) => (
                    <div key={day}>
                      <small>{new Date(day).toLocaleDateString("en", { weekday: "short" })}</small>
                      <span>{Math.round(weather.daily.temperature_2m_max[index])}°</span>
                      <small>{weather.daily.precipitation_probability_max[index] ?? 0}% rain</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty-note">{weather?.reason || "Weather could not be loaded."}</p>
            )}
            <Link className="panel-link" to="/app/weather">
              {language === "kn" ? "ಸಂಪೂರ್ಣ ಹವಾಮಾನ ವರದಿ" : "View weather report"} <ArrowRight size={14} />
            </Link>
          </section>

          <section className="panel today-panel">
            <div className="section-top">
              <div>
                <span className="eyebrow">{language === "kn" ? "ಈ ತಿಂಗಳ ಕೃಷಿ ಕಾರ್ಯಗಳು" : "A NOTE FOR THIS MONTH"}</span>
                <h2>{monthPlan?.name || "This month"}</h2>
              </div>
              <CalendarDays size={18} className="calendar-icon" />
            </div>
            <p>{monthPlan?.activities?.[0] || "Review your field conditions and upcoming season."}</p>
            <div className="activity-crops">
              <span>{language === "kn" ? "ಬೆಳೆಗಳು:" : "Explore:"}</span>
              {monthPlan?.crops?.length ? (
                monthPlan.crops.slice(0, 2).map((crop) => <b key={crop}>{crop}</b>)
              ) : (
                <span>Check your local crop calendar</span>
              )}
            </div>
            <Link className="panel-link" to="/app/calendar">
              {language === "kn" ? "ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಿರಿ" : "Open crop calendar"} <ArrowRight size={14} />
            </Link>
          </section>
        </aside>
      </div>

      {/* Recent Activities Section */}
      <section className="panel recent-activities-panel" style={{ marginTop: 20, padding: 22 }}>
        <div className="section-top">
          <div>
            <span className="eyebrow">{language === "kn" ? "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆಗಳು" : "ACTIVITY HISTORY"}</span>
            <h2>{language === "kn" ? "ನಿಮ್ಮ ಇತ್ತೀಚಿನ ಕೃಷಿ ಚಟುವಟಿಕೆಗಳು" : "Recent Farming Activities"}</h2>
            <p className="muted">
              {language === "kn"
                ? "ನೀವು ರಚಿಸಿದ ಯೋಜನೆಗಳು, ಹೋಲಿಕೆಗಳು ಮತ್ತು ಸಲಹೆಗಳ ದಾಖಲೆ."
                : "A track of your recent crop planning, comparisons and profile changes."}
            </p>
          </div>
          <Link to="/app/history" className="text-button">
            {language === "kn" ? "ಸಂಪೂರ್ಣ ಇತಿಹಾಸ ನೋಡಿ" : "View all activity history"} <ArrowRight size={15} />
          </Link>
        </div>

        {activities.length === 0 ? (
          <div className="empty-activities-banner" style={{ padding: "18px 0", color: "var(--muted)", fontSize: 13 }}>
            <p>{language === "kn" ? "ಇನ್ನೂ ಯಾವುದೇ ಚಟುವಟಿಕೆಗಳು ದಾಖಲಾಗಿಲ್ಲ. ಬೆಳೆ ಯೋಜನೆಯನ್ನು ಪ್ರಾರಂಭಿಸಿ." : "No activities recorded yet. Start by generating a crop recommendation or comparing crops."}</p>
          </div>
        ) : (
          <div className="recent-activities-list" style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {activities.slice(0, 4).map((act) => (
              <div
                key={act._id || act.id}
                className="activity-row-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--surface-soft)",
                  border: "1px solid var(--line)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="activity-icon-chip" style={{ width: 28, height: 28, borderRadius: 8, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
                    <History size={15} />
                  </div>
                  <div>
                    <b style={{ fontSize: 13 }}>{act.title}</b>
                    {act.cropName && (
                      <span className="crop-badge-small" style={{ marginLeft: 8, padding: "2px 6px", borderRadius: 4, background: "#e8f2e4", color: "#466e39", fontSize: 11, fontWeight: 600 }}>
                        {act.cropName}
                      </span>
                    )}
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>{act.details}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: "var(--muted)", display: "block" }}>
                    {new Date(act.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                  <span className="status-pill-small" style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#ebf2ea", color: "#3d6332", textTransform: "capitalize", fontWeight: 700 }}>
                    {act.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="assistant-banner" style={{ marginTop: 20 }}>
        <div className="assistant-bubble"><Sparkles size={20} /></div>
        <div>
          <span className="eyebrow">{language === "kn" ? "ಸಹಾಯ ಬೇಕೇ?" : "A QUESTION ON YOUR MIND?"}</span>
          <h3>{language === "kn" ? "ನಿಮ್ಮ ಬೆಳೆ ಮತ್ತು ನೀರಿನ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ." : "Your Namma Krishi assistant is here to help."}</h3>
          <p>{language === "kn" ? "ಯಾವ ಬೆಳೆ ಸೂಕ್ತ, ರೋಗ ನಿರ್ವಹಣೆ ಮತ್ತು ಮಣ್ಣಿನ ಬಗ್ಗೆ ಕೇಳಿ." : "Ask questions about crops, water needs, sowing windows and pest alerts."}</p>
        </div>
        <Link to="/app/assistant" className="button button-white">
          {language === "kn" ? "ಸಹಾಯಕರನ್ನು ಕೇಳಿ" : "Ask a question"} <ArrowRight size={15} />
        </Link>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

// ==========================================
// MY FARMING HISTORY PAGE
// ==========================================
function HistoryPage() {
  const { language } = useApp();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  const loadActivities = useCallback(async () => {
    try {
      const { data } = await api.get("/activities");
      setActivities(data.activities || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const filtered = activities.filter((act) => {
    if (filter === "plans") {
      if (!act.activityType.includes("plan")) return false;
    } else if (filter === "recommendations") {
      if (!act.activityType.includes("recommendation")) return false;
    } else if (filter === "comparisons") {
      if (!act.activityType.includes("comparison")) return false;
    } else if (filter === "profile") {
      if (!act.activityType.includes("profile") && !act.activityType.includes("photo")) return false;
    } else if (filter === "assistant") {
      if (!act.activityType.includes("ai")) return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = act.title?.toLowerCase().includes(q);
      const matchCrop = act.cropName?.toLowerCase().includes(q);
      const matchDetails = act.details?.toLowerCase().includes(q);
      return matchTitle || matchCrop || matchDetails;
    }
    return true;
  });

  return (
    <>
      <PageTitle
        eyebrow={language === "kn" ? "ಕೃಷಿ ಚಟುವಟಿಕೆ ದಾಖಲೆ" : "FARMING ACTIVITIES & HISTORY"}
        title={language === "kn" ? "ನನ್ನ ಕೃಷಿ ಇತಿಹಾಸ" : "My Farming History"}
        detail={
          language === "kn"
            ? "ನಿಮ್ಮ ಹಿಂದಿನ ಬೆಳೆ ಶಿಫಾರಸುಗಳು, ಹೋಲಿಕೆಗಳು, ಉಳಿಸಿದ ಯೋಜನೆಗಳು ಮತ್ತು ಪ್ರೊಫೈಲ್ ನವೀಕರಣಗಳ ಸಂಪೂರ್ಣ ಇತಿಹಾಸ."
            : "A complete record of your crop shortlists, comparisons, saved plans and farm profile milestones."
        }
        action={
          <button className="button button-outline" onClick={loadActivities}>
            <Clock size={15} /> {language === "kn" ? "ಮರುಲೋಡ್ ಮಾಡಿ" : "Refresh history"}
          </button>
        }
      />

      <div className="panel history-filter-panel" style={{ padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div className="segmented-control" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "all", label: language === "kn" ? "ಎಲ್ಲಾ" : "All Activities" },
              { id: "plans", label: language === "kn" ? "ಬೆಳೆ ಯೋಜನೆಗಳು" : "Crop Plans" },
              { id: "recommendations", label: language === "kn" ? "ಶಿಫಾರಸುಗಳು" : "Recommendations" },
              { id: "comparisons", label: language === "kn" ? "ಹೋಲಿಕೆಗಳು" : "Comparisons" },
              { id: "profile", label: language === "kn" ? "ಪ್ರೊಫೈಲ್" : "Profile Changes" },
              { id: "assistant", label: language === "kn" ? "AI ಸಹಾಯಕ" : "AI Consultations" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`segment-btn ${filter === tab.id ? "segment-active" : ""}`}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid var(--line)",
                  background: filter === tab.id ? "var(--green)" : "var(--surface)",
                  color: filter === tab.id ? "#fff" : "var(--text)",
                  cursor: "pointer"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label className="search-field" style={{ minWidth: 240, margin: 0 }}>
            <Search size={15} />
            <input
              placeholder={language === "kn" ? "ಚಟುವಟಿಕೆ ಅಥವಾ ಬೆಳೆ ಹುಡುಕಿ…" : "Filter by title or crop…"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      {loading ? (
        <Loading label={language === "kn" ? "ಇತಿಹಾಸ ಲೋಡ್ ಆಗುತ್ತಿದೆ…" : "Loading activity history…"} />
      ) : filtered.length === 0 ? (
        <div className="panel blank-panel" style={{ padding: 40, textAlign: "center" }}>
          <Clock size={36} className="muted" style={{ margin: "0 auto 12px" }} />
          <h3>{language === "kn" ? "ಯಾವುದೇ ಚಟುವಟಿಕೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ" : "No matching activities found"}</h3>
          <p className="muted">
            {language === "kn"
              ? "ಬೆಳೆ ಯೋಜನೆಯನ್ನು ಪ್ರಾರಂಭಿಸಿ ಅಥವಾ ಬೆಳೆಗಳನ್ನು ಹೋಲಿಸಿ ಇತಿಹಾಸವನ್ನು ರಚಿಸಿ."
              : "Generate crop recommendations, compare crops, or save plans to build your farming history."}
          </p>
          <Link to="/app/recommendations" className="button button-primary" style={{ marginTop: 14 }}>
            {language === "kn" ? "ಬೆಳೆ ಯೋಜನೆ ಆರಂಭಿಸಿ" : "Explore crop planner"} <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="panel history-table-panel" style={{ overflow: "hidden" }}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{language === "kn" ? "ಚಟುವಟಿಕೆ" : "Activity Name"}</th>
                  <th>{language === "kn" ? "ಬೆಳೆ" : "Crop"}</th>
                  <th>{language === "kn" ? "ದಿನಾಂಕ & ಸಮಯ" : "Date & Time"}</th>
                  <th>{language === "kn" ? "ವಿವರಗಳು" : "Details"}</th>
                  <th>{language === "kn" ? "ಸ್ಥಿತಿ" : "Status"}</th>
                  <th>{language === "kn" ? "ಮುಂದುವರಿಸಿ" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item._id || item.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
                          {item.activityType.includes("plan") ? <Leaf size={14} /> :
                           item.activityType.includes("comparison") ? <TrendingUp size={14} /> :
                           item.activityType.includes("ai") ? <Sparkles size={14} /> :
                           item.activityType.includes("photo") ? <Image size={14} /> :
                           item.activityType.includes("profile") ? <Settings size={14} /> : <History size={14} />}
                        </div>
                        <b>{item.title}</b>
                      </div>
                    </td>
                    <td>
                      {item.cropName ? (
                        <span className="activity-crop-tag" style={{ background: "#e8f3e5", color: "#3e6e33", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                          {item.cropName}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })} · {new Date(item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 320 }}>{item.details || "—"}</td>
                    <td>
                      <span className="status-badge" style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: "#eef6ea", color: "#366b2e" }}>
                        {item.status || "Completed"}
                      </span>
                    </td>
                    <td>
                      {item.activityType.includes("plan") ? (
                        <Link to="/app/plans" className="text-button">
                          {language === "kn" ? "ಯೋಜನೆ ತೆರೆಯಿರಿ" : "Open Plan"} <ArrowRight size={13} />
                        </Link>
                      ) : item.activityType.includes("comparison") ? (
                        <Link to="/app/simulator" className="text-button">
                          {language === "kn" ? "ಮತ್ತೆ ಹೋಲಿಸಿ" : "Re-simulate"} <ArrowRight size={13} />
                        </Link>
                      ) : item.activityType.includes("recommendation") ? (
                        <Link to="/app/recommendations" className="text-button">
                          {language === "kn" ? "ಶಿಫಾರಸು ವೀಕ್ಷಿಸಿ" : "View Crops"} <ArrowRight size={13} />
                        </Link>
                      ) : (
                        <span className="muted" style={{ fontSize: 11 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// RECOMMENDATIONS PAGE
// ==========================================
function RecommendationsPage() {
  const { farmer, language } = useApp();
  const [crops, setCrops] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const [diversification, setDiversification] = useState(null);
  const [diversifying, setDiversifying] = useState(false);

  const notify = (text, isError = false) => {
    setToast(isError ? `Error: ${text}` : text);
    setTimeout(() => setToast(""), 3000);
  };

  const load = useCallback(() => {
    api.post("/crops/recommend", { soils: farmer?.soils, waterAvailability: farmer?.waterAvailability, landArea: farmer?.landArea })
      .then(({ data }) => setCrops(data.recommendations))
      .catch((error) => {
        setCrops([]);
        setLoadError(errorMessage(error));
      })
      .finally(() => setLoading(false));
  }, [farmer]);

  useEffect(() => { load(); }, [load]);

  const buildDiversification = async () => {
    setDiversifying(true);
    try {
      const { data } = await api.post("/crops/diversify", { soils: farmer?.soils, waterAvailability: farmer?.waterAvailability, landArea: farmer?.landArea || 1 });
      setDiversification(data);
    } catch (error) {
      notify(errorMessage(error), true);
    } finally {
      setDiversifying(false);
    }
  };

  const saveDiversification = async () => {
    try {
      await api.post("/plans", {
        name: `Diversified plan · ${new Date().toLocaleDateString()}`,
        crops: diversification.crops.map((crop) => crop.name),
        area: farmer?.landArea || 1,
        season: "Kharif",
        notes: diversification.explanation,
        simulation: { allocation: diversification.crops }
      });
      notify("Diversified plan added to your saved plans.");
    } catch (error) {
      notify(errorMessage(error), true);
    }
  };

  const toggle = (name) =>
    setSelected((items) =>
      items.includes(name) ? items.filter((item) => item !== name) : items.length < 5 ? [...items, name] : items
    );

  if (loading) return <Loading label="Finding crops to explore…" />;

  return (
    <>
      <PageTitle
        eyebrow="CROP PLANNER"
        title={language === "kn" ? "ನಿಮ್ಮ ಜಮೀನಿಗೆ ಯಾವ ಬೆಳೆ ಸೂಕ್ತ?" : "What might grow well here?"}
        detail="A transparent shortlist based on the information you've shared. It's a starting point for your own decision."
        action={
          <Link to="/app/profile" className="button button-outline">
            <Settings size={15} /> Update conditions
          </Link>
        }
      />
      <div className="score-explainer">
        <Sparkles size={17} />
        <div>
          <b>How the score works</b>
          <p>Soil fit, water needs, rainfall, season and general crop risk all contribute. Select up to five crops to compare side by side.</p>
        </div>
      </div>
      {loadError && <Notice kind="error">{loadError}</Notice>}
      {farmer?.soils?.length ? (
        <div className="tag-row">
          <span>Your soil</span>
          {farmer.soils.map((soil) => <b key={soil}>{soil}</b>)}
          <span>·</span>
          <span>{farmer.waterAvailability} water availability</span>
        </div>
      ) : (
        <Notice kind="warning">
          Recommendations are more general until you add soil and water information in <Link to="/app/profile">Farm profile</Link>.
        </Notice>
      )}

      <section className="panel diversify-panel">
        <div className="diversify-heading">
          <div className="diversify-icon"><Flower2 size={18} /></div>
          <div>
            <span className="eyebrow">A MORE VARIED PLAN</span>
            <h2>Explore crop diversification</h2>
            <p>See an illustrative way to split your farm across a few suitable crops.</p>
          </div>
          <button className="button button-outline" onClick={buildDiversification} disabled={diversifying}>
            {diversifying ? "Working…" : "Suggest a split"} <ArrowRight size={14} />
          </button>
        </div>
        {diversification && (
          diversification.available ? (
            <>
              <div className="diversification-allocations">
                {diversification.crops.map((crop) => (
                  <div className="allocation-card" key={crop.name}>
                    <div className="allocation-bar"><span style={{ width: `${crop.share}%` }} /></div>
                    <b>{crop.name}</b>
                    <strong>{crop.area} ac <small>({crop.share}%)</small></strong>
                    <span>{crop.score}% match · {crop.water} water</span>
                  </div>
                ))}
              </div>
              <div className="diversify-bottom">
                <p>{diversification.explanation}</p>
                <button className="text-button" onClick={saveDiversification}>Save this plan <ArrowRight size={14} /></button>
              </div>
            </>
          ) : (
            <Notice kind="warning">{diversification.reason}</Notice>
          )
        )}
      </section>

      <div className="section-top grid-heading">
        <div>
          <h2>Recommended for you</h2>
          <p className="muted">Reference yields, costs and prices are indicative—not guarantees.</p>
        </div>
        <Link
          to="/app/simulator"
          state={{ crops: selected }}
          className={`button button-primary ${selected.length < 2 ? "button-disabled" : ""}`}
          onClick={(event) => { if (selected.length < 2) event.preventDefault(); }}
        >
          {selected.length >= 2 ? `Compare ${selected.length} crops` : "Select crops to compare"} <ArrowRight size={15} />
        </Link>
      </div>

      <CropGrid crops={crops} selected={selected} onCompare={toggle} onSave={(crop) => saveCropPlan(crop, farmer, notify)} />
      <div className="estimate-note">
        <CircleHelp size={15} /> Model estimates use general reference values; verify soil, seed variety, local agronomy and dated market prices before planting.
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

// ==========================================
// SIMULATOR PAGE
// ==========================================
function SimulatorPage() {
  const { farmer } = useApp();
  const location = useLocation();
  const [allCrops, setAllCrops] = useState([]);
  const [selected, setSelected] = useState(location.state?.crops?.length >= 2 ? location.state.crops : ["Ragi", "Maize"]);
  const [rainfall, setRainfall] = useState(650);
  const [water, setWater] = useState(farmer?.waterAvailability || "medium");
  const [priceChange, setPriceChange] = useState(0);
  const [costChange, setCostChange] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    api.get("/crops")
      .then(({ data }) => setAllCrops(data.crops))
      .catch((reason) => setError(errorMessage(reason)));
  }, []);

  useEffect(() => {
    if (!selected.length || !allCrops.length) { setResults([]); return; }
    const timer = setTimeout(() => {
      api.post("/crops/compare", {
        crops: selected,
        soils: farmer?.soils,
        waterAvailability: water,
        rainfall,
        landArea: farmer?.landArea || 1,
        prices: Object.fromEntries(selected.map((name) => [name, (allCrops.find((item) => item.name === name)?.priceAssumptionPerQuintal || 0) * (1 + priceChange / 100)])),
        costs: Object.fromEntries(selected.map((name) => [name, (allCrops.find((item) => item.name === name)?.costPerAcre || 0) * (1 + costChange / 100)]))
      })
        .then(({ data }) => { setResults(data.crops); setError(""); })
        .catch((reason) => setError(errorMessage(reason)));
    }, 150);
    return () => clearTimeout(timer);
  }, [selected, farmer, rainfall, water, priceChange, costChange, allCrops]);

  const chartData = results.map((item) => ({
    name: item.name,
    profit: Math.round(item.profit / (item.area || 1)),
    cost: item.estimatedCostPerAcre
  }));

  const toggle = (name) =>
    setSelected((items) =>
      items.includes(name) ? items.filter((item) => item !== name) : items.length < 5 ? [...items, name] : items
    );

  return (
    <>
      <PageTitle
        eyebrow="COMPARE & SIMULATE"
        title="What if things change?"
        detail="Adjust the assumptions. Your comparison updates as you explore."
        action={
          <button
            className="button button-outline"
            onClick={() => { setRainfall(650); setWater(farmer?.waterAvailability || "medium"); setPriceChange(0); setCostChange(0); }}
          >
            Reset assumptions
          </button>
        }
      />
      <div className="simulator-layout">
        <aside className="panel simulator-controls">
          <span className="eyebrow">YOUR WHAT-IF SCENARIO</span>
          <h2>Adjust conditions</h2>
          <p className="muted">Explore how your assumptions affect the comparison.</p>
          <label className="control-label">
            Expected seasonal rainfall <b>{rainfall} mm</b>
            <input type="range" min="100" max="1800" step="50" value={rainfall} onChange={(event) => setRainfall(Number(event.target.value))} />
            <div className="range-hints"><span>Lower</span><span>Higher</span></div>
          </label>
          <label className="control-label">
            Water availability
            <select value={water} onChange={(event) => setWater(event.target.value)}>
              <option value="low">Limited</option>
              <option value="medium">Moderate</option>
              <option value="high">Reliable irrigation</option>
            </select>
          </label>
          <label className="control-label">
            Market price change <b>{priceChange > 0 ? "+" : ""}{priceChange}%</b>
            <input type="range" min="-30" max="30" step="5" value={priceChange} onChange={(event) => setPriceChange(Number(event.target.value))} />
            <div className="range-hints"><span>−30%</span><span>+30%</span></div>
          </label>
          <label className="control-label">
            Cultivation cost change <b>{costChange > 0 ? "+" : ""}{costChange}%</b>
            <input type="range" min="-20" max="40" step="5" value={costChange} onChange={(event) => setCostChange(Number(event.target.value))} />
            <div className="range-hints"><span>−20%</span><span>+40%</span></div>
          </label>
          <Notice kind="warning">Prices and costs are model assumptions. They are not live mandi prices or a profit guarantee.</Notice>
        </aside>

        <div className="sim-results">
          <section className="panel crop-picker">
            <div className="section-top">
              <div><span className="eyebrow">YOUR SHORTLIST</span><h2>Choose 2–5 crops</h2></div>
              <span className="selected-count">{selected.length} selected</span>
            </div>
            <div className="picker-list">
              {allCrops.map((crop) => (
                <label key={crop.name} className={`picker-item ${selected.includes(crop.name) ? "picker-selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected.includes(crop.name)}
                    disabled={!selected.includes(crop.name) && selected.length >= 5}
                    onChange={() => toggle(crop.name)}
                  />
                  <span>{crop.name}</span>
                  <small>{crop.water} water</small>
                </label>
              ))}
            </div>
          </section>

          {selected.length < 2 ? (
            <Notice kind="info">Choose at least two crops to see the comparison.</Notice>
          ) : (
            <>
              <section className="panel chart-panel">
                <div className="section-top">
                  <div><span className="eyebrow">INDICATIVE FINANCIAL COMPARISON</span><h2>Estimated profit per acre</h2></div>
                  <span className="chart-caption">INR · model only</span>
                </div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#638b56" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#638b56" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--line)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                      <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ background: "var(--surface)", borderColor: "var(--line)", borderRadius: 12, fontSize: 12 }} />
                      <Area type="monotone" dataKey="profit" stroke="#547c47" strokeWidth={2.5} fill="url(#profitFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="panel comparison-panel">
                <div className="section-top">
                  <div><span className="eyebrow">SIDE BY SIDE</span><h2>How they compare</h2></div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Crop</th><th>Match</th><th>Water</th><th>Duration</th><th>Est. yield / ac</th><th>Price assumption / q</th><th>Est. cost / ac</th><th>Est. profit / ac</th><th>Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((crop) => (
                        <tr key={crop.name}>
                          <td><b>{crop.name}</b></td>
                          <td><span className="table-score">{crop.score}%</span></td>
                          <td>{crop.water}</td>
                          <td>{crop.duration} days</td>
                          <td>{crop.yieldPerAcre} q</td>
                          <td>{formatMoney(crop.pricePerQuintal)}</td>
                          <td>{formatMoney(crop.estimatedCostPerAcre)}</td>
                          <td className={crop.profit >= 0 ? "profit" : "loss"}>{formatMoney(crop.profit / crop.area)}</td>
                          <td>{crop.risk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="estimate-note">
                  <CircleHelp size={15} /> Price assumptions and returns are model-only, not sourced from a live mandi.
                </div>
              </section>
            </>
          )}
        </div>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

// ==========================================
// WEATHER PAGE
// ==========================================
function WeatherPage() {
  const { farmer, language } = useApp();
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWeather = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    if (!farmer?.district) {
      setWeather({
        available: false,
        reason: language === "kn"
          ? "ಹವಾಮಾನ ವರದಿಯನ್ನು ಪಡೆಯಲು ನಿಮ್ಮ ಕೃಷಿ ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ಜಿಲ್ಲೆ ಮತ್ತು ತಾಲೂಕನ್ನು ಆಯ್ಕೆ ಮಾಡಿ."
          : "Please select your district and taluk in your Farm Profile to view live local weather."
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data } = await api.get("/weather/forecast", {
        params: { district: farmer.district, taluk: farmer.taluk }
      });
      setWeather(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmer, language]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  if (loading) return <Loading label={language === "kn" ? "ಹವಾಮಾನ ಮಾಹಿತಿಯನ್ನು ಪಡೆಯಲಾಗುತ್ತಿದೆ…" : "Retrieving live weather from Open-Meteo…"} />;

  return (
    <>
      <PageTitle
        eyebrow={language === "kn" ? "ಹವಾಮಾನ ವರದಿ" : "LIVE WEATHER DASHBOARD"}
        title={weather?.available ? `${weather.location} ${language === "kn" ? "ಹವಾಮಾನ" : "Weather"}` : (language === "kn" ? "ಹವಾಮಾನ ವರದಿ" : "Your Weather Report")}
        detail={language === "kn"
          ? "ಓಪನ್-ಮೆಟಿಯೊ ಉಪಗ್ರಹ ಮತ್ತು ಮುನ್ಸೂಚನೆ ಮಾದರಿಗಳಿಂದ ಲೈವ್ ಹವಾಮಾನ. ಹೊಲದ ಕೆಲಸಕ್ಕೆ ಮುನ್ನ ಸ್ಥಳೀಯ ಪರಿಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ."
          : "Real-time observations and 7-day forecast powered by Open-Meteo. Use actual field observations before field operations."}
        action={
          <button
            className="button button-outline"
            onClick={() => fetchWeather(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "spin-icon" : ""} />
            {refreshing ? (language === "kn" ? "ನವೀಕರಿಸಲಾಗುತ್ತಿದೆ…" : "Updating…") : (language === "kn" ? "ಹವಾಮಾನ ನವೀಕರಿಸಿ" : "Refresh Forecast")}
          </button>
        }
      />

      {error && <Notice kind="warning">{error}</Notice>}

      {!weather?.available ? (
        <div className="panel blank-panel">
          <CloudSun size={52} className="muted" />
          <h2>{language === "kn" ? "ಹವಾಮಾನ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ" : "Weather Location Not Connected"}</h2>
          <p>{weather?.reason || "Complete your farm profile to view local weather."}</p>
          <Link to="/app/profile" className="button button-primary" style={{ marginTop: 14 }}>
            <Settings size={17} /> {language === "kn" ? "ಜಿಲ್ಲೆ & ತಾಲೂಕು ಸೇರಿಸಿ" : "Set Farm District & Taluk"}
          </Link>
        </div>
      ) : (
        <>
          <div className="weather-summary-container">
            <div className="panel weather-main-card">
              <div className="weather-card-header">
                <span className="eyebrow">CURRENT OBSERVATION</span>
                <span className="live-pill"><span className="live-dot" /> LIVE</span>
              </div>
              <div className="weather-loc-title">
                <h2>{weather.location}</h2>
                <small className="muted">Lat: {weather.coordinates?.lat?.toFixed(2)}°, Lon: {weather.coordinates?.lon?.toFixed(2)}°</small>
              </div>

              <div className="current-temp-hero">
                <div className="temp-display">
                  <span className="temp-number">{Math.round(weather.current.temperature_2m)}°C</span>
                  <span className="temp-feels">Feels like {Math.round(weather.current.apparent_temperature)}°C</span>
                </div>
                <div className="weather-glyph-big">
                  {weather.current.precipitation > 0 ? "🌧️" : weather.current.temperature_2m > 30 ? "☀️" : "⛅"}
                </div>
              </div>

              <div className="weather-stats-quad">
                <div className="quad-item">
                  <span className="quad-label"><Droplets size={16} /> Rainfall Now</span>
                  <b className="quad-val">{weather.current.precipitation} mm</b>
                </div>
                <div className="quad-item">
                  <span className="quad-label"><CloudSun size={16} /> Humidity</span>
                  <b className="quad-val">{weather.current.relative_humidity_2m}%</b>
                </div>
                <div className="quad-item">
                  <span className="quad-label"><Wind size={16} /> Wind Speed</span>
                  <b className="quad-val">{weather.current.wind_speed_10m} km/h</b>
                </div>
                <div className="quad-item">
                  <span className="quad-label"><Clock size={16} /> Last Updated</span>
                  <b className="quad-val">{new Date(weather.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>
                </div>
              </div>
            </div>

            <div className="panel weather-advisory-card">
              <span className="eyebrow">FARMING ADVISORY & FORECAST TRENDS</span>
              <h3>Expected Rainfall & Temperature Changes</h3>

              <div className="trend-bullet-box">
                <div className="trend-row">
                  <span className="trend-icon">🌧️</span>
                  <div>
                    <b>Rainfall Outlook: {weather.summary?.totalWeeklyRain} mm expected this week</b>
                    <p>{weather.summary?.rainAlert}</p>
                    <small className="muted">Max rain probability: {weather.summary?.maxRainChance}% over {weather.summary?.rainyDaysCount} wet day(s).</small>
                  </div>
                </div>

                <div className="trend-row" style={{ marginTop: 14 }}>
                  <span className="trend-icon">🌡️</span>
                  <div>
                    <b>Temperature Trend</b>
                    <p>{weather.summary?.tempTrend}</p>
                    <small className="muted">7-day average daytime maximum: {weather.summary?.weekAvgMaxTemp}°C.</small>
                  </div>
                </div>
              </div>

              <div className="weather-update-footer">
                <small className="muted">
                  <ShieldCheck size={14} /> Data Source: {weather.source} · Updated {new Date(weather.fetchedAt).toLocaleDateString()} {new Date(weather.fetchedAt).toLocaleTimeString()}
                </small>
              </div>
            </div>
          </div>

          <section className="panel forecast-section-card">
            <div className="section-top" style={{ marginBottom: 16 }}>
              <div>
                <span className="eyebrow">SEVEN-DAY OUTLOOK</span>
                <h2>7-Day Weather Forecast</h2>
              </div>
              <span className="source-tag">Open-Meteo · 7 Days</span>
            </div>

            <div className="forecast-grid-seven">
              {weather.daily.time.map((day, i) => (
                <div className="forecast-day-card" key={day}>
                  <b className="day-name">{new Date(day).toLocaleDateString(language === "kn" ? "kn" : "en", { weekday: "short" })}</b>
                  <span className="day-date">{new Date(day).toLocaleDateString(language === "kn" ? "kn" : "en", { month: "short", day: "numeric" })}</span>
                  <div className="day-weather-icon">
                    {weather.daily.precipitation_probability_max[i] > 50 || weather.daily.precipitation_sum[i] > 2 ? "🌧️" : weather.daily.temperature_2m_max[i] > 31 ? "☀️" : "⛅"}
                  </div>
                  <div className="day-temps">
                    <span className="temp-high">{Math.round(weather.daily.temperature_2m_max[i])}°</span>
                    <span className="temp-low">{Math.round(weather.daily.temperature_2m_min[i])}°</span>
                  </div>
                  <div className="day-rain-info">
                    <span><Droplets size={14} /> {weather.daily.precipitation_sum[i]} mm</span>
                    <small>{weather.daily.precipitation_probability_max[i] ?? 0}% rain</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}

// ==========================================
// MARKET PRICES PAGE
// ==========================================
function MarketPage() {
  const { farmer, language } = useApp();
  const [marketData, setMarketData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [cropSearch, setCropSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState(farmer?.district || "all");
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const loadMarket = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/market/trends", {
        params: {
          crop: cropSearch || undefined,
          district: selectedDistrict !== "all" ? selectedDistrict : undefined,
          market: selectedMarket !== "all" ? selectedMarket : undefined,
          category: selectedCategory !== "all" ? selectedCategory : undefined
        }
      });
      setMarketData(data);
    } catch (err) {
      setMarketData(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cropSearch, selectedDistrict, selectedMarket, selectedCategory]);

  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  return (
    <>
      <PageTitle
        eyebrow={language === "kn" ? "ಮಾರುಕಟ್ಟೆ ಧಾರಣೆ" : "AGRICULTURAL MARKET WATCH"}
        title={language === "kn" ? "ಕರ್ನಾಟಕ ಮಂಡಿ ದರಗಳು" : "Karnataka Mandi Prices"}
        detail={language === "kn"
          ? "ಲಭ್ಯವಿದ್ದರೆ ನೈಜ ಮಾರುಕಟ್ಟೆ ದರಗಳನ್ನು ನೋಡಿ; ಡೆಮೋ ಮೌಲ್ಯಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಗುರುತಿಸಲಾಗುತ್ತದೆ."
          : "Compare market prices across Karnataka. Demo values are clearly identified and are never presented as live quotes."}
        action={
          <button
            className="button button-outline"
            onClick={() => loadMarket(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "spin-icon" : ""} />
            {refreshing ? (language === "kn" ? "ನವೀಕರಿಸಲಾಗುತ್ತಿದೆ…" : "Updating…") : (language === "kn" ? "ದರಗಳನ್ನು ನವೀಕರಿಸಿ" : "Refresh Prices")}
          </button>
        }
      />

      {/* Live vs demo status banner */}
      {marketData && (
        <div className={`panel market-status-banner ${marketData.isLive ? "status-live" : "status-demo"}`}>
          <div className="status-indicator">
            <span className={`status-dot ${marketData.isLive ? "dot-live" : "dot-demo"}`} />
            <b>{marketData.statusLabel || (marketData.isLive ? "Live market feed" : "Demo data — not live market prices")}</b>
          </div>
          <p className="status-desc">
            {marketData.isLive
              ? "Connected to the configured live market feed."
              : (marketData.sampleNotice || "Showing demonstration values only; these prices are not verified or live.")}
          </p>
          <small className="muted">Source: {marketData.source || "Not provided"} · Updated: {marketData.fetchedAt ? new Date(marketData.fetchedAt).toLocaleString() : "Unavailable"}</small>
        </div>
      )}

      {/* Interactive Filter Bar */}
      <div className="panel market-filter-box">
        <div className="filter-inputs-grid">
          <label className="search-field">
            <Search size={18} />
            <input
              placeholder={language === "kn" ? "ಬೆಳೆ ಅಥವಾ ತರಕಾರಿ ಹುಡುಕಿ (ಉದಾ: Ragi, Maize, Tomato)…" : "Search crop or vegetable (e.g. Ragi, Maize, Tomato)…"}
              value={cropSearch}
              onChange={(e) => setCropSearch(e.target.value)}
            />
          </label>

          <label className="filter-select-label">
            <span>District</span>
            <select value={selectedDistrict} onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedMarket("all"); }}>
              <option value="all">All Karnataka Districts</option>
              {marketData?.availableDistricts?.map((dist) => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </label>

          <label className="filter-select-label">
            <span>Market / Mandi</span>
            <select value={selectedMarket} onChange={(e) => setSelectedMarket(e.target.value)}>
              <option value="all">All APMC Mandis</option>
              {marketData?.availableMarkets?.map((mkt) => (
                <option key={mkt} value={mkt}>{mkt}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="category-pills-row">
          <span className="pills-label">Category:</span>
          {["all", "Cereals & Millets", "Pulses", "Oilseeds", "Vegetables", "Commercial"].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pill-btn ${selectedCategory === cat ? "pill-active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {error && <Notice kind="warning">{error}</Notice>}

      {/* Historical Price Chart */}
      {marketData?.trends && marketData.trends.length > 1 && (
        <section className="panel market-chart-card">
          <div className="section-top" style={{ marginBottom: 14 }}>
            <div>
              <span className="eyebrow">PRICE MOVEMENT OVER TIME</span>
              <h2>{marketData.selectedCrop || "Commodity"} Modal Price Trends</h2>
              <p className="muted">Historical daily mandi modal prices per quintal (₹ / q).</p>
            </div>
            <span className="source-tag">{marketData.source}</span>
          </div>

          <div className="chart-wrap" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marketData.trends.map((t) => ({ date: new Date(t.date).toLocaleDateString("en", { month: "short", day: "numeric" }), price: t.modalPrice, market: t.market }))}>
                <defs>
                  <linearGradient id="mandiPriceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#558149" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#558149" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="date" tick={{ fontSize: 13, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 13, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")} / quintal`, "Modal Price"]}
                  contentStyle={{ background: "var(--surface)", borderColor: "var(--line)", borderRadius: 10, fontSize: 14 }}
                />
                <Area type="monotone" dataKey="price" stroke="#48723c" strokeWidth={3} fill="url(#mandiPriceGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Price Comparison Between Markets */}
      {marketData?.comparison && marketData.comparison.length > 1 && (
        <section className="panel market-compare-card">
          <div className="section-top" style={{ marginBottom: 14 }}>
            <div>
              <span className="eyebrow">CROSS-MANDI PRICE COMPARISON</span>
              <h2>Compare {marketData.selectedCrop || cropSearch || "Crop"} Across Mandis</h2>
              <p className="muted">Find which market offers the highest modal price for your produce.</p>
            </div>
          </div>

          <div className="compare-cards-grid">
            {marketData.comparison.map((item, idx) => (
              <div className={`compare-card ${idx === 0 ? "best-price-card" : ""}`} key={`${item.market}-${idx}`}>
                {idx === 0 && <span className="best-tag">🏆 Highest Price</span>}
                <b>{item.market}</b>
                <span className="compare-district">{item.district}</span>
                <div className="compare-modal-price">{formatMoney(item.modalPrice)} <small>/ q</small></div>
                <div className="compare-range">Range: {formatMoney(item.minPrice)} – {formatMoney(item.maxPrice)}</div>
                <small className="muted">{new Date(item.date).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detailed Mandi Table */}
      {loading ? (
        <Loading label={language === "kn" ? "ಮಾರುಕಟ್ಟೆ ದರಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…" : "Loading market price data…"} />
      ) : marketData?.prices?.length ? (
        <div className="panel market-table-panel">
          <div className="table-scroll">
            <table className="mandi-table">
              <thead>
                <tr>
                  <th>Crop / Vegetable</th>
                  <th>Market / Mandi</th>
                  <th>District</th>
                  <th>Min Price</th>
                  <th>Max Price</th>
                  <th>Modal Price</th>
                  <th>Market Date</th>
                  <th>Data Source</th>
                </tr>
              </thead>
              <tbody>
                {marketData.prices.map((row, i) => (
                  <tr key={`${row.crop}-${row.market}-${row.date}-${i}`}>
                    <td>
                      <div className="crop-cell-title">
                        <b>{row.crop}</b>
                        {row.category && <span className="cat-badge">{row.category}</span>}
                      </div>
                    </td>
                    <td><b>{row.market}</b></td>
                    <td>{row.district}</td>
                    <td className="price-muted">{formatMoney(row.minPrice)}</td>
                    <td className="price-muted">{formatMoney(row.maxPrice)}</td>
                    <td className="modal-price-cell">
                      <strong>{formatMoney(row.modalPrice)}</strong>
                      <small className="muted"> / quintal</small>
                    </td>
                    <td>{new Date(row.date).toLocaleDateString()}</td>
                    <td><span className="source-badge">{row.source || marketData.source || "Not provided"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="panel blank-panel">
          <TrendingUp size={48} className="muted" />
          <h3>No mandi prices found</h3>
          <p>No price records match the selected crop, district, or category filter.</p>
          <button
            type="button"
            className="button button-outline"
            onClick={() => { setCropSearch(""); setSelectedDistrict("all"); setSelectedMarket("all"); setSelectedCategory("all"); }}
            style={{ marginTop: 12 }}
          >
            Clear All Filters
          </button>
        </div>
      )}
    </>
  );
}

// ==========================================
// CROP CALENDAR PAGE
// ==========================================
function CalendarPage() {
  const [calendar, setCalendar] = useState([]);
  const [selected, setSelected] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("year");

  useEffect(() => {
    api.get("/calendar")
      .then(({ data }) => setCalendar(data.months))
      .catch(() => setCalendar([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading label="Opening your crop calendar…" />;

  const active = calendar.find((item) => item.month === selected);
  const season = selected >= 6 && selected <= 9 ? "Kharif" : selected >= 10 || selected <= 2 ? "Rabi" : "Summer";

  return (
    <>
      <PageTitle
        eyebrow="CROP CALENDAR"
        title="A year of thoughtful planning."
        detail="General month-by-month prompts to help plan ahead. Local sowing windows can differ."
        action={
          <div className="segmented-control">
            <button className={view === "year" ? "segment-active" : ""} onClick={() => setView("year")}>Year view</button>
            <button className={view === "month" ? "segment-active" : ""} onClick={() => setView("month")}>Month view</button>
          </div>
        }
      />
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="section-top">
            <div>
              <span className="eyebrow">2026 · GENERAL PLANNING</span>
              <h2>{view === "year" ? "Your year at a glance" : `${active?.name || ""} plan`}</h2>
            </div>
            <div className="season-pill">{season} season</div>
          </div>
          <div className={`month-grid ${view === "month" ? "month-grid-focus" : ""}`}>
            {calendar.map((item) => (
              <button
                key={item.month}
                className={`month-tile ${item.month === selected ? "month-selected" : ""} ${item.month === new Date().getMonth() + 1 ? "month-current" : ""}`}
                onClick={() => setSelected(item.month)}
              >
                <span className="month-number">{String(item.month).padStart(2, "0")}</span>
                <b>{item.name}</b>
                <span className="month-crops">{item.crops.length ? `${item.crops.length} crop options` : "Planning"}</span>
                <span className="month-dots">{item.crops.slice(0, 3).map((_, i) => <i key={i} />)}</span>
              </button>
            ))}
          </div>
          <div className="calendar-legend">
            <span><i className="legend-dot green-dot" /> General sowing window</span>
            <span><i className="legend-dot yellow-dot" /> Current month</span>
          </div>
        </section>

        <aside className="panel month-detail">
          <span className="eyebrow">MONTHLY FIELD NOTES</span>
          <div className="detail-month">{active?.name}</div>
          <div className="season-label">{season} · General reference</div>
          <h3>Activities to consider</h3>
          <ul className="activity-list">
            {(active?.activities || []).map((activity, index) => (
              <li key={activity}>
                <span className="activity-check">{String(index + 1).padStart(2, "0")}</span>{activity}
              </li>
            ))}
          </ul>
          <h3>Reference crops to explore</h3>
          <div className="calendar-crop-tags">
            {active?.crops.length ? (
              active.crops.map((crop) => <span key={crop}>{crop}</span>)
            ) : (
              <span className="muted">No general sowing window listed.</span>
            )}
          </div>
          <div className="calendar-caution"><CircleHelp size={15} /> Always confirm local timing with an agricultural officer.</div>
          <Link to="/app/recommendations" className="button button-outline button-full">Explore suitable crops <ArrowRight size={15} /></Link>
        </aside>
      </div>
    </>
  );
}

// ==========================================
// CROP PROTECTION PAGE
// ==========================================
function ProtectionPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const monthLabel = new Date(2026, month - 1, 1).toLocaleString("en", { month: "long" });

  const guides = [
    { crop: "Cereals & millets", pest: "Stem borer and leaf-feeding insects", symptoms: "Look for damaged leaves, dead central shoots or visible larvae.", prevention: "Inspect fields regularly, manage crop residues and maintain field hygiene." },
    { crop: "Pulses", pest: "Pod borer and sap-feeding insects", symptoms: "Check for holes in pods, damaged flowers or curling leaves.", prevention: "Scout plants and record damage. Encourage beneficial insects and avoid unnecessary spraying." },
    { crop: "Groundnut", pest: "Leaf spots and defoliating caterpillars", symptoms: "Watch for unusual leaf spots or feeding damage.", prevention: "Use healthy seed and regular monitoring; ask local KVK to confirm disease before treatment." },
    { crop: "Cotton", pest: "Sucking pests and bollworm complex", symptoms: "Look for curled leaves, sticky residue or damaged bolls.", prevention: "Monitor at regular intervals and apply integrated pest management." }
  ];

  return (
    <>
      <PageTitle
        eyebrow="CROP PROTECTION"
        title="Notice early. Protect wisely."
        detail="General preventive guidance—not a confirmed diagnosis. Similar symptoms can have different causes."
        action={
          <Link to="/app/assistant" className="button button-outline">
            <MessageCircle size={15} /> Ask a question
          </Link>
        }
      />
      <Notice kind="warning">
        <b>Safety first.</b> Do not use a pesticide based only on an image or this general guide. Confirm the pest with an agricultural expert and follow the registered product label.
      </Notice>
      <div className="panel protection-month">
        <div>
          <span className="eyebrow">MONTHLY FIELD CHECK</span>
          <h2>Protection reminders for {monthLabel}</h2>
          <p>Review the crop's current growth stage, scout regularly, record new symptoms and ask for local advice before treatment.</p>
        </div>
        <label>
          Select month
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>{new Date(2026, index, 1).toLocaleString("en", { month: "long" })}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="protection-grid">
        {guides.map((guide) => (
          <article className="panel protection-card" key={guide.crop}>
            <div className="protection-card-top">
              <span className="protection-crop-icon"><Leaf size={18} /></span>
              <span className="generic-tag">GENERAL GUIDE</span>
            </div>
            <h3>{guide.crop}</h3>
            <span className="pest-label">Pests / issues to monitor</span>
            <b>{guide.pest}</b>
            <div className="protection-block"><span>What to look for</span><p>{guide.symptoms}</p></div>
            <div className="protection-block"><span>Prevention & IPM</span><p>{guide.prevention}</p></div>
            <Link className="text-button" to="/app/assistant">Ask the assistant <ArrowRight size={14} /></Link>
          </article>
        ))}
      </div>
    </>
  );
}

// ==========================================
// ASSISTANT PAGE
// ==========================================
function AssistantPage() {
  const { farmer, language } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);

  const defaultGreeting = useMemo(() => ({
    role: "assistant",
    content: language === "kn"
      ? "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ 'ನಮ್ಮ ಕೃಷಿ' ಕೃಷಿ ಸಹಾಯಕ. ಬೆಳೆ ಆಯ್ಕೆ, ಇಂದಿನ ಹವಾಮಾನ, ಮಾರುಕಟ್ಟೆ ಮಂಡಿ ದರಗಳು, ಇಳುವರಿ ಮತ್ತು ಲಾಭದ ಲೆಕ್ಕಾಚಾರ ಅಥವಾ ಕೀಟ ರೋಗಗಳ ಬಗ್ಗೆ ನೀವು ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಬಹುದು."
      : "Hello! I am your Namma Krishi agricultural assistant. Ask me about crop selection, weather advisories, mandi market prices, yield & profit calculation, or pest protection.",
    mode: "knowledge-engine"
  }), [language]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setError("");
    try {
      const { data } = await api.get("/assistant/history");
      if (data.messages?.length) {
        setMessages(data.messages.map(({ role, content, mode }) => ({ role, content, mode })));
      } else {
        setMessages([defaultGreeting]);
      }
    } catch (err) {
      setError(errorMessage(err));
      setMessages([defaultGreeting]);
    } finally {
      setHistoryLoading(false);
    }
  }, [defaultGreeting]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const clearHistory = async () => {
    if (!window.confirm(language === "kn" ? "ಚಾಟ್ ಇತಿಹಾಸವನ್ನು ಅಳಿಸಲು ನೀವು ಖಚಿತವಾಗಿದ್ದೀರಾ?" : "Are you sure you want to clear your conversation history?")) return;
    setClearing(true);
    try {
      await api.delete("/assistant/history");
      setMessages([defaultGreeting]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setClearing(false);
    }
  };

  const send = async (text = input) => {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setError("");
    setMessages((items) => [...items, { role: "user", content: question }]);
    setBusy(true);

    try {
      const { data } = await api.post("/assistant/chat", {
        message: question,
        language,
        season: new Date().getMonth() >= 5 && new Date().getMonth() <= 8 ? "Kharif" : "Rabi"
      });
      setMessages((items) => [...items, { role: "assistant", content: data.text, mode: data.mode }]);
    } catch (reason) {
      setError(errorMessage(reason));
      setMessages((items) => items.filter((_, index) => index !== items.length - 1));
      setInput(question);
    } finally {
      setBusy(false);
    }
  };

  const suggestionsList = language === "kn" ? [
    "ನನ್ನ ಮಣ್ಣಿಗೆ ಯಾವ ಬೆಳೆ ಸೂಕ್ತ?",
    "ಇಂದಿನ ಹವಾಮಾನ ಮತ್ತು ಬಿತ್ತನೆ ಸಲಹೆ ಏನು?",
    "ರಾಗಿ ಮತ್ತು ಮುಸುಕಿನ ಜೋಳದ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಎಷ್ಟು?",
    "ಬೆಳೆ ಇಳುವರಿ ಮತ್ತು ಲಾಭ ಹೇಗೆ ಲೆಕ್ಕ ಹಾಕಬೇಕು?",
    "ಮುಸುಕಿನ ಜೋಳದ ಸೈನಿಕ ಹುಳು ನಿಯಂತ್ರಣ ಹೇಗೆ?"
  ] : [
    "Which crops suit my soil and water best?",
    "What is today's weather and sowing advice?",
    "What are the latest mandi prices for Ragi and Maize?",
    "How to calculate crop yield & net profit?",
    "How to protect Maize from Fall Armyworm?"
  ];

  return (
    <>
      <PageTitle
        eyebrow={language === "kn" ? "ನಮ್ಮ ಕೃಷಿ AI ಸಹಾಯಕ" : "NAMMA KRISHI ASSISTANT"}
        title={language === "kn" ? "ನಿಮ್ಮ ವಿಶ್ವಾಸಾರ್ಹ ಡಿಜಿಟಲ್ ಕೃಷಿ ಮಿತ್ರ" : "A knowledgeable voice in your corner."}
        detail={language === "kn"
          ? "ಬೆಳೆ ಆಯ್ಕೆ, ಹವಾಮಾನ, ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು, ಇಳುವರಿ ಲೆಕ್ಕ ಮತ್ತು ಕೀಟ ನಿರ್ವಹಣೆಯ ಬಗ್ಗೆ ನೈಜ ಮತ್ತು ಪ್ರಾಮಾಣಿಕ ಸಲಹೆ ಪಡೆಯಿರಿ."
          : "Ask questions on crop selection, weather advisories, mandi prices, yield & profit calculation, or pest protection."}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={clearHistory}
              disabled={clearing || messages.length <= 1}
              title="Clear chat history"
            >
              <Clock size={14} /> {language === "kn" ? "ಇತಿಹಾಸ ಅಳಿಸಿ" : "Clear Chat"}
            </button>
            <div className="ai-status"><span /> {language === "kn" ? "ಸಹಾಯಕ ಸಿದ್ಧವಾಗಿದೆ" : "Assistant ready"}</div>
          </div>
        }
      />

      <div className="assistant-page-layout">
        <div className="assistant-conversation">
          <div className="chat-context">
            <div className="context-icon"><Leaf size={20} /></div>
            <div>
              <b>{language === "kn" ? "ನಿಮ್ಮ ಹೊಲದ ವಿವರಗಳು" : "Your farm context"}</b>
              <span>
                {farmer?.district
                  ? `${farmer.village ? `${farmer.village}, ` : ""}${farmer.taluk}, ${farmer.district} · ${farmer.soils?.join(", ") || "soil not set"} · ${farmer.waterAvailability} water`
                  : (language === "kn" ? "ಹೆಚ್ಚು ನಿಖರ ಸಲಹೆಗಾಗಿ ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ" : "Complete your farm profile for tailored answers")}
              </span>
            </div>
            <Link to="/app/profile" aria-label="Edit farm profile"><Settings size={18} /></Link>
          </div>

          {historyLoading ? (
            <Loading label={language === "kn" ? "ಹಿಂದಿನ ಸಂಭಾಷಣೆಯನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…" : "Loading conversation history…"} />
          ) : (
            <div className="chat-messages">
              {messages.map((message, index) => (
                <div className={`chat-row ${message.role === "user" ? "chat-user-row" : ""}`} key={`${index}-${message.role}`}>
                  <div className={`chat-avatar ${message.role === "user" ? "chat-user-avatar" : ""}`}>
                    {message.role === "user" ? (
                      <FarmerAvatar photoUrl={farmer?.photoUrl} name={farmer?.name} size={32} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </div>
                  <div className="chat-bubble-wrap">
                    <div className={`chat-bubble ${message.role === "user" ? "user-bubble" : ""}`}>
                      {message.content}
                    </div>
                    {message.role === "assistant" && (
                      <span className="chat-mode">
                        {message.mode === "ai"
                          ? "🤖 Live AI Response · Verified with Namma Krishi agronomy rules"
                          : "🌾 Namma Krishi Agricultural Engine"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="chat-row">
                  <div className="chat-avatar"><Sparkles size={18} /></div>
                  <div className="chat-bubble typing">
                    <span style={{ fontSize: 13, marginRight: 8 }}>
                      {language === "kn" ? "ನಮ್ಮ ಕೃಷಿ AI ಉತ್ತರಿಸುತ್ತಿದೆ…" : "Namma Krishi AI is generating advice…"}
                    </span>
                    <i /><i /><i />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="chat-suggestions">
            {suggestionsList.map((item) => (
              <button key={item} onClick={() => send(item)} disabled={busy}>
                {item} <ArrowUpRight size={14} />
              </button>
            ))}
          </div>

          <form className="chat-input-form" onSubmit={(event) => { event.preventDefault(); send(); }}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={1000}
              placeholder={language === "kn" ? "ಬೆಳೆ, ಬೆಲೆ, ಹವಾಮಾನ, ಲಾಭ ಅಥವಾ ಕೀಟಗಳ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಕೇಳಿ…" : "Ask about crop choice, mandi price, weather, profit calculation, or pests…"}
              aria-label="Your question"
              disabled={busy}
            />
            <button className="button button-primary" disabled={busy || !input.trim()} aria-label="Send message">
              <ArrowRight size={18} />
            </button>
          </form>

          {error && (
            <Notice kind="error">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => send(input)}
                className="text-button"
                style={{ marginLeft: 12, textDecoration: "underline" }}
              >
                Retry
              </button>
            </Notice>
          )}
          <div className="chat-disclaimer">
            ⚠️ Namma Krishi advisory engine provides reference agronomic estimates. Confirm critical chemical doses and sowing dates with your local Raitha Samparka Kendra (RSK).
          </div>
        </div>

        <aside className="assistant-side">
          <div className="assistant-side-icon"><Sparkles size={24} /></div>
          <span className="eyebrow">{language === "kn" ? "ಸಹಾಯ ಕೇಂದ್ರ" : "TOPICS YOU CAN ASK"}</span>
          <h3>{language === "kn" ? "ರೈತರ ಪ್ರಶ್ನೆಗಳಿಗೆ ನೇರ ಉತ್ತರ" : "Comprehensive Agricultural Guidance"}</h3>
          <p>
            {language === "kn"
              ? "ನಿಮ್ಮ ಮಣ್ಣಿನ ಪ್ರಕಾರ, ಹವಾಮಾನ, ಮಾರುಕಟ್ಟೆ ಮಂಡಿ ದರಗಳು ಮತ್ತು ಕೀಟ ನಿರ್ವಹಣೆಯ ಬಗ್ಗೆ ನೇರವಾಗಿ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ."
              : "Ask our assistant anything regarding seasonal crops, weather precautions, mandi quotes, profit math, and pest management."}
          </p>
          <div className="assistant-prompts">
            <span><Check size={16} /> <b>Crop Selection:</b> Soil & water matching</span>
            <span><Check size={16} /> <b>Weather Advisory:</b> Live Open-Meteo alerts</span>
            <span><Check size={16} /> <b>Mandi Rates:</b> Verified Karnataka APMC benchmarks</span>
            <span><Check size={16} /> <b>Yield & Profit:</b> Gross Revenue & Net Profit formulas</span>
            <span><Check size={16} /> <b>Pest Protection:</b> Integrated IPM & organic solutions</span>
            <span><Check size={16} /> <b>Bilingual:</b> Supports Kannada (ಕನ್ನಡ) & English</span>
          </div>
        </aside>
      </div>
    </>
  );
}

// ==========================================
// SAVED PLANS PAGE
// ==========================================
function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get("/plans")
      .then(({ data }) => setPlans(data.plans))
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    try {
      await api.delete(`/plans/${id}`);
      setPlans((items) => items.filter((plan) => (plan._id || plan.id) !== id));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="YOUR SAVED PLANS"
        title="Ideas worth keeping."
        detail="Your saved crop shortlists and diversification plans are right here when you need them."
        action={
          <Link to="/app/recommendations" className="button button-primary">
            <Plus size={16} /> Explore crops
          </Link>
        }
      />
      {error && <Notice kind="error">{error}</Notice>}
      {loading ? (
        <Loading />
      ) : plans.length ? (
        <div className="plans-grid">
          {plans.map((plan) => (
            <article className="panel plan-card" key={plan._id || plan.id}>
              <div className="plan-icon"><Wheat size={19} /></div>
              <button className="icon-button plan-delete" title="Delete plan" onClick={() => remove(plan._id || plan.id)}>
                <X size={16} />
              </button>
              <span className="eyebrow">{plan.season || "Season plan"}</span>
              <h3>{plan.name}</h3>
              <div className="calendar-crop-tags">
                {plan.crops?.map((crop) => <span key={crop}>{crop}</span>)}
              </div>
              <div className="plan-meta">
                <span><Flower2 size={14} /> {plan.area || 1} acre</span>
                <span>Saved {new Date(plan.createdAt).toLocaleDateString()}</span>
              </div>
              <Link to="/app/simulator" state={{ crops: plan.crops }} className="button button-outline button-small" style={{ marginTop: 12, width: "100%" }}>
                Continue working on this plan <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel blank-panel">
          <div className="empty-market-icon"><Leaf size={23} /></div>
          <h2>Your next plan starts with an idea.</h2>
          <p>Save crop options from your shortlist to come back to them later and simulate returns.</p>
          <Link to="/app/recommendations" className="button button-primary">
            Explore recommendations <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </>
  );
}

// ==========================================
// FARM PROFILE PAGE
// ==========================================
function ProfilePage() {
  const { farmer, setFarmer, language, setLanguage } = useApp();
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [form, setForm] = useState({
    name: "",
    districtId: "",
    talukId: "",
    village: "",
    soils: [],
    landArea: 1,
    waterAvailability: "medium",
    soilPh: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get("/locations/districts")
      .then(({ data }) => setDistricts(data.districts))
      .catch((reason) => setError(errorMessage(reason)));
  }, []);

  useEffect(() => {
    if (!form.districtId) {
      setTaluks([]);
      return;
    }
    api.get(`/locations/districts/${form.districtId}/taluks`)
      .then(({ data }) => setTaluks(data.taluks))
      .catch((reason) => setError(errorMessage(reason)));
  }, [form.districtId]);

  useEffect(() => {
    if (farmer && districts.length) {
      setForm({
        name: farmer.name || "",
        districtId: farmer.districtId || "",
        talukId: farmer.talukId || "",
        village: farmer.village || "",
        soils: farmer.soils || [],
        landArea: farmer.landArea || 1,
        waterAvailability: farmer.waterAvailability || "medium",
        soilPh: farmer.soilPh ?? ""
      });
    }
  }, [farmer, districts]);

  const toggleSoil = (soil) =>
    setForm((value) => ({
      ...value,
      soils: value.soils.includes(soil) ? value.soils.filter((item) => item !== soil) : [...value.soils, soil]
    }));

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5 MB.");
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    const data = new FormData();
    data.append("photo", file);

    try {
      const res = await api.post("/farmers/profile/photo", data);
      setFarmer(res.data.farmer);
      setSuccess(language === "kn" ? "ಪ್ರೊಫೈಲ್ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಆಗಿದೆ." : "Profile photo uploaded successfully.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await api.put("/farmers/profile", { ...form, language });
      setFarmer(data.farmer);
      setSuccess(
        language === "kn"
          ? "ನಿಮ್ಮ ಕೃಷಿ ವಿವರಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ."
          : data.persistent === false
          ? "Your profile was saved for this demo session."
          : "Your farm profile is saved successfully to MongoDB."
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  // Missing details check
  const missingItems = [];
  if (!form.village) missingItems.push(language === "kn" ? "ಗ್ರಾಮ" : "village");
  if (!form.soils.length) missingItems.push(language === "kn" ? "ಮಣ್ಣಿನ ಪ್ರಕಾರ" : "soil types");
  if (!form.landArea) missingItems.push(language === "kn" ? "ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ" : "farm size");

  return (
    <>
      <PageTitle
        eyebrow={language === "kn" ? "ರೈತರ ಪ್ರೊಫೈಲ್" : "FARM PROFILE & SETTINGS"}
        title={language === "kn" ? "ನಿಮ್ಮ ಕೃಷಿ ವಿವರಗಳು" : "Your farm, your starting point."}
        detail={
          language === "kn"
            ? "ನಿಮ್ಮ ಹೆಸರು, ಮೊಬೈಲ್, ಜಾಗ, ಮಣ್ಣು ಮತ್ತು ನೀರಿನ ವಿವರಗಳನ್ನು ಇಲ್ಲಿ ನವೀಕರಿಸಿ."
            : "Keep your farm details updated to receive relevant crop shortlists and advisory."
        }
      />

      {missingItems.length > 0 && (
        <Notice kind="warning">
          <b>{language === "kn" ? "ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ:" : "Complete your profile:"}</b>{" "}
          {language === "kn"
            ? `ಉತ್ತಮ ಬೆಳೆ ಶಿಫಾರಸುಗಳಿಗಾಗಿ ದಯವಿಟ್ಟು ${missingItems.join(", ")} ನಮೂದಿಸಿ.`
            : `Please provide your ${missingItems.join(", ")} to get higher-accuracy crop recommendations.`}
        </Notice>
      )}

      {success && <Notice kind="success">{success}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <form className="profile-layout" onSubmit={save}>
        <div className="profile-main">
          {/* Photo Upload Section */}
          <section className="panel profile-section">
            <div className="profile-section-title">
              <span className="section-icon"><User size={17} /></span>
              <div>
                <h2>{language === "kn" ? "ಪ್ರೊಫೈಲ್ ಫೋಟೋ" : "Profile Photo"}</h2>
                <p>{language === "kn" ? "ನಿಮ್ಮ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಅಥವಾ ಬದಲಾಯಿಸಿ." : "Upload or update your farmer profile photo."}</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "10px 0" }}>
              <div style={{ position: "relative" }}>
                <FarmerAvatar photoUrl={farmer?.photoUrl} name={farmer?.name} size={74} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handlePhotoUpload}
                  />
                  <button
                    type="button"
                    className="button button-outline button-small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    <Upload size={14} /> {uploadingPhoto ? (language === "kn" ? "ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ…" : "Uploading…") : (language === "kn" ? "ಫೋಟೋ ಬದಲಾಯಿಸಿ" : "Upload new photo")}
                  </button>
                </div>
                <small className="muted">
                  {language === "kn" ? "JPEG, PNG, WebP ಸ್ವರೂಪ (ಗರಿಷ್ಠ 5 MB)." : "Supported formats: JPEG, PNG, WebP (max 5 MB)."}
                </small>
              </div>
            </div>
          </section>

          {/* Location & Personal Details */}
          <section className="panel profile-section">
            <div className="profile-section-title">
              <span className="section-icon"><Flower2 size={17} /></span>
              <div>
                <h2>{language === "kn" ? "ರೈತರ ವಿವರಗಳು & ಸ್ಥಳ" : "Farmer Details & Location"}</h2>
                <p>{language === "kn" ? "ನಿಮ್ಮ ಹೆಸರು, ಮೊಬೈಲ್ ಮತ್ತು ಜಮೀನಿನ ಸ್ಥಳ." : "We use your location to fetch local weather and regional crop options."}</p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                {language === "kn" ? "ಪೂರ್ಣ ಹೆಸರು" : "Full Name"}
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ramesh Gowda"
                />
              </label>

              <label>
                {language === "kn" ? "ನೋಂದಾಯಿತ ಮೊಬೈಲ್" : "Mobile Number (Login ID)"}
                <input
                  disabled
                  value={farmer?.phone || ""}
                  style={{ background: "var(--surface-soft)", cursor: "not-allowed" }}
                />
              </label>

              <label>
                {language === "kn" ? "ಜಿಲ್ಲೆ" : "District"}
                <select
                  required
                  value={form.districtId}
                  onChange={(event) => setForm({ ...form, districtId: event.target.value, talukId: "" })}
                >
                  <option value="">Select district</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>{district.name}</option>
                  ))}
                </select>
              </label>

              <label>
                {language === "kn" ? "ತಾಲೂಕು" : "Taluk"}
                <select
                  required
                  disabled={!form.districtId}
                  value={form.talukId}
                  onChange={(event) => setForm({ ...form, talukId: event.target.value })}
                >
                  <option value="">Select taluk</option>
                  {taluks.map((taluk) => (
                    <option key={taluk.id} value={taluk.id}>{taluk.name}</option>
                  ))}
                </select>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                {language === "kn" ? "ಗ್ರಾಮ / ಊರು" : "Village / Town"}
                <input
                  value={form.village}
                  onChange={(e) => setForm({ ...form, village: e.target.value })}
                  placeholder="e.g. Byatarayanapura"
                />
              </label>
            </div>
          </section>

          {/* Soil Details */}
          <section className="panel profile-section">
            <div className="profile-section-title">
              <span className="section-icon"><Leaf size={17} /></span>
              <div>
                <h2>{language === "kn" ? "ನಿಮ್ಮ ಮಣ್ಣಿನ ಪ್ರಕಾರ" : "Your Soil"}</h2>
                <p>{language === "kn" ? "ನಿಮ್ಮ ಜಮೀನಿನಲ್ಲಿರುವ ಮಣ್ಣಿನ ಪ್ರಕಾರಗಳನ್ನು ಆರಿಸಿ." : "Select all soil types you have. If unsure, a soil test provides confirmation."}</p>
              </div>
            </div>
            <div className="soil-options">
              {soilOptions.map((soil, index) => (
                <label key={soil} className={`soil-option ${form.soils.includes(soil) ? "soil-option-selected" : ""}`}>
                  <input type="checkbox" checked={form.soils.includes(soil)} onChange={() => toggleSoil(soil)} />
                  <span className={`soil-swatch swatch-${index}`} />
                  <span>
                    <b>{language === "kn" ? kannadaSoilNames[soil] || soil : soil.charAt(0).toUpperCase() + soil.slice(1)}</b>
                    <small>Soil type</small>
                  </span>
                  {form.soils.includes(soil) && <Check size={16} className="soil-check" />}
                </label>
              ))}
            </div>

            <div className="form-grid form-grid-bottom" style={{ marginTop: 15 }}>
              <label>
                Soil pH <span className="optional">{language === "kn" ? "ಐಚ್ಛಿಕ" : "Optional"}</span>
                <input
                  type="number"
                  min="0"
                  max="14"
                  step="0.1"
                  value={form.soilPh}
                  placeholder="e.g. 6.5"
                  onChange={(event) => setForm({ ...form, soilPh: event.target.value })}
                />
                <small className="muted">Leave blank if unknown.</small>
              </label>

              <label>
                {language === "kn" ? "ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ (ಎಕರೆ)" : "Farm Size / Area"} <span className="optional">Required</span>
                <div className="input-unit">
                  <input
                    required
                    type="number"
                    min="0.1"
                    max="100000"
                    step="0.1"
                    value={form.landArea}
                    onChange={(event) => setForm({ ...form, landArea: event.target.value })}
                  />
                  <span>acres</span>
                </div>
              </label>
            </div>
          </section>

          {/* Water Availability */}
          <section className="panel profile-section">
            <div className="profile-section-title">
              <span className="section-icon blue-icon"><Droplets size={17} /></span>
              <div>
                <h2>{language === "kn" ? "ನೀರಿನ ಲಭ್ಯತೆ" : "Water availability"}</h2>
                <p>{language === "kn" ? "ನಿಮ್ಮ ಕೃಷಿಗೆ ಲಭ್ಯವಿರುವ ನೀರಿನ ಮಟ್ಟ." : "Water you can reliably count on throughout the growing season."}</p>
              </div>
            </div>
            <div className="water-options">
              {[
                ["low", "Limited / ಮಳೆ ಆಶ್ರಿತ", "Mostly rainfall or scarce irrigation"],
                ["medium", "Moderate / ಮಧ್ಯಮ ನೀರಾವರಿ", "Some irrigation or borewell available"],
                ["high", "Reliable / ಸಂಪೂರ್ಣ ನೀರಾವರಿ", "Reliable canal or perennial water supply"]
              ].map(([value, name, description]) => (
                <label className={`water-option ${form.waterAvailability === value ? "water-option-selected" : ""}`} key={value}>
                  <input
                    type="radio"
                    name="water"
                    value={value}
                    checked={form.waterAvailability === value}
                    onChange={(event) => setForm({ ...form, waterAvailability: event.target.value })}
                  />
                  <span className="radio-dot" />
                  <span>
                    <b>{name}</b>
                    <small>{description}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Preferences */}
          <section className="panel profile-section">
            <div className="profile-section-title">
              <span className="section-icon"><Settings size={17} /></span>
              <div>
                <h2>{language === "kn" ? "ಭಾಷಾ ಆದ್ಯತೆ" : "Language Preferences"}</h2>
                <p>Choose your preferred language for the Namma Krishi interface.</p>
              </div>
            </div>
            <div className="language-cards">
              <label className={`language-card ${language === "en" ? "language-card-active" : ""}`}>
                <input type="radio" checked={language === "en"} onChange={() => setLanguage("en")} />
                <b>English</b>
                <small>Simple English</small>
              </label>
              <label className={`language-card ${language === "kn" ? "language-card-active" : ""}`}>
                <input type="radio" checked={language === "kn"} onChange={() => setLanguage("kn")} />
                <b>ಕನ್ನಡ</b>
                <small>Kannada</small>
              </label>
            </div>
          </section>
        </div>

        {/* Profile Summary Sidebar */}
        <aside className="profile-aside">
          <div className="panel profile-preview">
            <span className="eyebrow">{language === "kn" ? "ಪ್ರೊಫೈಲ್ ಸಾರಾಂಶ" : "YOUR FARM PROFILE"}</span>
            <div style={{ margin: "14px auto 8px", display: "grid", placeItems: "center" }}>
              <FarmerAvatar photoUrl={farmer?.photoUrl} name={farmer?.name} size={64} />
            </div>
            <h2>{form.name || farmer?.name || "Farmer"}</h2>
            <p className="muted" style={{ margin: 0 }}>{farmer?.phone}</p>
            <div className="preview-divider" />
            <div className="preview-row">
              <span>Location</span>
              <b>
                {form.village ? `${form.village}, ` : ""}
                {districts.find((item) => item.id === form.districtId)?.name || "Not set"}
                {form.talukId ? `, ${taluks.find((item) => item.id === form.talukId)?.name || ""}` : ""}
              </b>
            </div>
            <div className="preview-row">
              <span>Soil</span>
              <b>{form.soils.length ? form.soils.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ") : "Not set"}</b>
            </div>
            <div className="preview-row">
              <span>Farm size</span>
              <b>{form.landArea || 0} acres</b>
            </div>
            <div className="preview-row">
              <span>Water</span>
              <b style={{ textTransform: "capitalize" }}>{form.waterAvailability}</b>
            </div>
            <div className="preview-row">
              <span>Database</span>
              <b style={{ color: "var(--green)" }}>MongoDB</b>
            </div>
            <Notice kind="info">Your soil type and farm conditions are saved to your profile and persist across sign-ins.</Notice>
          </div>

          <button className="button button-primary button-full profile-save" disabled={saving}>
            {saving ? (language === "kn" ? "ಉಳಿಸಲಾಗುತ್ತಿದೆ…" : "Saving profile…") : (
              <>
                <Check size={16} /> {language === "kn" ? "ಕೃಷಿ ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ" : "Save farm profile"}
              </>
            )}
          </button>
        </aside>
      </form>
    </>
  );
}

// ==========================================
// MAIN ROUTER
// ==========================================
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/app/recommendations" element={<Protected><RecommendationsPage /></Protected>} />
      <Route path="/app/simulator" element={<Protected><SimulatorPage /></Protected>} />
      <Route path="/app/weather" element={<Protected><WeatherPage /></Protected>} />
      <Route path="/app/market" element={<Protected><MarketPage /></Protected>} />
      <Route path="/app/calendar" element={<Protected><CalendarPage /></Protected>} />
      <Route path="/app/protection" element={<Protected><ProtectionPage /></Protected>} />
      <Route path="/app/assistant" element={<Protected><AssistantPage /></Protected>} />
      <Route path="/app/plans" element={<Protected><PlansPage /></Protected>} />
      <Route path="/app/history" element={<Protected><HistoryPage /></Protected>} />
      <Route path="/app/profile" element={<Protected><ProfilePage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
