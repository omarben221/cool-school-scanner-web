import React, { useState, useRef, useEffect } from "react";
import QrScanner from "qr-scanner";

/* ============================================================
   Adresse du backend partagé (ecole-backend). En développement
   local, VITE_API_BASE peut être défini dans un fichier .env ;
   une fois hébergé (Railway), configure cette variable dans les
   réglages d'environnement de l'hébergeur.
   ============================================================ */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

const STATUS_META = {
  vert: { label: "Payé — à jour", color: "#2FA84F" },
  orange: { label: "Paiement à venir (avant le 5)", color: "#E0A02E" },
  rouge: { label: "Paiement en retard", color: "#E14343" },
  gris: { label: "Non inscrit dans cette matière", color: "#6B6B6B" },
  partiel: { label: "Paiement partiel — reste dû", color: "#3B82F6" },
  essai: { label: "Cours d'essai — gratuit", color: "#06B6D4" },
};

const FILIERES = {
  "BAC-ECO": "Bac Économie",
  "BAC-PC": "Bac PC",
  "BAC-SVT": "Bac SVT",
  "BAC-SM": "Bac SM",
  "1BAC-SM": "1ère Bac SM",
  "1BAC-ECO": "1ère Bac Éco",
  "1BAC-EXP": "1ère Bac Expérimentale",
  TC: "Tronc Commun",
  "3AC": "3ème Année Collège",
};

const MATIERES = {
  eco: "Économie Générale",
  compta: "Comptabilité",
  orga: "Organisation",
  math: "Math",
  pc: "Physique-Chimie",
  svt: "SVT",
  philo: "Philo",
  anglais: "Anglais",
  francais: "Français",
  arabe: "Arabe",
  islamique: "Éducation Islamique",
  histoiregeo: "Histoire-Géo",
};

// Matières réellement disponibles PAR FILIÈRE — pour ne montrer, lors du
// "2e scan", que les matières qui existent vraiment dans la filière choisie.
const MATIERES_PAR_FILIERE = {
  "BAC-ECO": ["eco", "compta", "orga", "math", "philo", "anglais"],
  "BAC-PC": ["math", "pc", "svt", "philo", "anglais"],
  "BAC-SVT": ["math", "pc", "svt", "philo", "anglais"],
  "BAC-SM": ["math", "pc", "svt", "philo", "anglais"],
  "1BAC-ECO": ["arabe", "islamique", "histoiregeo", "math", "francais", "compta"],
  "1BAC-SM": ["math", "pc", "francais", "histoiregeo", "islamique", "arabe"],
  "1BAC-EXP": ["francais", "math", "pc", "histoiregeo", "islamique", "arabe"],
  TC: ["math", "pc", "svt"],
  "3AC": ["math", "pc", "francais", "arabe"],
};
function getMatiereCodesForFiliere(filiereCode) {
  return MATIERES_PAR_FILIERE[filiereCode] || Object.keys(MATIERES);
}

const TOKEN_KEY = "cs_scanner_token";

function LoginScreen({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error("identifiants_invalides");
      const { token } = await res.json();
      localStorage.setItem(TOKEN_KEY, token);
      onLoggedIn(token);
    } catch (e2) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="root login-root">
      <img src="/logo.png" alt="Cool School" className="logo" />
      <h1 className="login-title">Connexion</h1>
      <p className="hint">Scanner Cool School</p>

      <form onSubmit={handleLogin} className="login-form">
        <input
          className="login-input"
          type="text"
          placeholder="Nom d'utilisateur"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
        />
        <input
          className="login-input"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="login-error">⚠ Nom d'utilisateur ou mot de passe incorrect.</p>}

        <button type="submit" className="btn" disabled={loading} style={{ marginTop: 24 }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

function ScanModeSelectScreen({ onSelectPremier, onSelectDeuxieme, onLogout }) {
  return (
    <div className="root">
      <img src="/logo.png" alt="Cool School" className="logo" />
      <h1 className="header">Scanner Paiement</h1>
      <button onClick={onLogout} className="small-btn" style={{ marginBottom: 20 }}>
        Déconnexion
      </button>

      <div className="center-box">
        <h2 className="title">Quel scan ?</h2>
        <p className="hint">
          Le 1er scan est un pointage simple. Le 2e scan précise la matière, pour bien tracer les
          présences par séance.
        </p>

        <button className="mode-card" onClick={onSelectPremier}>
          <span className="mode-card-title">1er scan</span>
          <span className="mode-card-hint">Pointage — ouvre la caméra directement</span>
        </button>

        <button className="mode-card" style={{ marginTop: 14 }} onClick={onSelectDeuxieme}>
          <span className="mode-card-title">2e scan</span>
          <span className="mode-card-hint">Précise la filière et la matière avant de scanner</span>
        </button>
      </div>
    </div>
  );
}

function FiliereSelectScreen({ onSelect, onBack }) {
  return (
    <div className="root">
      <img src="/logo.png" alt="Cool School" className="logo" />
      <h1 className="header">2e scan</h1>
      <button onClick={onBack} className="small-btn" style={{ marginBottom: 20 }}>
        ← Retour
      </button>

      <div className="scroll-list">
        <p className="hint" style={{ marginBottom: 16 }}>Choisis la filière</p>
        {Object.entries(FILIERES).map(([code, label]) => (
          <button key={code} className="choice-row" onClick={() => onSelect(code)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatiereSelectScreen({ filiereCode, filiereLabel, onSelect, onBack }) {
  const codesDisponibles = getMatiereCodesForFiliere(filiereCode);
  return (
    <div className="root">
      <img src="/logo.png" alt="Cool School" className="logo" />
      <h1 className="header">2e scan</h1>
      <button onClick={onBack} className="small-btn" style={{ marginBottom: 20 }}>
        ← Retour aux filières
      </button>

      <div className="scroll-list">
        <p className="hint" style={{ marginBottom: 16 }}>{filiereLabel} — choisis la matière</p>
        {Object.entries(MATIERES)
          .filter(([code]) => codesDisponibles.includes(code))
          .map(([code, label]) => (
            <button key={code} className="choice-row" onClick={() => onSelect(code)}>
              {label}
            </button>
          ))}
      </div>
    </div>
  );
}

function ScannerScreen({ authToken, onLogout, matiereChoisie, modeLabel, onChangeMode, onBackOneStep }) {
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const lockRef = useRef(false);

  const [cameraError, setCameraError] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { student } | { notFound: true } | { error: true }

  const handleScan = async (data) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setScanning(false);
    qrScannerRef.current?.stop();

    const match = /COOLSCHOOL-(\d+)/.exec(data);
    const id = match ? match[1] : null;

    if (!id) {
      setResult({ notFound: true });
      return;
    }

    setLoading(true);
    try {
      const url = matiereChoisie
        ? `${API_BASE}/students/${id}?matiere=${matiereChoisie}`
        : `${API_BASE}/students/${id}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.status === 403) {
        setResult({ accessDenied: true });
      } else if (res.status === 404) {
        setResult({ notFound: true });
      } else if (!res.ok) {
        setResult({ error: true });
      } else {
        const student = await res.json();
        setResult({ student });
      }
    } catch (e) {
      setResult({ error: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    setCameraError(false);

    const qrScanner = new QrScanner(
      videoRef.current,
      (res) => handleScan(res.data),
      {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    );
    qrScannerRef.current = qrScanner;

    qrScanner.start().catch(() => setCameraError(true));

    return () => {
      qrScanner.stop();
      qrScanner.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const rescan = () => {
    lockRef.current = false;
    setResult(null);
    setScanning(true);
  };

  const LIMIT_COLOR = "#7C3AED"; // violet — distinct des 4 statuts habituels
  const isPartiel = result?.student?.statut === "partiel" && !result.student.scanLimitReached;
  const statusColor = result?.student
    ? result.student.scanLimitReached
      ? LIMIT_COLOR
      : isPartiel
      ? "#2FA84F"
      : STATUS_META[result.student.statut]?.color
    : null;

  const rootStyle = statusColor && !isPartiel ? { backgroundColor: statusColor } : undefined;

  return (
    <div className="root" style={rootStyle}>
      {isPartiel && (
        <div className="partiel-split" aria-hidden="true">
          <div style={{ flex: 1, background: "#2FA84F" }} />
          <div style={{ flex: 1, background: "#E14343" }} />
        </div>
      )}
      <img src="/logo.png" alt="Cool School" className="logo" />
      <h1 className="header">Scanner Paiement</h1>
      <p className="mode-label">{modeLabel}</p>
      <div className="header-links-row">
        {onBackOneStep && (
          <button onClick={onBackOneStep} className="small-btn">← Retour</button>
        )}
        <button onClick={onChangeMode} className="small-btn">Changer de mode</button>
        <button onClick={onLogout} className="small-btn">Déconnexion</button>
      </div>

      {scanning && (
        <div className="camera-wrap">
          <video ref={videoRef} className="camera-video" muted playsInline />
          <div className="reticle" />
          {cameraError && (
            <div className="camera-error-overlay">
              <p className="hint" style={{ color: "#fff" }}>
                Impossible d'accéder à la caméra. Vérifie que tu as autorisé l'accès dans ton
                navigateur, et que tu es bien en HTTPS (ou sur localhost).
              </p>
            </div>
          )}
        </div>
      )}

      {!scanning && loading && (
        <div className="center-box">
          <div className="spinner" />
          <p className="hint">Vérification en cours…</p>
        </div>
      )}

      {!scanning && !loading && result?.notFound && (
        <div className="center-box">
          <h2 className="title">QR code non reconnu</h2>
          <p className="hint">Ce code ne correspond à aucun élève.</p>
          <button className="btn" onClick={rescan}>Scanner un autre code</button>
        </div>
      )}

      {!scanning && !loading && result?.accessDenied && (
        <div className="center-box">
          <h2 className="title">⛔ Ce compte n'a pas accès au scan</h2>
          <p className="hint">
            Déconnecte-toi et reconnecte-toi avec le compte dédié au scan.
          </p>
          <button className="btn" onClick={rescan}>Réessayer</button>
        </div>
      )}

      {!scanning && !loading && result?.error && (
        <div className="center-box">
          <h2 className="title">Connexion au serveur impossible</h2>
          <p className="hint">
            Vérifie que le backend tourne et que l'adresse {API_BASE} est correcte.
          </p>
          <button className="btn" onClick={rescan}>Réessayer</button>
        </div>
      )}

      {!scanning && !loading && result?.student && (
        <div className="result-scroll">
          <div className="photo-wrap">
            {result.student.photo ? (
              <img src={result.student.photo} alt={result.student.prenom} className="photo" />
            ) : (
              <span className="initials">
                {result.student.prenom?.[0]}
                {result.student.nom?.[0]}
              </span>
            )}
          </div>
          <p className="student-name">
            {result.student.prenom} {result.student.nom}
          </p>
          <p className="hint-on-color">
            {FILIERES[result.student.filiere] || result.student.filiere}
          </p>

          {result.student.scanLimitReached ? (
            <div className="limit-badge">
              <p className="limit-badge-text">
                {result.student.scanLimitRaison === "matiere_deja_scannee"
                  ? "⚠ Déjà scanné pour cette matière aujourd'hui"
                  : "⚠ Le pointage (1er scan) a déjà été fait aujourd'hui"}
              </p>
            </div>
          ) : (
            <div className="scan-type-badge">
              <p className="scan-type-badge-text">
                {result.student.scanType === "pointage" ? "Pointage (1er scan)" : "Deuxième passage"}
              </p>
            </div>
          )}

          {!result.student.scanLimitReached && (
            <div className="badge">
              <span style={{ color: statusColor, fontWeight: 700 }}>
                {STATUS_META[result.student.statut]?.label || "Statut inconnu"}
              </span>
            </div>
          )}

          {result.student.statut === "partiel" && result.student.reste > 0 && (
            <div className="reste-badge">
              <p className="reste-badge-text">Reste à payer : {result.student.reste} dh</p>
            </div>
          )}

          <div className="matieres-box">
            <p className="matieres-label">Inscrit en</p>
            {(result.student.matieresInscrites || []).length === 0 ? (
              <p className="matieres-empty">Aucune matière enregistrée</p>
            ) : (
              (result.student.matieresInscrites || []).map((code) => (
                <p key={code} className="matiere-item">
                  {MATIERES[code] || code}
                </p>
              ))
            )}
          </div>

          <button className="btn" onClick={rescan}>Scanner un autre élève</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [checkingToken, setCheckingToken] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const [scanConfig, setScanConfig] = useState(null); // null | {mode:'premier'} | {mode:'deuxieme', step, filiere, matiere}

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    setAuthToken(t);
    setCheckingToken(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setScanConfig(null);
  };

  if (checkingToken) {
    return <div className="root" />;
  }

  if (!authToken) {
    return <LoginScreen onLoggedIn={setAuthToken} />;
  }

  if (!scanConfig) {
    return (
      <ScanModeSelectScreen
        onSelectPremier={() => setScanConfig({ mode: "premier" })}
        onSelectDeuxieme={() => setScanConfig({ mode: "deuxieme", step: "filiere" })}
        onLogout={handleLogout}
      />
    );
  }

  if (scanConfig.mode === "deuxieme" && scanConfig.step === "filiere") {
    return (
      <FiliereSelectScreen
        onSelect={(filiere) => setScanConfig({ ...scanConfig, filiere, step: "matiere" })}
        onBack={() => setScanConfig(null)}
      />
    );
  }

  if (scanConfig.mode === "deuxieme" && scanConfig.step === "matiere") {
    return (
      <MatiereSelectScreen
        filiereCode={scanConfig.filiere}
        filiereLabel={FILIERES[scanConfig.filiere] || scanConfig.filiere}
        onSelect={(matiere) => setScanConfig({ ...scanConfig, matiere, step: "scan" })}
        onBack={() => setScanConfig({ ...scanConfig, step: "filiere" })}
      />
    );
  }

  return (
    <ScannerScreen
      authToken={authToken}
      onLogout={handleLogout}
      matiereChoisie={scanConfig.mode === "deuxieme" ? scanConfig.matiere : null}
      modeLabel={
        scanConfig.mode === "deuxieme"
          ? `2e scan · ${MATIERES[scanConfig.matiere] || scanConfig.matiere}`
          : "1er scan"
      }
      onChangeMode={() => setScanConfig(null)}
      onBackOneStep={
        scanConfig.mode === "deuxieme" ? () => setScanConfig({ ...scanConfig, step: "matiere" }) : null
      }
    />
  );
}
